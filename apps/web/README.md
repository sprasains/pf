# PumpFlix Web Application

This is the frontend application for the PumpFlix platform, built with React, TypeScript, and Material-UI.

## Features

- Modern, responsive UI with Material-UI components
- Type-safe development with TypeScript
- State management with React Context
- Form handling with React Hook Form and Zod validation
- API integration with Axios
- Authentication and authorization
- Workflow management interface
- User settings and preferences

## Prerequisites

- Node.js 18.x or later
- npm 9.x or later

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file in the root directory with the following variables:
   ```
   VITE_API_URL=http://localhost:3001
   VITE_APP_NAME=PumpFlix
   VITE_APP_VERSION=0.1.0
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build the application for production
- `npm run preview` - Preview the production build locally
- `npm run lint` - Run ESLint to check for code issues
- `npm run type-check` - Run TypeScript type checking

## Project Structure

```
src/
  ├── components/     # Reusable UI components
  ├── contexts/       # React context providers
  ├── lib/           # Utility functions and API client
  ├── pages/         # Page components
  ├── theme.ts       # Material-UI theme configuration
  ├── App.tsx        # Main application component
  └── main.tsx       # Application entry point
```

## Development Guidelines

1. **Component Structure**
   - Use functional components with hooks
   - Keep components small and focused
   - Use TypeScript interfaces for props
   - Follow Material-UI best practices

2. **State Management**
   - Use React Context for global state
   - Use local state for component-specific state
   - Implement proper error handling

3. **Styling**
   - Use Material-UI's styling solution
   - Follow the theme configuration
   - Maintain consistent spacing and typography

4. **Type Safety**
   - Define interfaces for all data structures
   - Use proper type annotations
   - Avoid using `any` type

5. **Code Quality**
   - Follow ESLint rules
   - Write meaningful comments
   - Keep code DRY and maintainable

## Contributing

1. Create a new branch for your feature
2. Make your changes
3. Run tests and linting
4. Submit a pull request

## License

This project is proprietary and confidential. 