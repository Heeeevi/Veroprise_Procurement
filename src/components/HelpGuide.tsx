import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { HelpCircle, X, ChevronRight, Lightbulb, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface HelpContent {
    title: string;
    description: string;
    steps: { title: string; desc: string }[];
    tips?: string[];
}

const helpContentMap: Record<string, HelpContent> = {
    '/dashboard': {
        title: '🏠 Dashboard',
        description: 'Halaman utama yang menampilkan ringkasan bisnis Anda hari ini.',
        steps: [
            { title: 'Lihat Ringkasan', desc: 'Cek total penjualan, jumlah transaksi, dan profit hari ini' },
            { title: 'Pilih Outlet', desc: 'Jika punya beberapa cabang, pilih outlet di dropdown atas' },
            { title: 'Akses Modul', desc: 'Klik menu di sidebar kiri untuk masuk ke fitur lain' }
        ],
        tips: ['Dashboard akan update otomatis setiap ada transaksi baru']
    },
    '/pos': {
        title: '🛒 POS / Kasir',
        description: 'Point of Sale - tempat Anda melakukan transaksi penjualan.',
        steps: [
            { title: 'Pilih Produk', desc: 'Klik produk yang ingin dijual, otomatis masuk ke keranjang' },
            { title: 'Atur Jumlah', desc: 'Ubah jumlah item di keranjang jika diperlukan' },
            { title: 'Pilih Pembayaran', desc: 'Cash, QRIS, Transfer, atau Kartu' },
            { title: 'Selesaikan', desc: 'Klik "Bayar" dan transaksi tercatat otomatis' }
        ],
        tips: ['Pastikan sudah "Mulai Shift" sebelum melakukan transaksi', 'Struk bisa dicetak setelah transaksi selesai']
    },
    '/warehouse': {
        title: '🏭 Gudang',
        description: 'Pusat operasional stok, material request, dan distribusi antar unit.',
        steps: [
            { title: 'Pilih Gudang', desc: 'Pilih warehouse aktif untuk melihat data yang sesuai' },
            { title: 'Kelola Arus Barang', desc: 'Gunakan tab untuk penerimaan supplier, request material, dan stock opname' },
            { title: 'Pantau Alert', desc: 'Cek notifikasi stok rendah agar restock tidak terlambat' },
            { title: 'Lanjut ke Procurement', desc: 'Akses Vendor dan Purchase Orders dari modul Gudang' }
        ],
        tips: ['Gunakan Material Request untuk suplai ke unit produksi/peracikan', 'Pastikan proses stock opname rutin untuk akurasi data']
    },
    '/warehouse/inventory': {
        title: '📦 Inventory',
        description: 'Kelola stok bahan baku dan barang dagangan Anda.',
        steps: [
            { title: 'Lihat Stok', desc: 'Cek jumlah stok semua item dan alert yang hampir habis' },
            { title: 'Tambah Item', desc: 'Klik "Tambah Item" untuk input barang baru' },
            { title: 'Adjust Stok', desc: 'Gunakan tombol +/- untuk menyesuaikan stok manual' },
            { title: 'Beli Barang', desc: 'Klik "Purchase Orders" untuk pesan ke supplier' }
        ],
        tips: ['Atur "Min Stock" agar dapat notifikasi saat stok menipis', 'Gunakan fitur "Batches" untuk tracking expiry date']
    },
    '/warehouse/purchase-orders': {
        title: '🧾 Purchase Orders',
        description: 'Catat pembelian barang dari supplier/vendor.',
        steps: [
            { title: 'Buat PO', desc: 'Klik "Buat Pesanan Baru" dan pilih vendor' },
            { title: 'Tambah Item', desc: 'Di halaman detail PO, tambahkan item yang dibeli' },
            { title: 'Kirim Order', desc: 'Ubah status ke "Ordered" saat order dikirim ke vendor' },
            { title: 'Terima Barang', desc: 'Klik "Terima Barang" saat barang tiba, stok otomatis bertambah' }
        ],
        tips: ['PO yang sudah "Received" otomatis tercatat sebagai Pengeluaran di Laporan', 'Gunakan "Sync Expenses" jika ada PO lama yang belum tercatat']
    },
    '/warehouse/vendors': {
        title: '🏪 Vendor / Supplier',
        description: 'Database supplier dan rekomendasi partner dari Veroprise.',
        steps: [
            { title: 'Lihat Rekomendasi', desc: 'Cek "Rekomendasi Partner Veroprise" untuk supplier terpercaya' },
            { title: 'Hubungi Partner', desc: 'Klik WhatsApp atau Website untuk kontak langsung' },
            { title: 'Tambah Vendor', desc: 'Input nama, kontak, dan alamat supplier baru Anda sendiri' },
            { title: 'Kelola Data', desc: 'Edit informasi vendor yang sudah ada' }
        ],
        tips: ['Partner Veroprise sudah diverifikasi dan cocok untuk bisnis', 'Vendor harus ditambahkan dulu sebelum bisa buat Purchase Order']
    },
    '/hr': {
        title: '👥 HR & Payroll',
        description: 'Kelola data karyawan, absensi, dan penggajian.',
        steps: [
            { title: 'Tambah Karyawan', desc: 'Input data karyawan (nama, jabatan, gaji pokok)' },
            { title: 'Catat Absensi', desc: 'Tab "Absensi" untuk log kehadiran harian' },
            { title: 'Generate Payroll', desc: 'Tab "Payroll" untuk hitung gaji bulanan otomatis' },
            { title: 'Bayar Gaji', desc: 'Klik "Approve & Pay" saat gaji sudah dibayarkan' }
        ],
        tips: ['Karyawan tidak perlu punya akun login, cukup data di sini', 'Payroll dihitung berdasarkan gaji pokok di profil karyawan']
    },
    '/transactions': {
        title: '📋 Transaksi',
        description: 'Riwayat semua transaksi penjualan dari POS.',
        steps: [
            { title: 'Filter Periode', desc: 'Pilih rentang waktu (hari ini, minggu, bulan, semua)' },
            { title: 'Cari Transaksi', desc: 'Ketik nomor transaksi atau nama kasir' },
            { title: 'Lihat Detail', desc: 'Klik baris untuk melihat detail item yang dibeli' }
        ],
        tips: ['Data ini berbeda dengan Pembelian (Purchase Order)', 'Total di atas adalah total penjualan pada periode yang dipilih']
    },
    '/reports': {
        title: '📊 Laporan Keuangan',
        description: 'Ringkasan keuangan bisnis Anda.',
        steps: [
            { title: 'Pilih Periode', desc: 'Minggu ini, bulan ini, atau tahun ini' },
            { title: 'Baca Metrik', desc: 'Total Penjualan = pemasukan dari POS' },
            { title: 'Lihat Pengeluaran', desc: 'Termasuk pembelian barang (dari PO)' },
            { title: 'Cek Profit', desc: 'Gross = Penjualan - HPP, Net = Gross - Pengeluaran' }
        ],
        tips: ['Jika pengeluaran 0 padahal ada PO, klik "Sync Expenses" di halaman Purchase Orders', 'Produk Terlaris dan Metode Pembayaran bisa jadi insight untuk strategi bisnis']
    },
    '/users': {
        title: '🔐 Pengguna',
        description: 'Kelola akun pengguna dan hak akses.',
        steps: [
            { title: 'Lihat User', desc: 'Daftar semua pengguna yang punya akses sistem' },
            { title: 'Atur Role', desc: 'Owner, Manager, Staff, atau Investor' },
            { title: 'Assign Outlet', desc: 'Tentukan user bisa akses outlet mana' }
        ],
        tips: ['Owner = akses penuh', 'Manager = kelola operasional', 'Staff = kasir saja', 'Investor = lihat laporan saja']
    }
};

export default function HelpGuide() {
    const [isOpen, setIsOpen] = useState(false);
    const location = useLocation();

    // Get help content for current page
    const pathKey = Object.keys(helpContentMap)
        .sort((a, b) => b.length - a.length)
        .find(key => location.pathname.startsWith(key)) || '/dashboard';
    const content = helpContentMap[pathKey] || helpContentMap['/dashboard'];

    return (
        <>
            {/* Floating Help Button */}
            <Button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white"
                size="icon"
            >
                <HelpCircle className="h-7 w-7" />
            </Button>

            {/* Help Dialog */}
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            <BookOpen className="h-5 w-5 text-indigo-500" />
                            Panduan Halaman Ini
                        </DialogTitle>
                    </DialogHeader>

                    <ScrollArea className="max-h-[70vh] pr-4">
                        <div className="space-y-6">
                            {/* Title & Description */}
                            <div>
                                <h3 className="text-lg font-bold">{content.title}</h3>
                                <p className="text-muted-foreground mt-1">{content.description}</p>
                            </div>

                            {/* Steps */}
                            <div className="space-y-3">
                                <h4 className="font-semibold flex items-center gap-2">
                                    <ChevronRight className="h-4 w-4 text-green-500" />
                                    Langkah-Langkah
                                </h4>
                                <div className="space-y-2 ml-2">
                                    {content.steps.map((step, idx) => (
                                        <div key={idx} className="flex gap-3 p-3 bg-muted/50 rounded-lg">
                                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-bold">
                                                {idx + 1}
                                            </span>
                                            <div>
                                                <p className="font-medium">{step.title}</p>
                                                <p className="text-sm text-muted-foreground">{step.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Tips */}
                            {content.tips && content.tips.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="font-semibold flex items-center gap-2">
                                        <Lightbulb className="h-4 w-4 text-yellow-500" />
                                        Tips
                                    </h4>
                                    <ul className="ml-6 space-y-1">
                                        {content.tips.map((tip, idx) => (
                                            <li key={idx} className="text-sm text-muted-foreground list-disc">
                                                {tip}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Contact */}
                            <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 rounded-lg">
                                <p className="text-sm text-center text-muted-foreground">
                                    Butuh bantuan lebih? Hubungi tim support kami.
                                </p>
                            </div>
                        </div>
                    </ScrollArea>
                </DialogContent>
            </Dialog>
        </>
    );
}
