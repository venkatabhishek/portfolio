# Portfolio - Next.js App

A modern, production-ready portfolio website built with Next.js 16, featuring financial analytics integration with Plaid SDK and a professional Shadcn/ui design system.

---

## 🚀 Features

- **Next.js 16** App Router with server/client component optimization
- **Shadcn/ui** Design system with accessible, customizable UI components
- **Tailwind CSS v4** Modern utility-first styling with JIT compiler
- **Radix UI** Accessible component primitives
- **Luce icons** Beautiful, scalable SVG icon library
- **Plaid SDK** Financial API integration for portfolio tracking
- **Environment-based** Configuration with .env support
- **TypeScript** Full type safety throughout the application
- **ESLint** Code quality and best practices enforcement

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│         Next.js App Router              │
├─────────────────────────────────────────┤
│  Server Components  │  Client Components │
│  Static Generation  │  Dynamic Rendering │
├─────────────────────────────────────────┤
│  Plaid API Integration Layer            │
│  Custom UI Component Library            │
├─────────────────────────────────────────┤
│  Tailwind CSS v4 + Shadcn/ui            │
└─────────────────────────────────────────┘
```

### Key Architectural Decisions

- **Server Components:** Default for better TTI (Time to Interact)
- **Client Components:** Used only where interactivity is needed (WebSockets, state management)
- **Type Safety:** Full TypeScript coverage for maintainability
- **Component Reusability:** Shadcn/ui components for consistent design system
- **Financial Data:** Plaid SDK for portfolio analytics

---

## 🛠️ Tech Stack

| Category | Technology | Version |
|----------|------------|---------|
| **Framework** | Next.js | 16.2.0 |
| **Library** | React | 19.2.4 |
| **CSS** | Tailwind CSS | 4.x |
| **UI Components** | Shadcn/ui | 0.0.4 |
| **Primitives** | Radix UI | 1.4.3 |
| **Icons** | Lucide React | 0.577.0 |
| **TypeScript** | TypeScript | 5.x |
| **Linter** | ESLint | 9.x |
| **Finance API** | Plaid SDK | 41.4.0 |
| **Tooling** | dotenv | 17.3.1 |

---

## 📦 Core Dependencies

### Framework & Runtime
- `next` - Next.js framework for production apps
- `react` & `react-dom` - React core and DOM rendering
- `@types/*` - TypeScript definitions for Node, React, React DOM

### Styling & UI
- `tailwindcss` - Tailwind v4 utility-first CSS framework
- `@shadcn/ui` - Design system component collection
- `lucide-react` - Scalable icon library
- `radix-ui` - Accessible UI primitives
- `class-variance-authority` - CSS class utility
- `clsx` - Class merge utility
- `tailwind-merge` - Conflict resolution
- `tw-animate-css` - Animation utilities
- `dotenv` - Environment variable loader

### Development & Tooling
- `eslint` - ESLint linter
- `eslint-config-next` - Next.js ESLint configuration
- `typescript` - TypeScript compiler

### Additional
- `node-fetch` - Fetch API for Node environment
- `plaid` - Plaid financial services SDK

---

## 🚦 Getting Started

### Prerequisites

- Node.js 20+ LTS
- npm, yarn, or pnpm

### Installation

```bash
# Install dependencies
npm install

# Set environment variables
cp .env.example .env
# Edit .env with your configuration

# Run development server
npm run dev
```

### Build for Production

```bash
npm run build
npm start
```

---

## 📁 Project Structure

```
portfolio/
├── app/                 # Next.js App Router
│   ├── layout.tsx      # Root layout
│   ├── page.tsx        # Home page
│   └── ...             # Route pages
├── components/         # Reusable UI components
├── lib/                # Utilities and helpers
├── public/             # Static assets
├── styles/             # Global styles
├── .env                # Environment variables
├── package.json        # Dependencies
├── tailwind.config.ts  # Tailwind configuration
└── README.md           # This file
```

---

## 🎯 Usage

### Server Components (Default)
Most pages render as server components for optimal performance. They have direct access to `fetch` and database queries.

### Client Components
Wrapped in `<React.StrictMode>` with `"use client"` directive for:
- Interactive functionality
- Browser APIs (hooks, DOM, window)
- State management

### UI Customization
All Shadcn/ui components are customizable via props and CSS variables:

```tsx
// Example: Custom button with Tailwind
<button className="btn-primary">
  Click Me
</button>
```

---

## 🔐 Security

- **Environment Variables:** Sensitive data in `.env` (gitignored)
- **TypeScript:** Full type safety prevents runtime errors
- **ESLint:** Enforces secure coding patterns
- **Next.js:** Built-in security best practices

---

## 📊 Performance

Optimized through:
- Server-side rendering (SSR)
- Static generation (SSG)
- Image optimization
- Tree-shaking unused code
- Lazy loading components

---

## 📝 License

MIT License - Feel free to use this project in your own applications.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a Pull Request

---

**Built with ❤️ using Next.js + Shadcn/ui + Tailwind CSS**
