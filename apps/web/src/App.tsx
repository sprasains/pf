import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { SnackbarProvider } from 'notistack';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { theme } from './theme';
import { CircularProgress, Box } from '@mui/material';

// Lazy load pages
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Workflows = React.lazy(() => import('./pages/Workflows'));
const Settings = React.lazy(() => import('./pages/Settings'));
const Credentials = React.lazy(() => import('./pages/Credentials'));
const AIBuilder = React.lazy(() => import('./pages/AIBuilder'));
const AIPrompts = React.lazy(() => import('./pages/AIPrompts'));

const LoadingFallback = () => (
  <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
    <CircularProgress />
  </Box>
);

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SnackbarProvider maxSnack={3}>
        <AuthProvider>
          <Router>
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/workflows"
                  element={
                    <ProtectedRoute>
                      <Workflows />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <Settings />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/credentials"
                  element={
                    <ProtectedRoute>
                      <Credentials />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/ai-builder"
                  element={
                    <ProtectedRoute>
                      <AIBuilder />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/ai-prompts"
                  element={
                    <ProtectedRoute>
                      <AIPrompts />
                    </ProtectedRoute>
                  }
                />
                <Route path="/" element={<Login />} />
              </Routes>
            </Suspense>
          </Router>
        </AuthProvider>
      </SnackbarProvider>
    </ThemeProvider>
  );
}

export default App; 