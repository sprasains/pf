import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SendOutlined, RobotOutlined, LoadingOutlined } from '@ant-design/icons';
import { logger } from '../../utils/logger';

interface Node {
  id: string;
  type: string;
  position: { x: number; y: number };
  icon?: string;
}

const AIWorkflowGenerator = () => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [showBrain, setShowBrain] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setShowBrain(true);
    logger.info('Starting workflow generation', { prompt });

    try {
      // Simulate AI generation with animation
      const newNodes: Node[] = [
        { id: 'form', type: 'Form', position: { x: 100, y: 100 }, icon: '📝' },
        { id: 'ai', type: 'AI Brain', position: { x: 300, y: 100 }, icon: '🧠' },
        { id: 'slack', type: 'Slack', position: { x: 500, y: 100 }, icon: '💬' },
      ];

      // Animate nodes appearing one by one
      for (let i = 0; i < newNodes.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        setNodes(prev => [...prev, newNodes[i]]);
      }

      logger.info('Workflow generated successfully');
    } catch (error) {
      logger.error('Failed to generate workflow', error as Error);
    } finally {
      setIsGenerating(false);
      setShowBrain(false);
    }
  };

  return (
    <div className="relative min-h-[500px] bg-gradient-to-br from-primary-50 to-secondary-50 rounded-2xl p-6 shadow-soft overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
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

      <div className="max-w-2xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative"
        >
          {/* Animated Bubble Input */}
          <motion.div
            className={`w-full rounded-xl shadow-soft transition-all duration-300 ${isInputFocused ? 'shadow-glow' : ''}`}
            whileHover={{ boxShadow: '0 0 15px rgba(14,165,233,0.2)' }}
          >
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setIsInputFocused(false)}
              placeholder="Describe your automation workflow..."
              className="w-full px-6 py-4 pr-12 bg-white rounded-xl outline-none transition-all duration-300"
            />
          </motion.div>

          <motion.button
            whileHover={{ scale: 1.05, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleGenerate}
            disabled={isGenerating}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary-600 text-white p-2 rounded-lg disabled:opacity-50"
          >
            {isGenerating ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <LoadingOutlined className="text-xl" />
              </motion.div>
            ) : (
              <SendOutlined className="text-xl" />
            )}
          </motion.button>
        </motion.div>

        <div className="relative h-[300px] mt-8">
          {/* AI Brain animation */}
          <AnimatePresence>
            {showBrain && (
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              >
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    rotate: [0, 360],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center"
                >
                  <RobotOutlined className="text-primary-600 text-2xl" />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Workflow nodes */}
          <AnimatePresence>
            {nodes.map((node) => (
              <motion.div
                key={node.id}
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -20 }}
                whileHover={{ scale: 1.05, y: -5 }}
                className="absolute"
                style={{
                  left: node.position.x,
                  top: node.position.y,
                }}
              >
                <motion.div
                  whileHover={{ boxShadow: '0 0 20px rgba(14,165,233,0.3)' }}
                  className="bg-white rounded-xl p-4 shadow-soft flex items-center gap-3"
                >
                  <motion.div
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.5 }}
                    className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center"
                  >
                    <span className="text-primary-600 text-xl">{node.icon}</span>
                  </motion.div>
                  <span className="font-medium">{node.type}</span>
                </motion.div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Connection lines */}
          {nodes.length > 1 && (
            <svg className="absolute inset-0 w-full h-full">
              {nodes.slice(0, -1).map((node, index) => {
                const nextNode = nodes[index + 1];
                return (
                  <motion.path
                    key={`${node.id}-${nextNode.id}`}
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 0.5, delay: index * 0.5 }}
                    d={`M ${node.position.x + 100} ${node.position.y + 20} 
                        C ${(node.position.x + nextNode.position.x) / 2} ${node.position.y + 20},
                          ${(node.position.x + nextNode.position.x) / 2} ${nextNode.position.y + 20},
                          ${nextNode.position.x} ${nextNode.position.y + 20}`}
                    stroke="rgba(59, 130, 246, 0.5)"
                    strokeWidth="2"
                    fill="none"
                    className="animate-pulse"
                  />
                );
              })}
            </svg>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIWorkflowGenerator; 