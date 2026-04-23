import { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import {
  Upload, Download, FileSpreadsheet, CheckCircle2, XCircle, AlertTriangle,
  Trash2, ChevronRight, ChevronLeft, Loader2, FileUp, Eye, Sparkles
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

export interface BulkColumnDef {
  key: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'date';
  required: boolean;
  description?: string;
  defaultValue?: any;
  options?: string[];
  width?: number;
}

export interface BulkImportConfig {
  entityName: string;
  columns: BulkColumnDef[];
  onImport: (rows: Record<string, any>[]) => Promise<{ success: number; failed: number; errors?: string[] }>;
  templateFileName?: string;
}

interface ParsedRow {
  _rowIndex: number;
  _errors: string[];
  _isValid: boolean;
  [key: string]: any;
}

type Step = 'upload' | 'preview' | 'result';

// ── Component ────────────────────────────────────────────────────────────────

export default function BulkImportDialog({
  open,
  onOpenChange,
  config,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: BulkImportConfig;
}) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('upload');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState('');
  const [result, setResult] = useState<{ success: number; failed: number; errors?: string[] } | null>(null);

  // ── Reset ──
  const resetState = useCallback(() => {
    setStep('upload');
    setParsedRows([]);
    setImporting(false);
    setProgress(0);
    setDragOver(false);
    setFileName('');
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleClose = useCallback((open: boolean) => {
    if (!open) resetState();
    onOpenChange(open);
  }, [onOpenChange, resetState]);

  // ── Validate single row ──
  const validateRow = useCallback((row: Record<string, any>, rowIndex: number): ParsedRow => {
    const errors: string[] = [];

    for (const col of config.columns) {
      const value = row[col.key];
      const isEmpty = value === undefined || value === null || String(value).trim() === '';

      if (col.required && isEmpty) {
        errors.push(`"${col.label}" wajib diisi`);
        continue;
      }

      if (!isEmpty) {
        if (col.type === 'number' && isNaN(Number(value))) {
          errors.push(`"${col.label}" harus berupa angka`);
        }
        if (col.type === 'date') {
          const d = new Date(value);
          if (isNaN(d.getTime())) {
            errors.push(`"${col.label}" format tanggal tidak valid`);
          }
        }
        if (col.options && col.options.length > 0) {
          const strVal = String(value).toLowerCase();
          if (!col.options.some(o => o.toLowerCase() === strVal)) {
            errors.push(`"${col.label}" harus salah satu: ${col.options.join(', ')}`);
          }
        }
      }
    }

    return {
      ...row,
      _rowIndex: rowIndex,
      _errors: errors,
      _isValid: errors.length === 0,
    };
  }, [config.columns]);

  // ── Parse file ──
  const parseFile = useCallback(async (file: File) => {
    setFileName(file.name);
    setProgress(10);

    try {
      const data = await file.arrayBuffer();
      setProgress(40);

      const workbook = XLSX.read(data, { type: 'array', cellDates: true });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { defval: '' }) as Record<string, any>[];
      setProgress(70);

      if (jsonData.length === 0) {
        toast({ title: 'File kosong', description: 'File yang diupload tidak memiliki data', variant: 'destructive' });
        setProgress(0);
        setFileName('');
        return;
      }

      // Map Excel columns to our column definitions (fuzzy match by label/key)
      const headerMap = buildHeaderMap(jsonData[0], config.columns);

      const mapped = jsonData.map((row, idx) => {
        const mappedRow: Record<string, any> = {};
        for (const col of config.columns) {
          const excelKey = headerMap[col.key];
          if (excelKey && row[excelKey] !== undefined) {
            mappedRow[col.key] = coerceValue(row[excelKey], col);
          } else {
            mappedRow[col.key] = col.defaultValue ?? '';
          }
        }
        return validateRow(mappedRow, idx + 1);
      });

      setProgress(100);
      setParsedRows(mapped);

      // Brief delay so progress shows 100 before switching
      setTimeout(() => {
        setStep('preview');
        setProgress(0);
      }, 300);
    } catch (error: any) {
      console.error('Parse error:', error);
      toast({ title: 'Error parsing file', description: error.message || 'Format file tidak didukung', variant: 'destructive' });
      setProgress(0);
      setFileName('');
    }
  }, [config.columns, toast, validateRow]);

  // ── File handlers ──
  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  }, [parseFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
  }, [parseFile]);

  // ── Generate template ──
  const handleDownloadTemplate = useCallback(() => {
    const headers: Record<string, string> = {};
    const exampleRow: Record<string, any> = {};
    const descriptions: Record<string, string> = {};

    for (const col of config.columns) {
      headers[col.label] = col.label;
      descriptions[col.label] = col.description || (col.required ? '(WAJIB)' : '(opsional)');

      // Example values
      if (col.type === 'number') exampleRow[col.label] = 0;
      else if (col.type === 'boolean') exampleRow[col.label] = 'Ya';
      else if (col.type === 'date') exampleRow[col.label] = new Date().toISOString().split('T')[0];
      else if (col.options?.length) exampleRow[col.label] = col.options[0];
      else exampleRow[col.label] = '';
    }

    const ws = XLSX.utils.json_to_sheet([descriptions, exampleRow]);

    // Set column widths
    const colWidths = config.columns.map(col => ({
      wch: Math.max(col.label.length + 4, col.width || 15),
    }));
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, config.entityName);

    const fName = config.templateFileName || `template_${config.entityName.toLowerCase().replace(/\s+/g, '_')}.xlsx`;
    XLSX.writeFile(wb, fName);

    toast({ title: 'Template diunduh', description: `File "${fName}" berhasil didownload` });
  }, [config, toast]);

  // ── Delete row ──
  const handleDeleteRow = useCallback((idx: number) => {
    setParsedRows(prev => prev.filter((_, i) => i !== idx));
  }, []);

  // ── Edit cell inline ──
  const handleCellEdit = useCallback((rowIdx: number, colKey: string, value: any) => {
    setParsedRows(prev => {
      const updated = [...prev];
      const row = { ...updated[rowIdx] };
      row[colKey] = value;
      // Re-validate
      const col = config.columns.find(c => c.key === colKey);
      if (col) {
        const validated = validateRow(row, row._rowIndex);
        updated[rowIdx] = validated;
      } else {
        updated[rowIdx] = row;
      }
      return updated;
    });
  }, [config.columns, validateRow]);

  // ── Import ──
  const handleImport = useCallback(async () => {
    const validRows = parsedRows.filter(r => r._isValid);
    if (validRows.length === 0) {
      toast({ title: 'Tidak ada data valid', description: 'Semua baris memiliki error. Perbaiki terlebih dahulu.', variant: 'destructive' });
      return;
    }

    setImporting(true);
    setProgress(0);

    try {
      // Clean internal fields before sending
      const cleanRows = validRows.map(({ _rowIndex, _errors, _isValid, ...rest }) => rest);
      setProgress(30);

      const importResult = await config.onImport(cleanRows);
      setProgress(100);

      setResult(importResult);

      setTimeout(() => {
        setStep('result');
        setImporting(false);
        setProgress(0);
      }, 300);
    } catch (error: any) {
      console.error('Import error:', error);
      toast({ title: 'Error saat import', description: error.message, variant: 'destructive' });
      setImporting(false);
      setProgress(0);
    }
  }, [parsedRows, config, toast]);

  // ── Derived ──
  const validCount = parsedRows.filter(r => r._isValid).length;
  const errorCount = parsedRows.filter(r => !r._isValid).length;
  const totalCount = parsedRows.length;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Bulk Import {config.entityName}
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 py-2 px-1">
          <StepIndicator step="upload" label="Upload" currentStep={step} icon={<Upload className="h-3.5 w-3.5" />} />
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <StepIndicator step="preview" label="Preview" currentStep={step} icon={<Eye className="h-3.5 w-3.5" />} />
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <StepIndicator step="result" label="Hasil" currentStep={step} icon={<CheckCircle2 className="h-3.5 w-3.5" />} />
        </div>

        {/* Progress bar */}
        {progress > 0 && (
          <div className="px-1">
            <Progress value={progress} className="h-1.5" />
          </div>
        )}

        {/* ─── Step: Upload ─── */}
        {step === 'upload' && (
          <div className="flex-1 flex flex-col gap-4 py-4">
            {/* Drag & drop zone */}
            <div
              className={`relative border-2 border-dashed rounded-xl p-10 text-center transition-all duration-300 cursor-pointer
                ${dragOver
                  ? 'border-primary bg-primary/5 scale-[1.01]'
                  : 'border-border hover:border-primary/50 hover:bg-muted/30'
                }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
              />
              <div className="flex flex-col items-center gap-3">
                <div className={`p-4 rounded-full transition-colors duration-300 ${dragOver ? 'bg-primary/10' : 'bg-muted'}`}>
                  <FileUp className={`h-8 w-8 transition-colors duration-300 ${dragOver ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                <div>
                  <p className="font-medium text-base">
                    {dragOver ? 'Lepaskan file di sini...' : 'Drag & drop file atau klik untuk pilih'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Format: .xlsx, .xls, .csv
                  </p>
                </div>
                {fileName && (
                  <Badge variant="secondary" className="mt-2 flex items-center gap-1.5">
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    {fileName}
                  </Badge>
                )}
              </div>
            </div>

            {/* Template download */}
            <div className="bg-muted/40 border border-border rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Butuh template?</p>
                  <p className="text-xs text-muted-foreground">Download template XLSX dengan format kolom yang benar</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="shrink-0">
                <Download className="h-4 w-4 mr-1.5" />
                Download Template
              </Button>
            </div>

            {/* Column info */}
            <div className="bg-muted/20 rounded-lg p-4">
              <p className="text-sm font-medium mb-2">Kolom yang diharapkan:</p>
              <div className="flex flex-wrap gap-2">
                {config.columns.map(col => (
                  <Badge key={col.key} variant={col.required ? 'default' : 'outline'} className="text-xs">
                    {col.label} {col.required && '*'}
                    {col.type === 'number' && ' (angka)'}
                    {col.type === 'date' && ' (tanggal)'}
                    {col.type === 'boolean' && ' (Ya/Tidak)'}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── Step: Preview ─── */}
        {step === 'preview' && (
          <div className="flex-1 flex flex-col gap-3 min-h-0 py-2">
            {/* Summary bar */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <FileSpreadsheet className="h-3 w-3" />
                  {totalCount} baris
                </Badge>
                <Badge variant="default" className="flex items-center gap-1 bg-green-600">
                  <CheckCircle2 className="h-3 w-3" />
                  {validCount} valid
                </Badge>
                {errorCount > 0 && (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <XCircle className="h-3 w-3" />
                    {errorCount} error
                  </Badge>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                <Download className="h-3.5 w-3.5 mr-1" />
                Template
              </Button>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto rounded-lg border" style={{ maxHeight: '50vh' }}>
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="w-10 text-center">#</TableHead>
                    <TableHead className="w-16 text-center">Status</TableHead>
                    {config.columns.map(col => (
                      <TableHead key={col.key} className="min-w-[120px]">
                        {col.label}
                        {col.required && <span className="text-destructive ml-0.5">*</span>}
                      </TableHead>
                    ))}
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={config.columns.length + 3} className="text-center py-8 text-muted-foreground">
                        Semua baris telah dihapus
                      </TableCell>
                    </TableRow>
                  ) : (
                    parsedRows.map((row, idx) => (
                      <TableRow
                        key={idx}
                        className={`transition-colors ${row._isValid
                          ? 'hover:bg-muted/50'
                          : 'bg-destructive/5 hover:bg-destructive/10'
                        }`}
                      >
                        <TableCell className="text-center text-xs text-muted-foreground">{row._rowIndex}</TableCell>
                        <TableCell className="text-center">
                          {row._isValid ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
                          ) : (
                            <div className="flex justify-center" title={row._errors.join('\n')}>
                              <XCircle className="h-4 w-4 text-destructive mx-auto" />
                            </div>
                          )}
                        </TableCell>
                        {config.columns.map(col => {
                          const hasError = row._errors.some(e => e.includes(col.label));
                          return (
                            <TableCell key={col.key} className="p-1">
                              <Input
                                value={row[col.key] ?? ''}
                                onChange={(e) => handleCellEdit(idx, col.key, e.target.value)}
                                className={`h-8 text-sm ${hasError ? 'border-destructive bg-destructive/5' : 'border-transparent hover:border-border'}`}
                                placeholder={col.description || ''}
                              />
                            </TableCell>
                          );
                        })}
                        <TableCell className="p-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteRow(idx)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Error summary */}
            {errorCount > 0 && (
              <div className="bg-destructive/5 border border-destructive/30 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-destructive">{errorCount} baris memiliki error</p>
                  <p className="text-muted-foreground text-xs mt-0.5">
                    Baris dengan error akan dilewati. Anda bisa memperbaiki data di tabel di atas, atau lanjutkan import hanya data yang valid.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── Step: Result ─── */}
        {step === 'result' && result && (
          <div className="flex-1 flex flex-col items-center justify-center py-8 gap-6">
            <div className={`p-5 rounded-full ${result.success > 0 ? 'bg-green-100' : 'bg-destructive/10'}`}>
              {result.success > 0 ? (
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              ) : (
                <XCircle className="h-12 w-12 text-destructive" />
              )}
            </div>

            <div className="text-center">
              <h3 className="text-xl font-display font-semibold">
                {result.success > 0 ? 'Import Berhasil!' : 'Import Gagal'}
              </h3>
              <p className="text-muted-foreground mt-1">
                {result.success > 0
                  ? `${result.success} ${config.entityName.toLowerCase()} berhasil ditambahkan`
                  : 'Tidak ada data yang berhasil diimport'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-green-700">{result.success}</p>
                <p className="text-xs text-green-600 mt-1">Berhasil</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-red-700">{result.failed}</p>
                <p className="text-xs text-red-600 mt-1">Gagal</p>
              </div>
            </div>

            {result.errors && result.errors.length > 0 && (
              <div className="w-full max-w-md bg-destructive/5 border border-destructive/30 rounded-lg p-3">
                <p className="text-sm font-medium text-destructive mb-2">Detail Error:</p>
                <ul className="text-xs text-muted-foreground space-y-1 max-h-32 overflow-y-auto">
                  {result.errors.map((err, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <XCircle className="h-3 w-3 text-destructive shrink-0 mt-0.5" />
                      {err}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* ─── Footer ─── */}
        <DialogFooter className="flex-shrink-0 sm:justify-between">
          <div className="flex gap-2">
            {step !== 'upload' && step !== 'result' && (
              <Button variant="outline" onClick={() => { setStep('upload'); setParsedRows([]); setFileName(''); }}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Kembali
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => handleClose(false)}>
              {step === 'result' ? 'Tutup' : 'Batal'}
            </Button>
            {step === 'preview' && (
              <Button
                onClick={handleImport}
                disabled={importing || validCount === 0}
                className="min-w-[140px]"
              >
                {importing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Mengimport...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import {validCount} Data
                  </>
                )}
              </Button>
            )}
            {step === 'result' && result && result.success > 0 && (
              <Button onClick={() => handleClose(false)}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Selesai
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function StepIndicator({
  step,
  label,
  currentStep,
  icon,
}: {
  step: Step;
  label: string;
  currentStep: Step;
  icon: React.ReactNode;
}) {
  const steps: Step[] = ['upload', 'preview', 'result'];
  const currentIdx = steps.indexOf(currentStep);
  const stepIdx = steps.indexOf(step);
  const isActive = step === currentStep;
  const isCompleted = stepIdx < currentIdx;

  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all
      ${isActive ? 'bg-primary text-primary-foreground' : ''}
      ${isCompleted ? 'bg-primary/10 text-primary' : ''}
      ${!isActive && !isCompleted ? 'text-muted-foreground' : ''}
    `}>
      {isCompleted ? <CheckCircle2 className="h-3.5 w-3.5" /> : icon}
      {label}
    </div>
  );
}

function buildHeaderMap(
  sampleRow: Record<string, any>,
  columns: BulkColumnDef[],
): Record<string, string> {
  const excelHeaders = Object.keys(sampleRow);
  const map: Record<string, string> = {};

  for (const col of columns) {
    // Exact match by label (case-insensitive)
    let match = excelHeaders.find(h => h.toLowerCase() === col.label.toLowerCase());
    if (!match) {
      // Exact match by key
      match = excelHeaders.find(h => h.toLowerCase() === col.key.toLowerCase());
    }
    if (!match) {
      // Loose fuzzy: header contains label or label contains header
      match = excelHeaders.find(h => {
        const hLow = h.toLowerCase().replace(/[^a-z0-9]/g, '');
        const labelLow = col.label.toLowerCase().replace(/[^a-z0-9]/g, '');
        const keyLow = col.key.toLowerCase().replace(/[^a-z0-9]/g, '');
        return hLow.includes(labelLow) || labelLow.includes(hLow) ||
               hLow.includes(keyLow) || keyLow.includes(hLow);
      });
    }
    if (match) {
      map[col.key] = match;
    }
  }

  return map;
}

function coerceValue(value: any, col: BulkColumnDef): any {
  if (value === null || value === undefined) return col.defaultValue ?? '';

  if (col.type === 'number') {
    const num = Number(value);
    return isNaN(num) ? value : num;
  }
  if (col.type === 'boolean') {
    const str = String(value).toLowerCase().trim();
    if (['true', 'ya', 'yes', '1', 'aktif', 'active'].includes(str)) return 'Ya';
    if (['false', 'tidak', 'no', '0', 'nonaktif', 'inactive'].includes(str)) return 'Tidak';
    return value;
  }
  if (col.type === 'date') {
    if (value instanceof Date) return value.toISOString().split('T')[0];
    return String(value);
  }
  return String(value);
}
