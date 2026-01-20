import { useState, useEffect } from 'react';
import { X, Sparkles, ShoppingCart, Package, Receipt, BarChart3, Users, ArrowRight, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TourStep {
    icon: React.ElementType;
    title: string;
    description: string;
    color: string;
}

const tourSteps: TourStep[] = [
    {
        icon: ShoppingCart,
        title: 'POS / Kasir',
        description: 'Lakukan transaksi penjualan dengan cepat. Pilih produk, tambahkan ke keranjang, dan proses pembayaran dengan berbagai metode.',
        color: 'from-blue-500 to-blue-600'
    },
    {
        icon: Package,
        title: 'Inventory Management',
        description: 'Kelola stok bahan baku dan produk. Pantau ketersediaan, catat pembelian dari vendor, dan terima notifikasi stok rendah.',
        color: 'from-green-500 to-green-600'
    },
    {
        icon: Receipt,
        title: 'Transaksi & Pengeluaran',
        description: 'Lihat riwayat semua transaksi penjualan. Catat pengeluaran operasional seperti listrik, sewa, dan gaji karyawan.',
        color: 'from-purple-500 to-purple-600'
    },
    {
        icon: Users,
        title: 'HR & Payroll',
        description: 'Kelola data karyawan, absensi, dan penggajian. Generate slip gaji otomatis dan approve pembayaran dengan satu klik.',
        color: 'from-orange-500 to-orange-600'
    },
    {
        icon: BarChart3,
        title: 'Laporan Keuangan',
        description: 'Analisis performa bisnis dengan laporan komprehensif. Lihat penjualan, pengeluaran, profit, dan tren bisnis.',
        color: 'from-pink-500 to-pink-600'
    }
];

export default function WelcomeTour() {
    const [isVisible, setIsVisible] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [hasSeenTour, setHasSeenTour] = useState(false);

    useEffect(() => {
        // Check if user has seen the tour
        const tourSeen = localStorage.getItem('barberdoc_tour_completed');
        if (!tourSeen) {
            // Show tour after a short delay
            const timer = setTimeout(() => setIsVisible(true), 1000);
            return () => clearTimeout(timer);
        } else {
            setHasSeenTour(true);
        }
    }, []);

    const handleNext = () => {
        if (currentStep < tourSteps.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            handleComplete();
        }
    };

    const handleComplete = () => {
        localStorage.setItem('barberdoc_tour_completed', 'true');
        setIsVisible(false);
        setHasSeenTour(true);
    };

    const handleSkip = () => {
        handleComplete();
    };

    const handleRestart = () => {
        setCurrentStep(0);
        setIsVisible(true);
    };

    if (!isVisible) {
        // Show small button to restart tour
        if (hasSeenTour) {
            return (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRestart}
                    className="fixed bottom-20 right-6 z-40 bg-white/90 backdrop-blur shadow-lg gap-2"
                >
                    <Sparkles className="h-4 w-4" />
                    Tour Fitur
                </Button>
            );
        }
        return null;
    }

    const step = tourSteps[currentStep];
    const Icon = step.icon;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Close Button */}
                <button
                    onClick={handleSkip}
                    className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors z-10"
                >
                    <X className="h-5 w-5 text-gray-500" />
                </button>

                {/* Header with gradient */}
                <div className={cn("p-6 pb-12 bg-gradient-to-br text-white", step.color)}>
                    <div className="flex items-center gap-2 mb-4">
                        <Sparkles className="h-5 w-5" />
                        <span className="text-sm font-medium opacity-90">
                            Selamat Datang di Veroprise ERP!
                        </span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                            <Icon className="h-8 w-8" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold">{step.title}</h3>
                            <p className="text-sm opacity-90">Fitur {currentStep + 1} dari {tourSteps.length}</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 pt-8 -mt-6 bg-white rounded-t-3xl relative">
                    <p className="text-gray-600 leading-relaxed mb-6">
                        {step.description}
                    </p>

                    {/* Progress Dots */}
                    <div className="flex justify-center gap-2 mb-6">
                        {tourSteps.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => setCurrentStep(index)}
                                className={cn(
                                    "w-2 h-2 rounded-full transition-all",
                                    index === currentStep
                                        ? "w-6 bg-primary"
                                        : index < currentStep
                                            ? "bg-primary/50"
                                            : "bg-gray-200"
                                )}
                            />
                        ))}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            className="flex-1"
                            onClick={handleSkip}
                        >
                            Lewati
                        </Button>
                        <Button
                            className="flex-1 gap-2"
                            onClick={handleNext}
                        >
                            {currentStep < tourSteps.length - 1 ? (
                                <>
                                    Lanjut <ArrowRight className="h-4 w-4" />
                                </>
                            ) : (
                                <>
                                    Mulai <CheckCircle className="h-4 w-4" />
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
