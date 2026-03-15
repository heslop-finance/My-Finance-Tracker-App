# My Finance Tracker

A personal finance tracker built for New Zealand households. Track income, expenses, savings goals, net worth, and mortgage details — all stored locally in your browser.

## Features

- **Overview dashboard** — income vs expenses, savings rate, category breakdown
- **Budget tracking** — set per-category spending limits with visual progress bars
- **Calendar view** — daily and monthly payment calendar
- **Entries management** — add/edit/delete income and expense entries with recurrence support
- **Savings goals** — track progress towards financial goals
- **Net worth tracker** — assets vs liabilities with history snapshots
- **Mortgage calculator** — amortisation schedule with rate changes and lump-sum payments
- **PWA** — installable on mobile, works offline

## Tech Stack

- [React 18](https://react.dev/) + [Vite 5](https://vitejs.dev/)
- No external UI library — all components hand-crafted
- localStorage for persistence
- Service Worker for offline support

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Build & Deploy

```bash
npm run build   # outputs to dist/
```

Deploy the `dist/` folder to any static host (Netlify, Vercel, Cloudflare Pages, etc.).

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy)
