import OpenAI from 'openai';
import { logger } from '../utils/logger';
import { AppError } from '../utils/error';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `You are an expert workflow automation specialist. Your task is to generate a workflow based on the user's description.
The workflow should be returned as a JSON object with the following structure:
{
  "nodes": [
    {
      "id": string,
      "type": "trigger" | "action",
      "name": string,
      "description": string,
      "position": { x: number, y: number },
      "data": {
        "service": string,
        "action": string,
        "config": object
      }
    }
  ],
  "edges": [
    {
      "id": string,
      "source": string,
      "target": string,
      "animated": boolean
    }
  ]
}

Ensure the workflow is logical, efficient, and follows best practices for automation.`;

export const buildWorkflowFromPrompt = async (prompt: string): Promise<any> => {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new AppError('Failed to generate workflow', 500);
    }

    // Parse the response as JSON
    const workflowJson = JSON.parse(response);

    // Validate the workflow structure
    if (!workflowJson.nodes || !workflowJson.edges) {
      throw new AppError('Invalid workflow structure generated', 500);
    }

    logger.info('Workflow generated successfully', {
      nodeCount: workflowJson.nodes.length,
      edgeCount: workflowJson.edges.length,
    });

    return workflowJson;
  } catch (error) {
    logger.error('Error generating workflow', { error });
    throw new AppError('Failed to generate workflow', 500);
  }
}; 