# PumpFlix Web Application

This directory contains the Next.js frontend for PumpFlix. The interface is built with React, TypeScript and Material‑UI.

## Features

- Responsive layout with Material‑UI
- State management via React Context and React Query
- Form handling using React Hook Form and Zod
- Authentication through the PumpFlix API
- Workflow management dashboard

## Getting Started

1. Install dependencies
   ```bash
   pnpm install
   ```
2. Create a `.env.local` file with at least the following variables:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:3001
   NEXT_PUBLIC_APP_NAME=PumpFlix
   ```
3. Start the development server
   ```bash
   pnpm dev
   ```
4. Open <http://localhost:3000> in your browser.

## Available Scripts

- `pnpm dev` – start the dev server
- `pnpm build` – build for production
- `pnpm start` – run the production build
- `pnpm lint` – run ESLint
- `pnpm type-check` – run TypeScript type checks

## Project Structure

```
src/
  ├── components/     # Reusable UI components
  ├── contexts/       # React context providers
  ├── lib/            # API client and helpers
  ├── pages/          # Route components
  ├── theme.ts        # Material-UI theme setup
  ├── App.tsx         # Application root
  └── main.tsx        # Entry point
```

## Contributing

1. Create a feature branch.
2. Make your changes.
3. Run linting and tests.
4. Submit a pull request.

## License

This project is proprietary and confidential.
