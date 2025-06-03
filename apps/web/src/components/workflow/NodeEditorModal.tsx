import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box, TextField, Select, MenuItem, FormControl, InputLabel } from '@mui/material';

interface NodeEditorModalProps {
  open: boolean;
  onClose: () => void;
  nodeType: string;
  // You can add more props here to pass node data to the modal
}

const NodeEditorModal: React.FC<NodeEditorModalProps> = ({
  open, onClose, nodeType
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{`Edit ${nodeType} Node`}</DialogTitle>
      <DialogContent>
        <Box sx={{ my: 2 }}>
          <Typography variant="body1" gutterBottom>
            {`Configure settings for the ${nodeType} node here.`}
          </Typography>
          {/* Add specific form fields for each node type here */}
          {/* You might want to render different content based on nodeType */}
          {nodeType === 'Slack' && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>Slack Configuration</Typography>
              <TextField
                label="Slack Channel"
                fullWidth
                margin="normal"
                // Add value and onChange handlers
              />
              <TextField
                label="Message Text"
                fullWidth
                margin="normal"
                multiline
                rows={4}
                // Add value and onChange handlers
              />
            </Box>
          )}
          {nodeType === 'Email' && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>Email Configuration</Typography>
              <TextField
                label="To Email Address"
                fullWidth
                margin="normal"
                // Add value and onChange handlers
              />
              <TextField
                label="Subject"
                fullWidth
                margin="normal"
                // Add value and onChange handlers
              />
              <TextField
                label="Email Body"
                fullWidth
                margin="normal"
                multiline
                rows={4}
                // Add value and onChange handlers
              />
            </Box>
          )}
          {nodeType === 'Sheets' && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>Sheets Configuration</Typography>
              <TextField
                label="Spreadsheet ID"
                fullWidth
                margin="normal"
                // Add value and onChange handlers
              />
              <TextField
                label="Sheet Name"
                fullWidth
                margin="normal"
                // Add value and onChange handlers
              />
              <FormControl fullWidth margin="normal">
                <InputLabel>Operation</InputLabel>
                <Select
                  label="Operation"
                  // Add value and onChange handlers
                >
                  <MenuItem value="read">Read</MenuItem>
                  <MenuItem value="write">Write</MenuItem>
                  <MenuItem value="append">Append</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Range (e.g., A1:C10)"
                fullWidth
                margin="normal"
                // Add value and onChange handlers
              />
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onClose} variant="contained">Save</Button>
      </DialogActions>
    </Dialog>
  );
};

export default NodeEditorModal; 