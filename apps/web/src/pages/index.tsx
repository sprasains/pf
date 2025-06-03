import { Button } from 'antd';
import { motion } from 'framer-motion';
import { useRouter } from 'next/router';
import { ArrowRightOutlined, RocketOutlined, CodeOutlined, TeamOutlined } from '@ant-design/icons';

const features = [
  {
    icon: <RocketOutlined className="text-4xl text-blue-500" />,
    title: 'Powerful Automation',
    description: 'Create complex workflows with our intuitive drag-and-drop interface.',
  },
  {
    icon: <CodeOutlined className="text-4xl text-green-500" />,
    title: 'Developer Friendly',
    description: 'Extend workflows with custom code and integrate with any API.',
  },
  {
    icon: <TeamOutlined className="text-4xl text-purple-500" />,
    title: 'Team Collaboration',
    description: 'Work together in real-time with built-in version control.',
  },
];

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="container mx-auto px-6 py-20"
      >
        <div className="text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-5xl md:text-6xl font-bold text-gray-900 mb-8"
          >
            Automate Your Workflows
            <br />
            <span className="text-blue-600">Without the Complexity</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto"
          >
            PumpFlix helps you build, deploy, and monitor automated workflows
            with a beautiful, intuitive interface.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Button
              type="primary"
              size="large"
              onClick={() => router.push('/auth/signup')}
              className="h-12 px-8 text-lg"
            >
              Get Started
              <ArrowRightOutlined />
            </Button>
            <Button
              size="large"
              onClick={() => router.push('/auth/login')}
              className="h-12 px-8 text-lg"
            >
              Sign In
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {/* Features Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="container mx-auto px-6 py-20"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 * index }}
              className="text-center p-8 rounded-lg bg-white shadow-lg hover:shadow-xl transition-shadow"
            >
              <div className="mb-6">{feature.icon}</div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                {feature.title}
              </h3>
              <p className="text-gray-600">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* CTA Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="bg-blue-600 text-white py-20"
      >
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-8">
            Ready to Transform Your Workflows?
          </h2>
          <Button
            type="primary"
            size="large"
            onClick={() => router.push('/auth/signup')}
            className="h-12 px-8 text-lg bg-white text-blue-600 hover:bg-gray-100"
          >
            Start Free Trial
            <ArrowRightOutlined />
          </Button>
        </div>
      </motion.div>
    </div>
  );
} 