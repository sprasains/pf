import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  CircularProgress,
  Alert
} from '@mui/material';
import { Visibility as VisibilityIcon } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import Editor from '@monaco-editor/react';
import { Layout } from '../components/Layout';
import axios from 'axios';

interface AIPrompt {
  id: string;
  promptText: string;
  responseJson: any;
  createdAt: string;
  model: string;
}

export const AIPrompts: React.FC = () => {
  const [prompts, setPrompts] = useState<AIPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<AIPrompt | null>(null);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    fetchPrompts();
  }, []);

  const fetchPrompts = async () => {
    try {
      const response = await axios.get<AIPrompt[]>('/api/ai/prompts');
      setPrompts(response.data);
    } catch (error) {
      setError('Failed to fetch prompts');
      enqueueSnackbar('Failed to fetch prompts', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleViewPrompt = (prompt: AIPrompt) => {
    setSelectedPrompt(prompt);
  };

  if (loading) {
    return (
      <Layout>
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress />
          </Box>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h4" gutterBottom>
            AI Workflow Prompts History
          </Typography>
          <Typography variant="body1" color="textSecondary" paragraph>
            View your past AI workflow generation prompts and their results.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Prompt</TableCell>
                  <TableCell>Created At</TableCell>
                  <TableCell>Model</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {prompts.map((prompt) => (
                  <TableRow key={prompt.id}>
                    <TableCell>{prompt.promptText}</TableCell>
                    <TableCell>
                      {new Date(prompt.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Chip label={prompt.model} size="small" />
                    </TableCell>
                    <TableCell>
                      <IconButton
                        onClick={() => handleViewPrompt(prompt)}
                        size="small"
                      >
                        <VisibilityIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {selectedPrompt && (
            <Box sx={{ mt: 4 }}>
              <Typography variant="h6" gutterBottom>
                Generated Workflow
              </Typography>
              <Paper sx={{ p: 2, bgcolor: '#1e1e1e' }}>
                <Box sx={{ height: '400px' }}>
                  <Editor
                    height="100%"
                    defaultLanguage="json"
                    value={JSON.stringify(selectedPrompt.responseJson, null, 2)}
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      fontSize: 14,
                      lineNumbers: 'on',
                      folding: true,
                      wordWrap: 'on'
                    }}
                    theme="vs-dark"
                  />
                </Box>
              </Paper>
            </Box>
          )}
        </Paper>
      </Container>
    </Layout>
  );
};

export default AIPrompts; 