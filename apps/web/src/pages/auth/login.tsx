import { useState } from 'react';
import { message } from 'antd';
import { motion } from 'framer-motion';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../../hooks/useAuth';
import { logger } from '../../utils/logger';
import { TextField, Box, Typography, Paper, Button } from '@mui/material';
import { Google as GoogleIcon, GitHub as GithubIcon, Facebook as FacebookIcon } from '@mui/icons-material';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setLoading(true);
      await login(email, password);
      message.success('Login successful');
      logger.info('User logged in successfully', { email });
      router.push('/dashboard');
    } catch (error) {
      message.error('Invalid email or password');
      logger.error('Login failed', { error, email });
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = (provider: 'google' | 'github' | 'facebook' | 'test') => {
    // Implement social login
    logger.info('Social login attempted', { provider });
    // Add your social login logic here
    if (provider === 'test') {
      // Logic for test user login
      message.info('Test user login attempted');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Paper elevation={6} className="rounded-lg p-8">
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom sx={{ color: '#333' }}>
              Welcome Back
            </Typography>
            <Typography variant="body1" sx={{ color: '#555' }}>
              Sign in to your PumpFlix account
            </Typography>
          </Box>

          <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{
                mt: 3,
                mb: 2,
                py: 1.5,
                borderRadius: '8px',
                background: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
                boxShadow: '0 3px 5px 2px rgba(255, 105, 135, .3)',
              }}
              component='button'
              disabled={loading}
            >
              Sign In
            </Button>
          </Box>

          <Box sx={{ my: 2 }}>
            <Typography variant="body2" align="center" sx={{ color: '#777' }}>
              or continue with
            </Typography>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 2 }}>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<GoogleIcon />}
              sx={{ mt: 1, textTransform: 'none' }}
              onClick={() => handleSocialLogin('google')}
              component='button'
            >
              Sign in with Google
            </Button>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<GithubIcon />}
              onClick={() => handleSocialLogin('github')}
              sx={{
                py: 1.5,
                borderRadius: '8px',
                borderColor: '#333',
                color: '#333',
                '&:hover': { borderColor: '#333', opacity: 0.8 },
                boxShadow: '0 3px 5px 2px rgba(51, 51, 51, .2)',
                transform: 'translateY(0)',
                transition: 'transform 0.2s ease-in-out, boxShadow 0.2s ease-in-out',
                '&:active': { transform: 'translateY(2px)', boxShadow: '0 1px 3px 1px rgba(51, 51, 51, .2)' },
              }}
            >
              GitHub
            </Button>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<FacebookIcon />}
              onClick={() => handleSocialLogin('facebook')}
              sx={{
                py: 1.5,
                borderRadius: '8px',
                borderColor: '#4267B2',
                color: '#4267B2',
                '&:hover': { borderColor: '#4267B2', opacity: 0.8 },
                boxShadow: '0 3px 5px 2px rgba(66, 103, 178, .2)',
                transform: 'translateY(0)',
                transition: 'transform 0.2s ease-in-out, boxShadow 0.2s ease-in-out',
                '&:active': { transform: 'translateY(2px)', boxShadow: '0 1px 3px 1px rgba(66, 103, 178, .2)' },
              }}
            >
              Facebook
            </Button>
             <Button
              variant="outlined"
              fullWidth
              onClick={() => handleSocialLogin('test')}
              sx={{
                py: 1.5,
                borderRadius: '8px',
                 borderColor: '#ff9800',
                color: '#ff9800',
                '&:hover': { borderColor: '#ff9800', opacity: 0.8 },
                boxShadow: '0 3px 5px 2px rgba(255, 152, 0, .2)',
                transform: 'translateY(0)',
                transition: 'transform 0.2s ease-in-out, boxShadow 0.2s ease-in-out',
                '&:active': { transform: 'translateY(2px)', boxShadow: '0 1px 3px 1px rgba(255, 152, 0, .2)' },
              }}
            >
              Test User
            </Button>
          </Box>

          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: '#666' }}>
              Don't have an account?{' '}
              <Link href="/auth/signup" passHref>
                <Typography component="a" variant="body2" sx={{ color: '#0288d1', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                  Sign up
                </Typography>
              </Link>
            </Typography>
          </Box>
        </Paper>
      </motion.div>
    </div>
  );
} 