# Kế Hoạch & Thiết Kế Khung Dự Án Next.js App Router (Blueprint Scaffolding) — Vivu

- **Người thực hiện**: Explorer M1.1 (`teamwork_preview_explorer`)
- **Thời gian**: 2026-10-02T12:42:00Z
- **Thư mục làm việc**: `d:/DangQuangTung/Vivu`
- **Mục tiêu**: Nghiên cứu, kiểm tra thực nghiệm và ban hành thiết kế chi tiết (blueprint) cho Worker khởi tạo dự án Next.js Fullstack (App Router), cấu hình cổng 3001, các tệp cấu hình cốt lõi và toàn bộ dependencies chuẩn xác, không bị chặn bởi tương tác CLI (non-interactive).

---

## 1. Kết Quả Khảo Sát & Phát Hiện Thực Nghiệm Cốt Lõi (Key Empirical Findings)

### 1.1 Khảo sát môi trường thực tế trên máy trạm
- **Hệ điều hành**: Windows 10 Pro (x64)
- **Node.js**: `v22.11.0` (LTS Iron) — Hỗ trợ đầy đủ native fetch, ES modules, dynamic imports, async/await top-level.
- **npm**: `10.9.0`
- **Cổng mạng (Ports)**:
  - Cổng `1433`: SQL Server Express 2025 đang lắng nghe kết nối TCP (`0.0.0.0:1433`).
  - Cổng `3000`: Đang bị chiếm giữ bởi tiến trình PID 11200 (`vietnam-bus-management-system`).
  - Cổng `3001`: Trống hoàn toàn, được chọn làm cổng phát triển chính thức cho Vivu (`next dev -p 3001`).

### 1.2 Phát hiện cạm bẫy chí mạng: `create-next-app` từ chối thư mục có sẵn
- **Thực nghiệm**: Đã chạy thử lệnh `npx create-next-app` với các cờ tự động (`--ts --tailwind --eslint --app --no-src-dir --yes --skip-install`) trên thư mục chứa sẵn tệp tin.
- **Kết quả lỗi**: `create-next-app` lập tức báo lỗi:
  > *"The directory Vivu contains files that could conflict: thiet-ke-he-thong-xe-buyt.md ... Either try using a new directory name, or remove the files listed above."*
- **Ý nghĩa đối với Worker**: Thư mục `d:/DangQuangTung/Vivu` hiện tại đã có tệp đặc tả `thiet-ke-he-thong-xe-buyt.md` và thư mục metadata `.agents/`. Nếu Worker cố gắng chạy `npx create-next-app .`, lệnh **sẽ thất bại 100% hoặc treo chờ tương tác người dùng**.
- **Giải pháp tối ưu & chuẩn xác**: Worker **không sử dụng CLI tương tác `create-next-app`**. Thay vào đó, Worker sẽ:
  1. Tạo trực tiếp các tệp cấu hình chuẩn (`package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.js`, `postcss.config.js`, `vitest.config.ts`, `.env.local`, `.gitignore`).
  2. Tạo bộ khung thư mục (`app/`, `components/`, `lib/`, `scripts/`, `tests/`, `docs/`).
  3. Tạo các tệp mã nguồn khởi đầu (`app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `lib/utils.ts`).
  4. Chạy duy nhất lệnh phi tương tác `npm install`.

### 1.3 Kiểm tra tương thích gói phụ thuộc (Dependency Lock Resolution)
Đã thực nghiệm chạy thử phân giải phụ thuộc `npm install --package-lock-only` với toàn bộ danh mục thư viện:
- `next: ^16.2.6`, `react: ^19.2.6`, `react-dom: ^19.2.6`
- `mssql: ^12.7.2`, `tedious: ^20.0.0`, `@types/mssql: ^12.0.2`
- `bcryptjs: ^3.0.2`, `jsonwebtoken: ^9.0.2`, `zod: ^3.24.2`
- `qrcode: ^1.5.4`, `html5-qrcode: ^2.3.8`
- `lucide-react: ^1.16.0`, `clsx: ^2.1.1`, `tailwind-merge: ^3.5.0`
- `tailwindcss: ^3.4.17`, `postcss: ^8.5.8`, `autoprefixer: ^10.4.20`
- `vitest: ^3.0.8`, `@testing-library/react: ^16.3.2`, `jsdom: ^26.0.0`
- **Kết quả**: Phân giải 420 packages thành công 100% không có bất kỳ xung đột peer dependency (`ERESOLVE`) nào!

---

## 2. Danh Mục Gói Phụ Thuộc Chuẩn Xác (`package.json`)

```json
{
  "name": "vivu",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3001",
    "build": "next build",
    "start": "next start -p 3001",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "bcryptjs": "^3.0.2",
    "clsx": "^2.1.1",
    "jsonwebtoken": "^9.0.2",
    "lucide-react": "^1.16.0",
    "mssql": "^12.7.2",
    "next": "^16.2.6",
    "qrcode": "^1.5.4",
    "react": "^19.2.6",
    "react-dom": "^19.2.6",
    "tailwind-merge": "^3.5.0",
    "tedious": "^20.0.0",
    "zod": "^3.24.2"
  },
  "devDependencies": {
    "@testing-library/react": "^16.3.2",
    "@types/bcryptjs": "^2.4.6",
    "@types/jsonwebtoken": "^9.0.9",
    "@types/mssql": "^12.0.2",
    "@types/node": "^22.13.10",
    "@types/qrcode": "^1.5.6",
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "eslint": "^9.21.0",
    "eslint-config-next": "^16.2.6",
    "html5-qrcode": "^2.3.8",
    "jsdom": "^26.0.0",
    "postcss": "^8.5.8",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.9.3",
    "vitest": "^3.0.8"
  }
}
```

---

## 3. Bản Thiết Kế Toàn Bộ Tệp Cấu Hình (Configuration Specifications)

### 3.1 `tsconfig.json`
> **Lưu ý cấu trúc**: Theo tài liệu layout `PROJECT.md`, mã nguồn nằm trực tiếp trong thư mục gốc (`app/`, `components/`, `lib/`), KHÔNG nằm trong `src/`. Do đó `"paths"` phải ánh xạ `"@/*": ["./*"]`.

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    },
    "plugins": [
      {
        "name": "next"
      }
    ]
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts"
  ],
  "exclude": [
    "node_modules"
  ]
}
```

