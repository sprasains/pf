import React, { useState } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import { useSnackbar } from 'notistack';
import Editor from '@monaco-editor/react';
import { Layout } from '../components/Layout';
import { AIMetrics } from '../components/AIMetrics';
import axios from 'axios';

interface WorkflowResponse {
  workflow: any;
  promptId: string;
}

export const AIBuilder: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workflow, setWorkflow] = useState<any>(null);
  const { enqueueSnackbar } = useSnackbar();

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setLoading(true);
    setError(null);
    setWorkflow(null);

    try {
      const response = await axios.post<WorkflowResponse>('/api/ai/generate', {
        prompt: prompt.trim()
      });

      setWorkflow(response.data.workflow);
      enqueueSnackbar('Workflow generated successfully', { variant: 'success' });
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Failed to generate workflow. Please try again.'
      );
      enqueueSnackbar('Failed to generate workflow', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!workflow) return;

    setLoading(true);
    try {
      await axios.post('/api/ai/generate-and-save', {
        prompt: prompt.trim()
      });

      enqueueSnackbar('Workflow saved successfully', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar('Failed to save workflow', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h4" gutterBottom>
            AI Workflow Builder
          </Typography>
          <Typography variant="body1" color="textSecondary" paragraph>
            Describe your workflow in natural language, and our AI will generate a complete
            workflow definition. You can then review, modify, and save it to your workflows.
          </Typography>

          <Box sx={{ mb: 4 }}>
            <AIMetrics />
          </Box>

          <Divider sx={{ my: 4 }} />

          <Box sx={{ mb: 4 }}>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Describe your workflow"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Example: Create a workflow that fetches data from Google Sheets, processes it, and sends a summary to Slack"
              error={!!error}
              helperText={error}
              disabled={loading}
            />
            <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                onClick={handleGenerate}
                disabled={loading || !prompt.trim()}
                startIcon={loading && <CircularProgress size={20} />}
              >
                Generate Workflow
              </Button>
              {workflow && (
                <Button
                  variant="outlined"
                  onClick={handleSave}
                  disabled={loading}
                >
                  Save to Workflows
                </Button>
              )}
            </Box>
          </Box>

          {workflow && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Generated Workflow
                </Typography>
                <Box sx={{ mt: 2, height: '400px' }}>
                  <Editor
                    height="100%"
                    defaultLanguage="json"
                    value={JSON.stringify(workflow, null, 2)}
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
              </CardContent>
            </Card>
          )}

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </Paper>
      </Container>
    </Layout>
  );
};

export default AIBuilder; 