import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StarOutlined, FireOutlined, RocketOutlined } from '@ant-design/icons';
import { logger } from '../../utils/logger';

interface Template {
  id: string;
  title: string;
  description: string;
  category: string;
  popularity: number;
  gradient: string;
  icon: string;
}

const templates: Template[] = [
  {
    id: '1',
    title: 'Lead Capture Automation',
    description: 'Automatically capture and process leads from your website',
    category: 'Sales',
    popularity: 95,
    gradient: 'from-blue-500 to-purple-500',
    icon: '🎯',
  },
  {
    id: '2',
    title: 'Social Media Scheduler',
    description: 'Schedule and automate your social media posts',
    category: 'Marketing',
    popularity: 88,
    gradient: 'from-green-500 to-teal-500',
    icon: '📱',
  },
  {
    id: '3',
    title: 'Customer Onboarding',
    description: 'Streamline your customer onboarding process',
    category: 'CRM',
    popularity: 92,
    gradient: 'from-orange-500 to-red-500',
    icon: '🚀',
  },
  // Add more templates as needed
];

const categories = ['All', 'Sales', 'Marketing', 'CRM'];

const TemplatesGallery = () => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [hoveredTemplate, setHoveredTemplate] = useState<string | null>(null);

  const filteredTemplates = templates.filter(
    (template) => selectedCategory === 'All' || template.category === selectedCategory
  );

  const handleTemplateClick = (templateId: string) => {
    logger.info('Template selected', { templateId });
    // Handle template selection
  };

  return (
    <div className="relative min-h-[600px] bg-gradient-to-br from-primary-50 to-secondary-50 rounded-2xl p-6 shadow-soft overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-24 -left-24 w-48 h-48 bg-primary-200 rounded-full opacity-20"
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute -bottom-24 -right-24 w-48 h-48 bg-secondary-200 rounded-full opacity-20"
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [90, 0, 90],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      <div className="relative">
        {/* Category filters */}
        <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
          {categories.map((category) => (
            <motion.button
              key={category}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedCategory === category
                  ? 'bg-primary-600 text-white shadow-soft'
                  : 'bg-white text-gray-600 hover:bg-primary-50'
              }`}
            >
              {category}
            </motion.button>
          ))}
        </div>

        {/* Templates grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="wait">
            {filteredTemplates.map((template) => (
              <motion.div
                key={template.id}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                whileHover={{ scale: 1.02, y: -5 }}
                onHoverStart={() => setHoveredTemplate(template.id)}
                onHoverEnd={() => setHoveredTemplate(null)}
                onClick={() => handleTemplateClick(template.id)}
                className="relative group cursor-pointer"
              >
                <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl blur-xl" />
                <div className="relative bg-white rounded-2xl p-6 shadow-soft overflow-hidden">
                  {/* Template icon */}
                  <motion.div
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.5 }}
                    className="w-12 h-12 bg-gradient-to-br from-primary-100 to-secondary-100 rounded-xl flex items-center justify-center mb-4"
                  >
                    <span className="text-2xl">{template.icon}</span>
                  </motion.div>

                  {/* Template content */}
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {template.title}
                  </h3>
                  <p className="text-gray-600 mb-4">{template.description}</p>

                  {/* Popularity indicator */}
                  <div className="flex items-center gap-2">
                    <motion.div
                      animate={{
                        scale: hoveredTemplate === template.id ? [1, 1.2, 1] : 1,
                      }}
                      transition={{ duration: 0.5 }}
                    >
                      <FireOutlined className="text-orange-500" />
                    </motion.div>
                    <span className="text-sm text-gray-500">
                      {template.popularity}% popular
                    </span>
                  </div>

                  {/* Category badge */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="absolute top-4 right-4 px-3 py-1 bg-primary-100 text-primary-600 rounded-full text-sm font-medium"
                  >
                    {template.category}
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default TemplatesGallery; 