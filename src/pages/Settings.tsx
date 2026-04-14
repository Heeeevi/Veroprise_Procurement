import { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Lock, User, Mail, Shield, Download, Database } from 'lucide-react';

export default function Settings() {
  const { user, profile, role } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: 'Error',
        description: 'Password baru dan konfirmasi tidak cocok',
        variant: 'destructive',
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: 'Error',
        description: 'Password minimal 6 karakter',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (error) throw error;

      toast({
        title: 'Berhasil!',
        description: 'Password berhasil diubah',
      });

      // Reset form
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast({
        title: 'Error',
        description: error.message || 'Gagal mengubah password',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBackupData = async () => {
    setBackupLoading(true);
    try {
      const tables = [
        'attendances', 'bookings', 'categories', 'daily_closings', 'employee_bonuses', 
        'employees', 'expenses', 'outlets', 'pos_shifts', 'products', 'profiles',
        'purchase_orders', 'sales_targets', 'shifts', 'stock_opnames', 'stock_transfers', 
        'suppliers', 'transactions', 'transaction_items', 'user_outlets', 'warehouses'
      ];
      
      const backupData: Record<string, any> = {};
      
      for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*');
        if (!error) {
          backupData[table] = data;
        } else {
          console.warn(`Error fetching ${table}:`, error);
        }
      }
      
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_erp_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: 'Berhasil',
        description: 'Data berhasil dibackup ke format JSON',
      });
    } catch (error) {
      console.error('Error backup data:', error);
      toast({
        title: 'Gagal',
        description: 'Terjadi kesalahan saat backup data',
        variant: 'destructive',
      });
    } finally {
      setBackupLoading(false);
    }
  };

  const getRoleBadge = () => {
    const roleColors: Record<string, string> = {
      owner: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
      manager: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
      staff: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
      investor: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
    };

    const roleLabels: Record<string, string> = {
      owner: 'Owner',
      manager: 'Manager',
      staff: 'Staff',
      investor: 'Investor',
    };

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${roleColors[role || ''] || 'bg-gray-100 text-gray-700'}`}>
        {roleLabels[role || ''] || 'No Role'}
      </span>
    );
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-display font-bold">Pengaturan Akun</h1>
          <p className="text-muted-foreground">Kelola profil dan keamanan akun Anda</p>
        </div>

        {/* Profile Info Card */}
        <Card className="card-warm">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <User className="h-5 w-5" />
              Informasi Profil
            </CardTitle>
            <CardDescription>Informasi akun Anda saat ini</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Nama Lengkap
                </Label>
                <p className="text-base font-medium">{profile?.full_name || '-'}</p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
                <p className="text-base font-medium">{user?.email || '-'}</p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Role
                </Label>
                <div>{getRoleBadge()}</div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">User ID</Label>
                <p className="text-xs font-mono text-muted-foreground">{user?.id}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Change Password Card */}
        <Card className="card-warm">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Ubah Password
            </CardTitle>
            <CardDescription>Pastikan password Anda kuat dan aman</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Password Saat Ini (Opsional)</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  placeholder="Masukkan password saat ini"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  * Supabase tidak memerlukan password lama untuk update password
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">Password Baru *</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Masukkan password baru (min. 6 karakter)"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  required
                  minLength={6}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Konfirmasi Password Baru *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Ketik ulang password baru"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  required
                  minLength={6}
                  disabled={loading}
                />
              </div>

              {/* Password Requirements */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium">Persyaratan Password:</p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li className={passwordData.newPassword.length >= 6 ? 'text-green-600' : ''}>
                    Minimal 6 karakter
                  </li>
                  <li className={passwordData.newPassword === passwordData.confirmPassword && passwordData.newPassword ? 'text-green-600' : ''}>
                    Password dan konfirmasi harus sama
                  </li>
                </ul>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })}
                  disabled={loading}
                >
                  Reset
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Mengubah...' : 'Ubah Password'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Database Management Card */}
        {role === 'owner' && (
          <Card className="card-warm border-blue-200">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <Database className="h-5 w-5" />
                Manajemen Data
              </CardTitle>
              <CardDescription>Menu khusus Owner untuk melakukan backup seluruh data ke format JSON</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Proses backup ini akan mengunduh semua data dari semua tabel di database Anda (termasuk Absensi, Pembelian, Inventory, dll) menjadi sebuah file JSON.
                </p>
                <Button 
                  onClick={handleBackupData} 
                  disabled={backupLoading}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Download className="mr-2 h-4 w-4" />
                  {backupLoading ? 'Memproses Backup...' : 'Backup Semua Data (JSON)'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Security Info */}
        <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-900">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Tips Keamanan
                </p>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• Gunakan password yang unik dan tidak digunakan di aplikasi lain</li>
                  <li>• Jangan bagikan password Anda kepada siapapun</li>
                  <li>• Ubah password secara berkala untuk keamanan maksimal</li>
                  <li>• Gunakan kombinasi huruf besar, kecil, angka, dan simbol</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
