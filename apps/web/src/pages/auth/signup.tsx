import { useState } from 'react';
import { Form, Input, Button, Divider, message } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, GoogleOutlined, GithubOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../../hooks/useAuth';
import { logger } from '../../utils/logger';

export default function SignupPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { signup } = useAuth();

  const handleSubmit = async (values: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
  }) => {
    if (values.password !== values.confirmPassword) {
      message.error('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      await signup(values.name, values.email, values.password);
      message.success('Account created successfully');
      logger.info('User signed up successfully', { email: values.email });
      router.push('/dashboard');
    } catch (error) {
      message.error('Failed to create account');
      logger.error('Signup failed', { error, email: values.email });
    } finally {
      setLoading(false);
    }
  };

  const handleSocialSignup = (provider: 'google' | 'github') => {
    // Implement social signup
    logger.info('Social signup attempted', { provider });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Create Account</h1>
            <p className="text-gray-600 mt-2">
              Join PumpFlix and start automating your workflows
            </p>
          </div>

          <Form
            name="signup"
            onFinish={handleSubmit}
            layout="vertical"
            size="large"
          >
            <Form.Item
              name="name"
              rules={[{ required: true, message: 'Please input your name!' }]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="Full Name"
                className="rounded-lg"
              />
            </Form.Item>

            <Form.Item
              name="email"
              rules={[
                { required: true, message: 'Please input your email!' },
                { type: 'email', message: 'Please enter a valid email!' },
              ]}
            >
              <Input
                prefix={<MailOutlined />}
                placeholder="Email"
                className="rounded-lg"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[
                { required: true, message: 'Please input your password!' },
                { min: 8, message: 'Password must be at least 8 characters!' },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Password"
                className="rounded-lg"
              />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              rules={[
                { required: true, message: 'Please confirm your password!' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('Passwords do not match!'));
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Confirm Password"
                className="rounded-lg"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                className="w-full h-12 rounded-lg"
              >
                Create Account
              </Button>
            </Form.Item>
          </Form>

          <Divider className="text-gray-400">or sign up with</Divider>

          <div className="grid grid-cols-2 gap-4">
            <Button
              icon={<GoogleOutlined />}
              onClick={() => handleSocialSignup('google')}
              className="h-12 rounded-lg"
            >
              Google
            </Button>
            <Button
              icon={<GithubOutlined />}
              onClick={() => handleSocialSignup('github')}
              className="h-12 rounded-lg"
            >
              GitHub
            </Button>
          </div>

          <div className="mt-8 text-center">
            <p className="text-gray-600">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-blue-600 hover:text-blue-700">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
} 