### 3.2 `next.config.ts`
> **Lưu ý serverExternalPackages**: Phải khai báo `mssql` và `tedious` trong `serverExternalPackages` để tránh Webpack/Turbopack cố đóng gói thư viện C++/native của SQL Server vào client bundle.

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['mssql', 'tedious'],
};

export default nextConfig;
```

### 3.3 `tailwind.config.js`
> Cấu hình màu sắc giao thông công cộng theo chuẩn Mục 7 (Anti-AI-Slop): Màu xanh navy đậm (`#1e3a8a`), xanh rêu/teal đô thị (`#0f766e`), độ tương phản cao, nền sáng sạch sẽ, loại bỏ hoàn toàn dark mode neon/glassmorphism.

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        transit: {
          50: '#f0fdf4',
          100: '#dcfce7',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
      },
    },
  },
  plugins: [],
};
```

### 3.4 `postcss.config.js`
```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

### 3.5 `vitest.config.ts`
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
```

### 3.6 `.env.local` & `.env.example`
Tệp `.env.local`:
```env
# Cổng ứng dụng & URL
PORT=3001
NEXT_PUBLIC_APP_URL=http://localhost:3001

# Kết nối CSDL SQL Server 2025 Express
DB_SERVER=localhost
DB_PORT=1433
DB_USER=vivu_admin
DB_PASSWORD=VivuAdmin@2026!
DB_NAME=bus_ticketing_system
DB_TRUST_SERVER_CERTIFICATE=true
DB_ENCRYPT=true

# Khóa bí mật JWT Authentication
JWT_SECRET=vivu_access_token_secret_key_2026_very_secure
JWT_REFRESH_SECRET=vivu_refresh_token_secret_key_2026_very_secure
JWT_EXPIRES_IN=1d
JWT_REFRESH_EXPIRES_IN=7d

# Cấu hình thanh toán SePay VietQR
SEPAY_API_TOKEN=VIVU_SEPAY_SECRET_TOKEN_2026
SEPAY_BANK_NAME=MBBank
SEPAY_ACCOUNT_NO=0987654321
SEPAY_ACCOUNT_NAME=CONG TY CP XE BUYT VIVU

# Goong Map API (Hỗ trợ fallback tĩnh)
GOONG_API_KEY=mock_goong_api_key
NEXT_PUBLIC_GOONG_MAP_KEY=mock_goong_map_key
```

### 3.7 `.gitignore`
```gitignore
# dependencies
/node_modules
/.pnp
.pnp.js

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# local env files
.env*.local

# typescript
*.tsbuildinfo
next-env.d.ts
```

---

## 4. Tệp Mã Nguồn Mẫu Khởi Đầu (Starter Source Files)

### 4.1 `app/globals.css`
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --foreground-rgb: 15, 23, 42;
  --background-rgb: 248, 250, 252;
}

body {
  color: rgb(var(--foreground-rgb));
  background: rgb(var(--background-rgb));
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  margin: 0;
  padding: 0;
}
```

### 4.2 `lib/utils.ts`
```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### 4.3 `app/layout.tsx`
```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Vivu - Quản Lý Xe Buýt & Bán Vé Điện Tử',
  description: 'Hệ thống tra cứu tuyến và vé xe buýt điện tử',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
