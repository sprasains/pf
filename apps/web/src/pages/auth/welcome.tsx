import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/router';
import { GoogleOutlined, MailOutlined } from '@ant-design/icons';
import { logger } from '../../utils/logger';
import Particles from 'react-tsparticles';
import { loadFull } from 'tsparticles';

const WelcomeScreen = () => {
  const router = useRouter();

  const handleGoogleLogin = () => {
    logger.info('Google login initiated');
    // Implement Google OAuth
  };

  const handleEmailLogin = () => {
    logger.info('Email login initiated');
    router.push('/auth/login');
  };

  const particlesInit = async (engine: any) => {
    await loadFull(engine);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500 via-secondary-500 to-primary-700 animate-gradient-xy">
      <Particles
        id="tsparticles"
        init={particlesInit}
        options={{
          particles: {
            number: { value: 80, density: { enable: true, value_area: 800 } },
            color: { value: '#ffffff' },
            opacity: { value: 0.5, random: true },
            size: { value: 3, random: true },
            line_linked: {
              enable: true,
              distance: 150,
              color: '#ffffff',
              opacity: 0.2,
              width: 1
            },
            move: {
              enable: true,
              speed: 2,
              direction: 'none',
              random: true,
              straight: false,
              out_mode: 'out',
              bounce: false,
            }
          },
          interactivity: {
            detect_on: 'canvas',
            events: {
              onhover: { enable: true, mode: 'repulse' },
              onclick: { enable: true, mode: 'push' },
              resize: true
            },
          },
          retina_detect: true
        }}
        className="absolute inset-0"
      />
      
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
      
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-soft"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-center mb-8"
            >
              <motion.h1 
                className="text-4xl font-bold text-white mb-2"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                Welcome to PumpFlix
              </motion.h1>
              <motion.p 
                className="text-white/80"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                Automate your workflows with AI-powered automation
              </motion.p>
            </motion.div>

            <div className="space-y-4">
              <motion.button
                whileHover={{ scale: 1.02, boxShadow: '0 0 20px rgba(255,255,255,0.3)' }}
                whileTap={{ scale: 0.98 }}
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 bg-white text-gray-800 rounded-xl px-6 py-3 font-medium shadow-soft hover:shadow-glow transition-all duration-300"
              >
                <motion.div
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.5 }}
                >
                  <GoogleOutlined className="text-xl" />
                </motion.div>
                Continue with Google
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02, boxShadow: '0 0 20px rgba(14,165,233,0.3)' }}
                whileTap={{ scale: 0.98 }}
                onClick={handleEmailLogin}
                className="w-full flex items-center justify-center gap-3 bg-primary-600 text-white rounded-xl px-6 py-3 font-medium shadow-soft hover:shadow-glow transition-all duration-300"
              >
                <motion.div
                  whileHover={{ y: -2 }}
                  transition={{ duration: 0.2 }}
                >
                  <MailOutlined className="text-xl" />
                </motion.div>
                Sign in with Email
              </motion.button>
            </div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-center text-white/60 mt-8 text-sm"
            >
              By continuing, you agree to our Terms of Service and Privacy Policy
            </motion.p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default WelcomeScreen; 