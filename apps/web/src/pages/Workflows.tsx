import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  ContentCopy as CloneIcon,
  Archive as ArchiveIcon,
  PlayArrow as RunIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { Layout } from '../components/Layout';

interface Workflow {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'archived';
  lastRun: string;
  createdAt: string;
}

const mockWorkflows: Workflow[] = [
  {
    id: '1',
    name: 'Content Processing',
    description: 'Process and optimize video content',
    status: 'active',
    lastRun: '2024-03-20 10:30',
    createdAt: '2024-03-19'
  },
  {
    id: '2',
    name: 'Asset Distribution',
    description: 'Distribute assets to CDN',
    status: 'active',
    lastRun: '2024-03-20 09:15',
    createdAt: '2024-03-18'
  },
  {
    id: '3',
    name: 'Content Review',
    description: 'Review and approve content',
    status: 'archived',
    lastRun: '2024-03-15 14:20',
    createdAt: '2024-03-10'
  }
];

export const Workflows: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [workflows, setWorkflows] = useState<Workflow[]>(mockWorkflows);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newWorkflow, setNewWorkflow] = useState({
    name: '',
    description: ''
  });

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, workflow: Workflow) => {
    setAnchorEl(event.currentTarget);
    setSelectedWorkflow(workflow);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedWorkflow(null);
  };

  const handleClone = () => {
    if (selectedWorkflow) {
      // TODO: Implement clone functionality
      enqueueSnackbar('Workflow cloned successfully', { variant: 'success' });
    }
    handleMenuClose();
  };

  const handleArchive = () => {
    if (selectedWorkflow) {
      setWorkflows((prev) =>
        prev.map((w) =>
          w.id === selectedWorkflow.id
            ? { ...w, status: w.status === 'active' ? 'archived' : 'active' }
            : w
        )
      );
      enqueueSnackbar(
        `Workflow ${selectedWorkflow.status === 'active' ? 'archived' : 'activated'} successfully`,
        { variant: 'success' }
      );
    }
    handleMenuClose();
  };

  const handleRun = () => {
    if (selectedWorkflow) {
      // TODO: Implement run functionality
      enqueueSnackbar('Workflow started successfully', { variant: 'success' });
    }
    handleMenuClose();
  };

  const handleCreateDialogOpen = () => {
    setIsCreateDialogOpen(true);
  };

  const handleCreateDialogClose = () => {
    setIsCreateDialogOpen(false);
    setNewWorkflow({ name: '', description: '' });
  };

  const handleCreateWorkflow = () => {
    if (newWorkflow.name && newWorkflow.description) {
      const workflow: Workflow = {
        id: Date.now().toString(),
        name: newWorkflow.name,
        description: newWorkflow.description,
        status: 'active',
        lastRun: '-',
        createdAt: new Date().toISOString().split('T')[0]
      };
      setWorkflows((prev) => [...prev, workflow]);
      enqueueSnackbar('Workflow created successfully', { variant: 'success' });
      handleCreateDialogClose();
    }
  };

  return (
    <Layout>
      <Box sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h4">Workflows</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateDialogOpen}
          >
            Create Workflow
          </Button>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Last Run</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {workflows.map((workflow) => (
                <TableRow key={workflow.id}>
                  <TableCell>{workflow.name}</TableCell>
                  <TableCell>{workflow.description}</TableCell>
                  <TableCell>
                    <Chip
                      label={workflow.status}
                      color={workflow.status === 'active' ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{workflow.lastRun}</TableCell>
                  <TableCell>{workflow.createdAt}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      onClick={(e) => handleMenuOpen(e, workflow)}
                      size="small"
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={handleRun}>
            <RunIcon fontSize="small" sx={{ mr: 1 }} />
            Run
          </MenuItem>
          <MenuItem onClick={handleClone}>
            <CloneIcon fontSize="small" sx={{ mr: 1 }} />
            Clone
          </MenuItem>
          <MenuItem onClick={handleArchive}>
            <ArchiveIcon fontSize="small" sx={{ mr: 1 }} />
            {selectedWorkflow?.status === 'active' ? 'Archive' : 'Activate'}
          </MenuItem>
        </Menu>

        <Dialog open={isCreateDialogOpen} onClose={handleCreateDialogClose}>
          <DialogTitle>Create New Workflow</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Name"
              fullWidth
              value={newWorkflow.name}
              onChange={(e) =>
                setNewWorkflow((prev) => ({ ...prev, name: e.target.value }))
              }
            />
            <TextField
              margin="dense"
              label="Description"
              fullWidth
              multiline
              rows={4}
              value={newWorkflow.description}
              onChange={(e) =>
                setNewWorkflow((prev) => ({ ...prev, description: e.target.value }))
              }
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCreateDialogClose}>Cancel</Button>
            <Button
              onClick={handleCreateWorkflow}
              variant="contained"
              disabled={!newWorkflow.name || !newWorkflow.description}
            >
              Create
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
};

export default Workflows; 