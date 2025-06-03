interface N8nNode {
  type: string;
  parameters: Record<string, any>;
  credentials?: Record<string, any>;
}

interface N8nWorkflow {
  nodes: N8nNode[];
}

export function extractCredentials(n8nJson: string): string[] {
  try {
    const workflow: N8nWorkflow = JSON.parse(n8nJson);
    const credentials = new Set<string>();

    workflow.nodes.forEach(node => {
      if (node.credentials) {
        Object.keys(node.credentials).forEach(cred => {
          credentials.add(cred);
        });
      }
    });

    return Array.from(credentials);
  } catch (error) {
    console.error('Error extracting credentials:', error);
    return [];
  }
}

export function extractVariables(n8nJson: string): string[] {
  try {
    const workflow: N8nWorkflow = JSON.parse(n8nJson);
    const variables = new Set<string>();

    workflow.nodes.forEach(node => {
      // Extract variables from parameters
      Object.entries(node.parameters).forEach(([key, value]) => {
        if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
          const varName = value.slice(2, -2).trim();
          variables.add(varName);
        }
      });
    });

    return Array.from(variables);
  } catch (error) {
    console.error('Error extracting variables:', error);
    return [];
  }
} 