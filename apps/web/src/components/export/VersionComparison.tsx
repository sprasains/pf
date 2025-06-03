import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  Typography,
} from '@mui/material';
import { Add as AddIcon, Remove as RemoveIcon, Edit as EditIcon } from '@mui/icons-material';

interface VersionDiff {
  version1: string;
  version2: string;
  changes: {
    schema: {
      added: string[];
      removed: string[];
      modified: Array<{
        field: string;
        oldValue: any;
        newValue: any;
      }>;
    };
    metadata: {
      changeNotes: string;
      performanceNotes?: string;
      tags: string[];
    };
  };
}

interface VersionComparisonProps {
  diff: VersionDiff;
}

export const VersionComparison: React.FC<VersionComparisonProps> = ({ diff }) => {
  const renderFieldChange = (field: string, oldValue: any, newValue: any) => {
    const isObject = typeof oldValue === 'object' && oldValue !== null;
    
    return (
      <ListItem>
        <ListItemText
          primary={field}
          secondary={
            isObject ? (
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Old Value:
                </Typography>
                <pre style={{ margin: '4px 0' }}>{JSON.stringify(oldValue, null, 2)}</pre>
                <Typography variant="caption" color="text.secondary">
                  New Value:
                </Typography>
                <pre style={{ margin: '4px 0' }}>{JSON.stringify(newValue, null, 2)}</pre>
              </Box>
            ) : (
              <Box sx={{ mt: 1 }}>
                <Typography variant="body2" color="error" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <RemoveIcon fontSize="small" />
                  {oldValue}
                </Typography>
                <Typography variant="body2" color="success.main" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AddIcon fontSize="small" />
                  {newValue}
                </Typography>
              </Box>
            )
          }
        />
      </ListItem>
    );
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Comparing Versions {diff.version1} → {diff.version2}
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" gutterBottom>
            Schema Changes
          </Typography>
          <List>
            {diff.changes.schema.added.length > 0 && (
              <>
                <ListItem>
                  <ListItemText
                    primary="Added Fields"
                    secondary={
                      <Box sx={{ mt: 1 }}>
                        {diff.changes.schema.added.map((field) => (
                          <Chip
                            key={field}
                            label={field}
                            color="success"
                            size="small"
                            icon={<AddIcon />}
                            sx={{ m: 0.5 }}
                          />
                        ))}
                      </Box>
                    }
                  />
                </ListItem>
                <Divider />
              </>
            )}

            {diff.changes.schema.removed.length > 0 && (
              <>
                <ListItem>
                  <ListItemText
                    primary="Removed Fields"
                    secondary={
                      <Box sx={{ mt: 1 }}>
                        {diff.changes.schema.removed.map((field) => (
                          <Chip
                            key={field}
                            label={field}
                            color="error"
                            size="small"
                            icon={<RemoveIcon />}
                            sx={{ m: 0.5 }}
                          />
                        ))}
                      </Box>
                    }
                  />
                </ListItem>
                <Divider />
              </>
            )}

            {diff.changes.schema.modified.length > 0 && (
              <>
                <ListItem>
                  <ListItemText
                    primary="Modified Fields"
                    secondary={
                      <Box sx={{ mt: 1 }}>
                        {diff.changes.schema.modified.map(({ field, oldValue, newValue }) => (
                          <Box key={field} sx={{ mb: 2 }}>
                            <Chip
                              label={field}
                              color="warning"
                              size="small"
                              icon={<EditIcon />}
                              sx={{ mb: 1 }}
                            />
                            {renderFieldChange(field, oldValue, newValue)}
                          </Box>
                        ))}
                      </Box>
                    }
                  />
                </ListItem>
              </>
            )}
          </List>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="subtitle1" gutterBottom>
            Metadata Changes
          </Typography>
          <List>
            <ListItem>
              <ListItemText
                primary="Change Notes"
                secondary={diff.changes.metadata.changeNotes}
              />
            </ListItem>
            <Divider />
            {diff.changes.metadata.performanceNotes && (
              <>
                <ListItem>
                  <ListItemText
                    primary="Performance Notes"
                    secondary={diff.changes.metadata.performanceNotes}
                  />
                </ListItem>
                <Divider />
              </>
            )}
            <ListItem>
              <ListItemText
                primary="Tags"
                secondary={
                  <Box sx={{ mt: 1 }}>
                    {diff.changes.metadata.tags.map((tag) => (
                      <Chip
                        key={tag}
                        label={tag}
                        size="small"
                        sx={{ m: 0.5 }}
                      />
                    ))}
                  </Box>
                }
              />
            </ListItem>
          </List>
        </CardContent>
      </Card>
    </Box>
  );
}; 