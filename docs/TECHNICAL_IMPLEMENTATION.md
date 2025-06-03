# PumpFlix Technical Implementation Guide

## Development Setup

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- Docker and Docker Compose

### Local Development

1. **Clone and Install Dependencies**
```bash
git clone https://github.com/your-org/pumpflix.git
cd pumpflix
npm install
```

2. **Environment Setup**
```bash
# Copy example env files
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# Update environment variables
```

3. **Database Setup**
```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed database (optional)
npm run db:seed
```

4. **Start Development Servers**
```bash
# Start all services
npm run dev

# Or start individual services
npm run dev:api
npm run dev:web
```

## Template Caching Implementation

### Redis Cache Service

The `CacheService` implements a singleton pattern to manage Redis connections:

```typescript
// apps/api/src/services/cache.ts
export class CacheService {
  private static instance: CacheService;
  private client: Redis;

  private constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL,
    });
  }

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }
}
```

### Cache Operations

1. **Template Caching**
```typescript
async cacheTemplate(template: WorkflowTemplate, type: 'prebuilt' | 'user') {
  const templateKey = this.getTemplateKey(template.id);
  const listKey = this.getTemplatesListKey(type);

  // Set template with expiration
  await this.client.set(
    templateKey,
    JSON.stringify(template),
    { EX: type === 'prebuilt' ? CACHE_EXPIRY.PREBUILT : CACHE_EXPIRY.USER_GENERATED }
  );

  // Add to list if not exists
  const exists = await this.client.lPos(listKey, template.id);
  if (exists === null) {
    await this.client.lPush(listKey, template.id);
  }
}
```

2. **Cache Invalidation**
```typescript
async invalidateTemplate(id: string) {
  const templateKey = this.getTemplateKey(id);
  await this.client.del(templateKey);

  // Remove from both lists
  await this.client.lRem(this.getTemplatesListKey('prebuilt'), 0, id);
  await this.client.lRem(this.getTemplatesListKey('user'), 0, id);
}
```

## Workflow Template System

### Template Service

The `WorkflowTemplateService` handles template operations with caching:

```typescript
// apps/api/src/services/workflowTemplate.ts
export class WorkflowTemplateService {
  private cache: CacheService;

  constructor() {
    this.cache = CacheService.getInstance();
  }

  async getTemplates(type: 'prebuilt' | 'user'): Promise<WorkflowTemplate[]> {
    // Try cache first
    const cached = await this.cache.getCachedTemplates(type);
    if (cached.length > 0) return cached;

    // Fallback to database
    const templates = await prisma.workflowTemplate.findMany({
      where: { sourceType: type },
      orderBy: { createdAt: 'desc' },
    });

    // Cache results
    await this.cache.cacheTemplates(templates, type);
    return templates;
  }
}
```

### Template Promotion

The template promotion process:

```typescript
async promoteInstanceToTemplate(
  instanceId: string,
  data: {
    name: string;
    description: string;
    thumbnail?: string;
  }
): Promise<WorkflowTemplate> {
  // Get instance with template
  const instance = await prisma.workflowInstance.findUnique({
    where: { id: instanceId },
    include: { template: true },
  });

  // Extract workflow data
  const n8nJson = instance.finalJson || instance.template.n8nJson;
  const requiredCredentials = extractCredentials(n8nJson);
  const inputVariables = extractVariables(n8nJson);

  // Create new template
  return this.createTemplate({
    sourceType: 'user',
    name: data.name,
    description: data.description,
    thumbnail: data.thumbnail,
    n8nJson,
    requiredCredentials,
    inputVariables,
  });
}
```

## Frontend Implementation

### Workflow Detail Component

The workflow detail component with template promotion:

```typescript
// apps/web/src/components/WorkflowDetail.tsx
export const WorkflowDetail: React.FC = () => {
  const { workflow, status, logs } = useWorkflowExecution();
  const [saveModalOpen, setSaveModalOpen] = useState(false);

  const handleSaveTemplate = async (data: {
    name: string;
    description: string;
    thumbnail?: string;
  }) => {
    try {
      await api.post(`/api/workflow-templates/promote/${workflow.id}`, data);
      // Handle success
    } catch (error) {
      // Handle error
    }
  };

  return (
    <div>
      <Button
        variant="contained"
        color="primary"
        onClick={() => setSaveModalOpen(true)}
      >
        Save as Template
      </Button>

      <SaveTemplateModal
        open={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        onSave={handleSaveTemplate}
      />
    </div>
  );
};
```

## API Routes

### Template Routes

```typescript
// apps/api/src/routes/workflowTemplate.ts
router.post(
  '/promote/:instanceId',
  isAuthenticated,
  [
    body('name').trim().notEmpty(),
    body('description').trim().notEmpty(),
    body('thumbnail').optional().isURL(),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { instanceId } = req.params;
      const { name, description, thumbnail } = req.body;

      const template = await templateService.promoteInstanceToTemplate(
        instanceId,
        { name, description, thumbnail }
      );

      res.status(201).json(template);
    } catch (error) {
      res.status(500).json({ error: 'Failed to promote instance to template' });
    }
  }
);
```

## Testing

### Unit Tests

```typescript
// apps/api/src/services/__tests__/workflowTemplate.test.ts
describe('WorkflowTemplateService', () => {
  let service: WorkflowTemplateService;
  let cache: CacheService;

  beforeEach(() => {
    cache = CacheService.getInstance();
    service = new WorkflowTemplateService();
  });

  it('should promote instance to template', async () => {
    const instance = await createTestInstance();
    const template = await service.promoteInstanceToTemplate(instance.id, {
      name: 'Test Template',
      description: 'Test Description',
    });

    expect(template.sourceType).toBe('user');
    expect(template.name).toBe('Test Template');
  });
});
```

## Deployment

### Docker Deployment

1. **Build Images**
```bash
docker-compose build
```

2. **Start Services**
```bash
docker-compose up -d
```

3. **Run Migrations**
```bash
docker-compose exec api npm run migrate
```

### Environment Variables

Required environment variables for deployment:

```env
# Node Environment
NODE_ENV=production

# Database
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/pumpflix

# Redis
REDIS_URL=redis://redis:6379

# Session
SESSION_SECRET=your-session-secret

# OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
FB_CLIENT_ID=your-facebook-client-id
FB_CLIENT_SECRET=your-facebook-client-secret

# n8n
N8N_URL=http://localhost:5678
N8N_API_KEY=your-n8n-api-key
```

## Monitoring

### Cache Monitoring

Monitor Redis cache performance:

```typescript
// apps/api/src/utils/monitoring.ts
export async function getCacheMetrics() {
  const client = CacheService.getInstance().getClient();
  
  return {
    hitRate: await client.get('cache:hits') / await client.get('cache:total'),
    size: await client.dbsize(),
    memory: await client.info('memory'),
  };
}
```

### Application Monitoring

Use Winston for structured logging:

```typescript
// apps/api/src/utils/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});
``` 