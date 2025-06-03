import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'PumpFlix API Documentation',
      version: '1.0.0',
      description: 'API documentation for PumpFlix workflow automation platform',
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:3000',
        description: 'API Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        WorkflowTemplate: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            description: { type: 'string' },
            sourceType: { type: 'string', enum: ['prebuilt', 'user'] },
            n8nJson: { type: 'string' },
            requiredCredentials: { type: 'array', items: { type: 'string' } },
            inputVariables: { type: 'array', items: { type: 'string' } },
            thumbnail: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        WorkflowInstance: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            templateId: { type: 'string', format: 'uuid' },
            status: { type: 'string', enum: ['pending', 'running', 'completed', 'failed'] },
            finalJson: { type: 'string', nullable: true },
            promptText: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'], // Path to the API routes
};

export const swaggerSpec = swaggerJsdoc(options); 