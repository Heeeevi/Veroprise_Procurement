# Veroprise ERP - Barbershop Management System

> **Modern Cloud-Based ERP untuk Barbershop dengan Sistem Booking Terintegrasi**

[![React](https://img.shields.io/badge/React-18-blue)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)](https://supabase.com/)
[![Vite](https://img.shields.io/badge/Vite-5.0-purple)](https://vitejs.dev/)

---

## 🎯 Overview

**Veroprise ERP** adalah sistem manajemen barbershop lengkap dengan fitur:
- ✅ **POS (Point of Sale)** - Kasir cepat & mudah
- ✅ **Booking System** - Reservasi online untuk pelanggan
- ✅ **Inventory Management** - Tracking stock multi-outlet
- ✅ **Finance & Expenses** - Laporan keuangan real-time
- ✅ **HR & Payroll** - Manajemen karyawan & gaji
- ✅ **Multi-Outlet** - Kelola banyak cabang dalam 1 sistem
- ✅ **Real-Time Dashboard** - Statistik & analytics

---

## 🚀 Quick Start

### Prerequisites
```bash
Node.js >= 18
npm atau bun
Supabase account (gratis)
```

### Installation
```bash
# Clone repository
git clone <repo-url>
cd barberdoc_erp

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env dengan Supabase credentials
```

### Database Setup
1. Login ke [supabase.com](https://supabase.com)
2. Buat project baru
3. Buka SQL Editor
4. Jalankan file berikut secara berurutan:
   ```
   supabase/COMPLETE_SCHEMA.sql   (wajib)
   supabase/SEED_DATA.sql         (optional - data sample)
   ```
5. Update `.env` dengan credentials:
   ```env
   VITE_SUPABASE_URL=your-project-url
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

### Run Development
```bash
npm run dev
```
Buka [http://localhost:8080](http://localhost:8080)

---

## 📚 Documentation

### Database
- 📖 [Complete Schema](./supabase/COMPLETE_SCHEMA.sql) - Full database schema
- 📖 [Setup Guide](./supabase/DATABASE_SETUP_GUIDE.md) - Step-by-step setup
- 📖 [Quick Reference](./supabase/QUICK_REFERENCE.md) - Query examples & tips
- 📖 [Seed Data](./supabase/SEED_DATA.sql) - Sample data untuk testing

### Features
- 📖 [Booking Integration](./BOOKING_INTEGRATION.md) - Dokumentasi sistem booking

---

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **UI**: shadcn/ui + Tailwind CSS
- **State**: TanStack Query (React Query)
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Routing**: React Router v6

### Project Structure
```
barberdoc_erp/
├── src/
│   ├── components/        # Reusable components
│   │   ├── ui/           # shadcn/ui components
│   │   ├── layout/       # Layout components
│   │   └── hr/           # HR specific components
│   ├── pages/            # Route pages
│   │   ├── Dashboard.tsx
│   │   ├── POS.tsx
│   │   ├── Bookings.tsx
│   │   ├── PublicBooking.tsx
│   │   ├── Inventory.tsx
│   │   ├── Transactions.tsx
│   │   ├── Expenses.tsx
│   │   ├── HR.tsx
│   │   └── Reports.tsx
│   ├── hooks/            # Custom React hooks
│   │   ├── useAuth.tsx
│   │   ├── useOutlet.tsx
│   │   └── useShift.tsx
│   ├── integrations/     # External integrations
│   │   └── supabase/
│   ├── lib/              # Utility functions
│   ├── types/            # TypeScript types
│   └── App.tsx
├── supabase/
│   ├── migrations/       # Database migrations
│   ├── COMPLETE_SCHEMA.sql
│   ├── SEED_DATA.sql
│   └── *.md             # Documentation
└── public/
```

---

## 🎯 Key Features

### 1. 📅 Booking System
**Customer-facing** (`/book`):
- Form booking sederhana tanpa login
- Pilih outlet, tanggal, jam
- Pembayaran Rp10.000

**Admin panel** (`/bookings`):
- Dashboard lengkap
- Konfirmasi booking → auto create transaction
- Revenue tracking

### 2. 🛒 POS (Point of Sale)
- Quick sale interface
- Product search & category filter
- Multiple payment methods (cash, QRIS, transfer)
- Print receipt
- Shift management

### 3. 📦 Inventory Management
- Multi-outlet stock tracking
- Low stock alerts
- Product recipes (BOM)
- Auto-deduct inventory on sale
- Purchase orders

### 4. 💰 Finance & Expenses
- Transaction history
- Expense tracking & approval
- Daily/monthly reports
- Profit/loss calculation
- Budget tracking

### 5. 👥 HR & Payroll
- Employee management
- Attendance tracking
- Payroll processing
- Salary calculation
- Commission tracking

### 6. 📊 Dashboard & Reports
- Real-time statistics
- Sales analytics
- Top products
- Revenue trends
- Export to PDF/Excel

---

## 🔐 Security

### Row Level Security (RLS)
- ✅ Enabled pada semua tabel
- ✅ Users hanya lihat data outlet mereka
- ✅ Role-based access control

### User Roles
- **Owner**: Full access
- **Manager**: Manage outlet operations
- **Staff**: POS & basic operations
- **Investor**: View-only reports

---

## 🎨 UI/UX

### Design System
- **shadcn/ui** - Modern, accessible components
- **Tailwind CSS** - Utility-first styling
- **Dark mode ready** - Theme support
- **Responsive** - Mobile, tablet, desktop

### Color Palette
```css
--accent: #3b82f6      /* Primary blue */
--accent-2: #22c55e    /* Success green */
--destructive: #ef4444 /* Error red */
--info: #06b6d4        /* Info cyan */
```

---

## 📊 Database Schema

### 30+ Tables:
- **User Management**: user_roles, profiles, user_outlets
- **Products**: categories, products, product_recipes
- **Inventory**: inventory_items, outlet_inventory, inventory_transactions
- **Sales**: transactions, transaction_items, shifts
- **Finance**: expenses, expense_categories
- **Booking**: bookings (with payment tracking)
- **HR**: employees, attendance_logs, payroll_runs, payroll_items
- **Procurement**: partner_vendors, purchase_orders, purchase_order_items
- **Audit**: audit_logs

### Key Relationships
```
outlets
  ├─ user_outlets → users
  ├─ transactions → bookings
  ├─ expenses
  ├─ inventory
  └─ employees
```

---

## 🔧 Configuration

### Environment Variables
```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Optional
VITE_APP_NAME=Veroprise ERP
VITE_API_URL=http://localhost:3000
```

### Supabase Configuration
1. **Authentication**: Enable Email/Password auth
2. **Storage**: Setup bucket untuk receipts/images
3. **Realtime**: Enable untuk live updates
4. **Edge Functions**: (Optional) untuk advanced features

---

## 🚀 Deployment

### Frontend (Netlify/Vercel)
```bash
# Build
npm run build

# Preview
npm run preview

# Deploy
# Connect GitHub repo ke Netlify/Vercel
```

### Database (Supabase)
- Production database sudah ready
- Run migrations via Supabase CLI atau Dashboard
- Setup backups & monitoring

---

## 📈 Performance

### Optimization
- ✅ **Lazy loading** - Code splitting per route
- ✅ **React Query** - Smart caching & prefetching
- ✅ **Database indexes** - Fast queries
- ✅ **Image optimization** - Responsive images
- ✅ **Bundle size** - Tree shaking & minification

### Monitoring
- Supabase Dashboard - Database performance
- Browser DevTools - Frontend performance
- React Query DevTools - Cache inspection

---

## 🧪 Testing

### Manual Testing
```bash
# Development
npm run dev

# Test user flow:
1. Create account → /auth
2. Setup profile & outlet
3. Test POS → /pos
4. Test booking → /book
5. Confirm booking → /bookings
6. Check transactions → /transactions
7. View reports → /reports
```

### Sample Credentials (after seed data)
```
Email: test@example.com
Password: (set during signup)
```

---

## 🐛 Troubleshooting

### Common Issues

**1. "Cannot connect to Supabase"**
- Check `.env` file exists dan terisi
- Verify VITE_SUPABASE_URL format: `https://xxx.supabase.co`
- Ensure anon key is correct

**2. "RLS policy blocks access"**
- Check user has role in `user_roles` table
- Verify user mapped to outlet in `user_outlets`
- Run: `SELECT * FROM user_outlets WHERE user_id = auth.uid();`

**3. "Booking not showing"**
- Check RLS policies on `bookings` table
- Verify outlet_id matches user's access
- Check browser console for errors

**4. "Inventory not deducting"**
- Verify `product_recipes` table has entries
- Check trigger is enabled: `trigger_deduct_inventory`
- Ensure `outlet_inventory` has stock

### Debug Mode
```typescript
// Enable React Query DevTools
// Already included in dev mode

// Enable Supabase Debug
localStorage.setItem('supabase.auth.debug', 'true')
```

---

## 🤝 Contributing

### Development Workflow
1. Create feature branch
2. Make changes
3. Test locally
4. Submit PR

### Code Style
- TypeScript strict mode
- ESLint + Prettier
- Component naming: PascalCase
- Function naming: camelCase

---

## 📞 Support

### Resources
- 📖 [Supabase Docs](https://supabase.com/docs)
- 📖 [React Query Docs](https://tanstack.com/query)
- 📖 [shadcn/ui Docs](https://ui.shadcn.com)
- 📖 [Tailwind CSS Docs](https://tailwindcss.com)

### Get Help
- Check documentation files in `supabase/` folder
- Review `BOOKING_INTEGRATION.md` untuk booking system
- Open issue di GitHub repository

---

## 📜 License

MIT License - Free to use untuk personal & commercial

---

## 🎉 Features Roadmap

### Current Version (v1.0)
- ✅ Multi-outlet management
- ✅ POS system
- ✅ Booking system
- ✅ Inventory tracking
- ✅ Finance & expenses
- ✅ HR & payroll
- ✅ Reports & analytics

### Coming Soon (v1.1)
- [ ] Email notifications
- [ ] WhatsApp integration
- [ ] Online payment gateway (Midtrans)
- [ ] Advanced analytics
- [ ] Mobile app (React Native)
- [ ] API documentation
- [ ] Webhook support

---

## 👏 Credits

Built with ❤️ using:
- [React](https://reactjs.org/)
- [Supabase](https://supabase.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [TanStack Query](https://tanstack.com/query)

---

**🚀 Ready to revolutionize your barbershop management!**

For detailed setup instructions, see [DATABASE_SETUP_GUIDE.md](./supabase/DATABASE_SETUP_GUIDE.md)
