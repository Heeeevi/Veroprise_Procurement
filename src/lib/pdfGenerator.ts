import jsPDF from 'jspdf';

interface ReportData {
    outletName: string;
    periodLabel: string;
    startDate: string;
    endDate: string;
    totalSales: number;
    totalTransactions: number;
    totalExpenses: number;
    grossProfit: number;
    netProfit: number;
    avgTransaction: number;
    profitMargin: number;
    topProducts: { name: string; quantity: number; revenue: number }[];
    salesByPayment: { method: string; total: number; count: number }[];
    dailyData: { date: string; sales: number; transactions: number }[];
    // New fields for page 2
    allServices?: { name: string; quantity: number; revenue: number; category?: string }[];
    bookingStats?: {
        total: number;
        confirmed: number;
        completed: number;
        canceled: number;
        pending: number;
        totalRevenue: number;
    };
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(value);
};

export async function generateReportPDF(data: ReportData): Promise<void> {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    let yPos = margin;

    // Helper function to add text
    const addText = (text: string, x: number, y: number, options: { fontSize?: number; fontStyle?: string; color?: number[]; align?: 'left' | 'center' | 'right' } = {}) => {
        const { fontSize = 10, fontStyle = 'normal', color = [0, 0, 0], align = 'left' } = options;
        pdf.setFontSize(fontSize);
        pdf.setFont('helvetica', fontStyle);
        pdf.setTextColor(color[0], color[1], color[2]);

        if (align === 'right') {
            const textWidth = pdf.getTextWidth(text);
            pdf.text(text, x - textWidth, y);
        } else if (align === 'center') {
            pdf.text(text, x, y, { align: 'center' });
        } else {
            pdf.text(text, x, y);
        }
    };

    // Header
    pdf.setFillColor(79, 70, 229); // Indigo
    pdf.rect(0, 0, pageWidth, 40, 'F');

    addText('VEROPRISE ERP', margin, 18, { fontSize: 22, fontStyle: 'bold', color: [255, 255, 255] });
    addText('Laporan Keuangan', margin, 28, { fontSize: 12, color: [220, 220, 250] });
    addText(data.outletName, margin, 35, { fontSize: 10, color: [200, 200, 230] });

    // Period info on right
    addText(data.periodLabel, pageWidth - margin, 18, { fontSize: 11, color: [255, 255, 255], align: 'right' });
    addText(`${data.startDate} - ${data.endDate}`, pageWidth - margin, 26, { fontSize: 9, color: [200, 200, 230], align: 'right' });

    yPos = 55;

    // Summary Cards Row
    const cardWidth = (pageWidth - margin * 2 - 15) / 4;
    const cardHeight = 28;
    const summaryCards = [
        { label: 'Total Penjualan', value: formatCurrency(data.totalSales), color: [34, 197, 94] },
        { label: 'Total Pengeluaran', value: formatCurrency(data.totalExpenses), color: [239, 68, 68] },
        { label: 'Gross Profit', value: formatCurrency(data.grossProfit), color: [59, 130, 246] },
        { label: 'Net Profit', value: formatCurrency(data.netProfit), color: data.netProfit >= 0 ? [16, 185, 129] : [239, 68, 68] }
    ];

    summaryCards.forEach((card, idx) => {
        const x = margin + idx * (cardWidth + 5);

        // Card background
        pdf.setFillColor(248, 250, 252);
        pdf.setDrawColor(226, 232, 240);
        pdf.roundedRect(x, yPos, cardWidth, cardHeight, 3, 3, 'FD');

        addText(card.label, x + 5, yPos + 10, { fontSize: 8, color: [100, 116, 139] });
        addText(card.value, x + 5, yPos + 20, { fontSize: 11, fontStyle: 'bold', color: card.color });
    });

    yPos += cardHeight + 12;

    // Key Metrics Row
    pdf.setFillColor(248, 250, 252);
    pdf.setDrawColor(226, 232, 240);
    pdf.roundedRect(margin, yPos, pageWidth - margin * 2, 22, 3, 3, 'FD');

    const metricsWidth = (pageWidth - margin * 2) / 3;
    const metrics = [
        { label: 'Total Transaksi', value: `${data.totalTransactions} transaksi` },
        { label: 'Rata-rata per Transaksi', value: formatCurrency(data.avgTransaction) },
        { label: 'Profit Margin', value: `${data.profitMargin.toFixed(1)}%` }
    ];

    metrics.forEach((metric, idx) => {
        const x = margin + 8 + idx * metricsWidth;
        addText(metric.label, x, yPos + 8, { fontSize: 8, color: [100, 116, 139] });
        addText(metric.value, x, yPos + 16, { fontSize: 10, fontStyle: 'bold' });
    });

    yPos += 32;

    // Daily Chart Section
    if (data.dailyData.length > 0) {
        addText('Penjualan Harian', margin, yPos, { fontSize: 13, fontStyle: 'bold' });
        yPos += 8;

        const maxSales = Math.max(...data.dailyData.map(d => d.sales), 1);
        const chartHeight = 45;
        const chartWidth = pageWidth - margin * 2;
        const barAreaWidth = chartWidth - 10;
        const barWidth = Math.min(barAreaWidth / data.dailyData.length - 2, 20);

        // Chart background
        pdf.setFillColor(250, 250, 255);
        pdf.setDrawColor(226, 232, 240);
        pdf.roundedRect(margin, yPos, chartWidth, chartHeight + 18, 3, 3, 'FD');

        // Draw bars
        const startX = margin + 5 + (barAreaWidth - (data.dailyData.length * (barWidth + 2))) / 2;

        data.dailyData.forEach((day, idx) => {
            const barHeight = Math.max((day.sales / maxSales) * chartHeight, 2);
            const x = startX + idx * (barWidth + 2);
            const barY = yPos + chartHeight - barHeight + 3;

            // Bar gradient effect
            pdf.setFillColor(99, 102, 241);
            pdf.roundedRect(x, barY, barWidth, barHeight, 1, 1, 'F');

            // Date label
            const dateShort = day.date.slice(5).replace('-', '/');
            pdf.setFontSize(6);
            pdf.setTextColor(100, 116, 139);
            pdf.text(dateShort, x + barWidth / 2, yPos + chartHeight + 12, { align: 'center' });
        });

        yPos += chartHeight + 28;
    }

    // Two Column Section
    const colWidth = (pageWidth - margin * 2 - 10) / 2;

    // Top Products
    addText('Produk Terlaris', margin, yPos, { fontSize: 13, fontStyle: 'bold' });
    addText('Metode Pembayaran', margin + colWidth + 10, yPos, { fontSize: 13, fontStyle: 'bold' });

    yPos += 8;

    // Top Products Table
    const prodStartY = yPos;
    if (data.topProducts.length === 0) {
        pdf.setFillColor(248, 250, 252);
        pdf.roundedRect(margin, prodStartY, colWidth, 20, 2, 2, 'F');
        addText('Belum ada data', margin + colWidth / 2, prodStartY + 12, { fontSize: 9, color: [150, 150, 150], align: 'center' });
    } else {
        data.topProducts.slice(0, 5).forEach((product, idx) => {
            const rowY = prodStartY + idx * 14;

            pdf.setFillColor(idx % 2 === 0 ? 248 : 255, 250, 252);
            pdf.rect(margin, rowY, colWidth, 14, 'F');

            addText(`${idx + 1}. ${product.name}`, margin + 3, rowY + 9, { fontSize: 9 });
            addText(`${product.quantity}x`, margin + colWidth - 45, rowY + 9, { fontSize: 8, color: [100, 116, 139] });
            addText(formatCurrency(product.revenue), margin + colWidth - 3, rowY + 9, { fontSize: 9, fontStyle: 'bold', color: [34, 197, 94], align: 'right' });
        });
    }

    // Payment Methods Table
    const payStartY = yPos;
    if (data.salesByPayment.length === 0) {
        pdf.setFillColor(248, 250, 252);
        pdf.roundedRect(margin + colWidth + 10, payStartY, colWidth, 20, 2, 2, 'F');
        addText('Belum ada data', margin + colWidth + 10 + colWidth / 2, payStartY + 12, { fontSize: 9, color: [150, 150, 150], align: 'center' });
    } else {
        data.salesByPayment.forEach((payment, idx) => {
            const rowY = payStartY + idx * 14;

            pdf.setFillColor(idx % 2 === 0 ? 248 : 255, 250, 252);
            pdf.rect(margin + colWidth + 10, rowY, colWidth, 14, 'F');

            addText(payment.method.toUpperCase(), margin + colWidth + 13, rowY + 9, { fontSize: 9, fontStyle: 'bold' });
            addText(`${payment.count} tx`, margin + colWidth + 55, rowY + 9, { fontSize: 8, color: [100, 116, 139] });
            addText(formatCurrency(payment.total), margin + colWidth * 2 + 7, rowY + 9, { fontSize: 9, fontStyle: 'bold', color: [59, 130, 246], align: 'right' });
        });
    }

    // Footer Page 1
    pdf.setFillColor(248, 250, 252);
    pdf.rect(0, pageHeight - 18, pageWidth, 18, 'F');

    const now = new Date().toLocaleString('id-ID');
    addText(`Dibuat: ${now}`, margin, pageHeight - 7, { fontSize: 7, color: [150, 150, 150] });
    addText('Laporan ini digenerate oleh Veroprise ERP', pageWidth / 2, pageHeight - 7, { fontSize: 7, color: [150, 150, 150], align: 'center' });
    addText('Halaman 1/2', pageWidth - margin, pageHeight - 7, { fontSize: 7, color: [150, 150, 150], align: 'right' });

    // ========== PAGE 2: Services Detail & Booking Stats ==========
    pdf.addPage();
    yPos = margin;

    // Header Page 2
    pdf.setFillColor(79, 70, 229);
    pdf.rect(0, 0, pageWidth, 35, 'F');

    addText('VEROPRISE ERP', margin, 15, { fontSize: 18, fontStyle: 'bold', color: [255, 255, 255] });
    addText('Detail Layanan & Statistik Booking', margin, 25, { fontSize: 11, color: [220, 220, 250] });
    addText(`${data.startDate} - ${data.endDate}`, pageWidth - margin, 20, { fontSize: 9, color: [200, 200, 230], align: 'right' });

    yPos = 45;

    // Booking Statistics Section
    if (data.bookingStats) {
        addText('Statistik Booking Pelanggan', margin, yPos, { fontSize: 14, fontStyle: 'bold' });
        yPos += 10;

        const stats = data.bookingStats;
        const bookingCardWidth = (pageWidth - margin * 2 - 20) / 5;
        const bookingCards = [
            { label: 'Total Booking', value: stats.total.toString(), color: [59, 130, 246] },
            { label: 'Menunggu', value: stats.pending.toString(), color: [234, 179, 8] },
            { label: 'Dikonfirmasi', value: stats.confirmed.toString(), color: [99, 102, 241] },
            { label: 'Selesai', value: stats.completed.toString(), color: [34, 197, 94] },
            { label: 'Dibatalkan', value: stats.canceled.toString(), color: [239, 68, 68] },
        ];

        bookingCards.forEach((card, idx) => {
            const x = margin + idx * (bookingCardWidth + 5);
            pdf.setFillColor(248, 250, 252);
            pdf.setDrawColor(226, 232, 240);
            pdf.roundedRect(x, yPos, bookingCardWidth, 25, 2, 2, 'FD');

            addText(card.label, x + 3, yPos + 8, { fontSize: 7, color: [100, 116, 139] });
            addText(card.value, x + 3, yPos + 18, { fontSize: 14, fontStyle: 'bold', color: card.color });
        });

        yPos += 35;

        // Success rate
        const successRate = stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(1) : '0';
        const cancelRate = stats.total > 0 ? ((stats.canceled / stats.total) * 100).toFixed(1) : '0';

        pdf.setFillColor(240, 253, 244);
        pdf.setDrawColor(187, 247, 208);
        pdf.roundedRect(margin, yPos, (pageWidth - margin * 2 - 5) / 2, 20, 2, 2, 'FD');
        addText('Tingkat Keberhasilan', margin + 5, yPos + 8, { fontSize: 8, color: [22, 163, 74] });
        addText(`${successRate}%`, margin + 5, yPos + 16, { fontSize: 12, fontStyle: 'bold', color: [22, 163, 74] });

        pdf.setFillColor(254, 242, 242);
        pdf.setDrawColor(254, 202, 202);
        pdf.roundedRect(margin + (pageWidth - margin * 2) / 2 + 2.5, yPos, (pageWidth - margin * 2 - 5) / 2, 20, 2, 2, 'FD');
        addText('Tingkat Pembatalan', margin + (pageWidth - margin * 2) / 2 + 7.5, yPos + 8, { fontSize: 8, color: [220, 38, 38] });
        addText(`${cancelRate}%`, margin + (pageWidth - margin * 2) / 2 + 7.5, yPos + 16, { fontSize: 12, fontStyle: 'bold', color: [220, 38, 38] });

        yPos += 30;

        // Revenue from bookings
        pdf.setFillColor(239, 246, 255);
        pdf.setDrawColor(191, 219, 254);
        pdf.roundedRect(margin, yPos, pageWidth - margin * 2, 18, 2, 2, 'FD');
        addText('Total Revenue dari Booking', margin + 5, yPos + 11, { fontSize: 9 });
        addText(formatCurrency(stats.totalRevenue), pageWidth - margin - 5, yPos + 11, { fontSize: 11, fontStyle: 'bold', color: [37, 99, 235], align: 'right' });

        yPos += 28;
    }

    // All Services Section
    addText('Daftar Semua Layanan Terjual', margin, yPos, { fontSize: 14, fontStyle: 'bold' });
    yPos += 8;

    if (data.allServices && data.allServices.length > 0) {
        // Table header
        pdf.setFillColor(79, 70, 229);
        pdf.rect(margin, yPos, pageWidth - margin * 2, 10, 'F');

        addText('No', margin + 3, yPos + 7, { fontSize: 8, fontStyle: 'bold', color: [255, 255, 255] });
        addText('Nama Layanan', margin + 15, yPos + 7, { fontSize: 8, fontStyle: 'bold', color: [255, 255, 255] });
        addText('Qty', margin + 110, yPos + 7, { fontSize: 8, fontStyle: 'bold', color: [255, 255, 255] });
        addText('Revenue', pageWidth - margin - 3, yPos + 7, { fontSize: 8, fontStyle: 'bold', color: [255, 255, 255], align: 'right' });

        yPos += 10;

        // Table rows
        data.allServices.forEach((service, idx) => {
            if (yPos > pageHeight - 30) {
                // Add new page if needed
                pdf.addPage();
                yPos = margin;
            }

            pdf.setFillColor(idx % 2 === 0 ? 248 : 255, 250, 252);
            pdf.rect(margin, yPos, pageWidth - margin * 2, 9, 'F');

            addText(`${idx + 1}`, margin + 3, yPos + 6, { fontSize: 8, color: [100, 116, 139] });
            addText((service.name || 'Unnamed').substring(0, 40), margin + 15, yPos + 6, { fontSize: 8 });
            addText(`${service.quantity}x`, margin + 110, yPos + 6, { fontSize: 8, color: [100, 116, 139] });
            addText(formatCurrency(service.revenue), pageWidth - margin - 3, yPos + 6, { fontSize: 8, fontStyle: 'bold', color: [34, 197, 94], align: 'right' });

            yPos += 9;
        });

        // Total row
        yPos += 2;
        pdf.setFillColor(226, 232, 240);
        pdf.rect(margin, yPos, pageWidth - margin * 2, 10, 'F');

        const totalQty = data.allServices.reduce((sum, s) => sum + s.quantity, 0);
        const totalRev = data.allServices.reduce((sum, s) => sum + s.revenue, 0);

        addText('TOTAL', margin + 15, yPos + 7, { fontSize: 9, fontStyle: 'bold' });
        addText(`${totalQty}x`, margin + 110, yPos + 7, { fontSize: 9, fontStyle: 'bold' });
        addText(formatCurrency(totalRev), pageWidth - margin - 3, yPos + 7, { fontSize: 9, fontStyle: 'bold', color: [22, 163, 74], align: 'right' });
    } else {
        pdf.setFillColor(248, 250, 252);
        pdf.roundedRect(margin, yPos, pageWidth - margin * 2, 25, 2, 2, 'F');
        addText('Belum ada data layanan di periode ini', pageWidth / 2, yPos + 15, { fontSize: 10, color: [150, 150, 150], align: 'center' });
    }

    // Footer Page 2
    pdf.setFillColor(248, 250, 252);
    pdf.rect(0, pageHeight - 18, pageWidth, 18, 'F');

    addText(`Dibuat: ${now}`, margin, pageHeight - 7, { fontSize: 7, color: [150, 150, 150] });
    addText('Laporan ini digenerate oleh Veroprise ERP', pageWidth / 2, pageHeight - 7, { fontSize: 7, color: [150, 150, 150], align: 'center' });
    addText('Halaman 2/2', pageWidth - margin, pageHeight - 7, { fontSize: 7, color: [150, 150, 150], align: 'right' });

    // Save PDF
    const fileName = `Laporan_${data.outletName.replace(/\s/g, '_')}_${data.startDate.replace(/\//g, '-')}_${data.endDate.replace(/\//g, '-')}.pdf`;
    pdf.save(fileName);
}

export type { ReportData };
