# PumpFlix Quick Start Guide

## Prerequisites

- Node.js 20+
- Docker and Docker Compose
- PostgreSQL 14+
- Redis 6+
- n8n (automatically installed via Docker)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-org/pumpflix
   cd pumpflix
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your configuration:
   ```env
   # Database
   DATABASE_URL=postgresql://user:pass@localhost:5432/pumpflix
   
   # Redis
   REDIS_URL=redis://localhost:6379
   
   # n8n
   N8N_URL=http://localhost:5678
   
   # Auth
   JWT_SECRET=your-secret-key
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   
   # Monitoring
   PROMETHEUS_PORT=9090
   GRAFANA_PORT=3001
   ```

4. Start the development environment:
   ```bash
   docker-compose up -d
   npm run dev
   ```

## Development Workflow

### Backend Development

1. API Routes:
   ```typescript
   // apps/api/src/routes/workflow.ts
   import { Router } from 'express';
   import { cacheFetch } from '../utils/cache';
   
   const router = Router();
   
   router.get('/:id', async (req, res) => {
     const workflow = await cacheFetch(
       `workflow:${req.params.id}`,
       () => prisma.workflow.findUnique({ where: { id: req.params.id } })
     );
     res.json(workflow);
   });
   ```

2. Background Jobs:
   ```typescript
   // apps/api/src/jobs/queue.ts
   import { Queue } from 'bullmq';
   
   export const workflowQueue = new Queue('workflows', {
     connection: redis,
     defaultJobOptions: {
       attempts: 3,
       backoff: { type: 'exponential', delay: 1000 },
     },
   });
   ```

3. Rate Limiting:
   ```typescript
   // apps/api/src/middleware/rateLimit.ts
   import { rateLimit } from 'express-rate-limit';
   
   app.use('/api/', rateLimit({
     windowMs: 15 * 60 * 1000,
     max: 100,
   }));
   ```

### Frontend Development

1. Performance Hooks:
   ```typescript
   // apps/web/src/hooks/usePerformance.ts
   import { useVirtualization, useDebounce } from '../utils/performance';
   
   export function useWorkflowList(workflows) {
     const { visibleItems } = useVirtualization(workflows, 50, 600);
     const debouncedSearch = useDebounce(search, 300);
     return { visibleItems, debouncedSearch };
   }
   ```

2. Lazy Loading:
   ```typescript
   // apps/web/src/components/Dashboard.tsx
   import { lazy } from 'react';
   
   const WorkflowEditor = lazy(() => import('./WorkflowEditor'));
   const Analytics = lazy(() => import('./Analytics'));
   ```

## Testing

1. Unit Tests:
   ```bash
   npm run test
   ```

2. Performance Tests:
   ```bash
   npm run test:perf
   ```

3. Load Testing:
   ```bash
   npm run test:load
   ```

## Monitoring

1. Access Grafana Dashboard:
   ```
   http://localhost:3001
   ```

2. View Prometheus Metrics:
   ```
   http://localhost:9090/metrics
   ```

3. Check Health Status:
   ```
   http://localhost:3000/health
   ```

## Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Start production servers:
   ```bash
   npm run start
   ```

3. Monitor the application:
   ```bash
   npm run monitor
   ```

## Common Tasks

### Adding a New Integration

1. Create integration schema:
   ```typescript
   // apps/api/src/schemas/integration.ts
   export const integrationSchema = z.object({
     name: z.string(),
     type: z.enum(['GOOGLE', 'SLACK', 'STRIPE']),
     credentials: z.record(z.string()),
   });
   ```

2. Add integration routes:
   ```typescript
   // apps/api/src/routes/integration.ts
   router.post('/', async (req, res) => {
     const integration = await prisma.integration.create({
       data: req.body,
     });
     res.json(integration);
   });
   ```

3. Update frontend components:
   ```typescript
   // apps/web/src/components/IntegrationForm.tsx
   const IntegrationForm = () => {
     // Form implementation
   };
   ```

### Adding a New Workflow Type

1. Define workflow schema:
   ```typescript
   // apps/api/src/schemas/workflow.ts
   export const workflowSchema = z.object({
     name: z.string(),
     type: z.enum(['AUTOMATION', 'INTEGRATION', 'CUSTOM']),
     nodes: z.array(z.any()),
     edges: z.array(z.any()),
   });
   ```

2. Add workflow processor:
   ```typescript
   // apps/api/src/jobs/processors/workflow.ts
   export async function processWorkflow(workflow) {
     // Workflow processing logic
   }
   ```

3. Update UI components:
   ```typescript
   // apps/web/src/components/WorkflowBuilder.tsx
   const WorkflowBuilder = () => {
     // Builder implementation
   };
   ```

## Troubleshooting

### Common Issues

1. **Redis Connection Issues**
   ```bash
   # Check Redis connection
   redis-cli ping
   ```

2. **Database Connection Issues**
   ```bash
   # Check database connection
   psql -U user -d pumpflix -c "SELECT 1"
   ```

3. **n8n Connection Issues**
   ```bash
   # Check n8n status
   curl http://localhost:5678/health
   ```

### Logs

1. View application logs:
   ```bash
   npm run logs
   ```

2. View Docker logs:
   ```bash
   docker-compose logs -f
   ```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## Support

- Documentation: `/docs`
- Issues: GitHub Issues
- Slack: #pumpflix-dev
- Email: support@pumpflix.com 