```

### 4.4 `app/page.tsx` (Màn hình 1 khởi đầu — Chuẩn Anti-AI-Slop)
```tsx
import Link from 'next/link';
import { Bus, Search, Ticket, ShieldCheck, QrCode } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="border-b bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-brand-900 font-bold text-xl">
            <div className="bg-brand-900 text-white p-2 rounded-lg">
              <Bus className="h-5 w-5" />
            </div>
            <span>VIVU BUS</span>
          </Link>
          <nav className="flex items-center gap-6 text-sm font-medium text-slate-700">
            <Link href="/routes" className="hover:text-brand-800">Tra cứu tuyến</Link>
            <Link href="/booking" className="hover:text-brand-800">Mua vé</Link>
            <Link href="/tickets" className="hover:text-brand-800">Vé của tôi</Link>
            <Link href="/inspector/scan" className="hover:text-brand-800 flex items-center gap-1 text-slate-600">
              <QrCode className="h-4 w-4" />
              Soát vé
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-10 flex-1 w-full">
        <div className="bg-brand-900 text-white rounded-2xl p-8 mb-8 shadow-md">
          <h1 className="text-3xl font-extrabold tracking-tight">Tra cứu tuyến & Mua vé trực tuyến</h1>
          <p className="mt-2 text-brand-100 max-w-xl text-base">
            Hệ thống bán vé điện tử văn minh cho mạng lưới xe buýt đô thị. Không cần dùng tiền mặt, thanh toán VietQR tức thì.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-brand-800 flex items-center justify-center mb-4">
              <Search className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Tra cứu lộ trình</h2>
            <p className="mt-2 text-sm text-slate-600">
              Tìm kiếm tuyến buýt qua các trạm dừng, xem khoảng cách tích luỹ và lịch xuất bến.
            </p>
            <Link href="/routes" className="inline-block mt-4 text-sm font-semibold text-brand-700 hover:text-brand-900">
              Xem danh sách tuyến &rarr;
            </Link>
          </div>

          <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4">
              <Ticket className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Vé điện tử tiện lợi</h2>
            <p className="mt-2 text-sm text-slate-600">
              Hỗ trợ vé lượt, vé ngày và vé tháng. Mua vé không cần tạo tài khoản với số điện thoại.
            </p>
            <Link href="/booking" className="inline-block mt-4 text-sm font-semibold text-emerald-700 hover:text-emerald-900">
              Đặt vé ngay &rarr;
            </Link>
          </div>

          <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center mb-4">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Cổng nhân viên soát vé</h2>
            <p className="mt-2 text-sm text-slate-600">
              Quét mã QR bảo mật cao bằng camera điện thoại ngoài hiện trường hoặc kiểm tra theo mã vé.
            </p>
            <Link href="/inspector/scan" className="inline-block mt-4 text-sm font-semibold text-slate-700 hover:text-slate-900">
              Vào màn hình soát vé &rarr;
            </Link>
          </div>
        </div>
      </main>

      <footer className="border-t bg-white py-6 text-center text-sm text-slate-500">
        <p>&copy; 2026 Vivu Bus. Mạng lưới xe buýt đô thị văn minh.</p>
      </footer>
    </div>
  );
}
```

---

## 5. Quy Trình Khởi Tạo Chi Tiết Dành Cho Worker (Non-Interactive Worker Execution Guide)

Worker có thể thực hiện tuần tự và hoàn toàn tự động bằng các bước PowerShell sau:

```powershell
# Bước 1: Khởi tạo Git nếu chưa có
if (-not (Test-Path ".git")) {
    git init
}

# Bước 2: Tạo cấu trúc thư mục
New-Item -ItemType Directory -Force -Path `
    "app/(passenger)", `
    "app/inspector/scan", `
    "app/inspector/history", `
    "app/admin/dashboard", `
    "app/admin/routes", `
    "app/admin/stops", `
    "app/admin/buses", `
    "app/admin/schedules", `
    "app/admin/ticket-types", `
    "app/admin/orders", `
    "app/admin/staff", `
    "app/admin/complaints", `
    "app/api/auth", `
    "app/api/routes", `
    "app/api/stops", `
    "app/api/ticket-types", `
    "app/api/orders", `
    "app/api/webhooks/sepay", `
    "app/api/tickets", `
    "app/api/complaints", `
    "app/api/admin", `
    "components/ui", `
    "lib", `
    "scripts", `
    "tests", `
    "docs"

# Bước 3: Ghi các file cấu hình và source khởi đầu (package.json, tsconfig.json, next.config.ts, tailwind.config.js, postcss.config.js, vitest.config.ts, .env.local, .gitignore, app/globals.css, lib/utils.ts, app/layout.tsx, app/page.tsx)

# Bước 4: Chạy cài đặt dependencies phi tương tác
npm install

# Bước 5: Kiểm tra tính toàn vẹn (Verification)
npm run typecheck
npm run build
npm test
```

---

## 6. Đánh Giá Rủi Ro & Phòng Ngừa Cho Worker

1. **Rủi ro xung đột port 3000**: Script `dev` đã được chốt gắn cờ `-p 3001` (`"next dev -p 3001"`). Khi chạy `npm run dev`, Next.js sẽ khởi động trực tiếp trên port 3001 mà không va chạm với tiến trình ở port 3000.
2. **Rủi ro mssql bundling trên client**: Đã cấu hình `serverExternalPackages: ['mssql', 'tedious']` trong `next.config.ts`.
3. **Rủi ro path alias `@/*`**: Đã cấu hình `"baseUrl": "."` và `"@/*": ["./*"]` trong `tsconfig.json` và `vitest.config.ts` để đồng bộ giữa Next.js và Vitest.
