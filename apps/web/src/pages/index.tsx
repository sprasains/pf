import { Button } from 'antd';
import { motion } from 'framer-motion';
import { useRouter } from 'next/router';
import { ArrowRightOutlined, RocketOutlined, CodeOutlined, TeamOutlined } from '@ant-design/icons';
import { useEffect } from 'react';

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

  useEffect(() => {
    router.push('/dashboard');
  }, [router]);

  return null; // Render nothing on the landing page, as it will redirect
} 