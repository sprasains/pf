# PumpFlix Architecture Documentation

## Overview

PumpFlix is a SaaS platform that provides workflow automation capabilities through a unified interface. The system is built using a modern tech stack with a focus on scalability, maintainability, and user experience.

## System Architecture

### Core Components

1. **Frontend (React + TypeScript)**
   - Next.js-based web application
   - Material-UI for component library
   - React Query for data fetching
   - Context API for state management

2. **Backend (Node.js + TypeScript)**
   - Express.js REST API
   - Prisma ORM for database operations
   - Redis for caching
   - Passport.js for authentication

3. **Database**
   - PostgreSQL for primary data storage
   - Redis for caching and session management

4. **Workflow Engine**
   - n8n for workflow execution
   - Custom workflow builder interface
   - Template management system

### Infrastructure

```mermaid
graph TD
    A[Client] --> B[Next.js Frontend]
    B --> C[Express API]
    C --> D[PostgreSQL]
    C --> E[Redis Cache]
    C --> F[n8n Workflow Engine]
    F --> G[External Services]
```

## Technical Implementation

### 1. Template Caching System

#### Redis Cache Service
```typescript
class CacheService {
  private client: Redis;
  private static instance: CacheService;

  // Singleton pattern for Redis client
  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }
}
```

#### Cache Configuration
- **Prebuilt Templates**: 6-hour cache duration
- **User Templates**: 1-hour cache duration
- **Cache Keys**:
  - Individual templates: `template:{id}`
  - Template lists: `templates:{type}`

#### Cache Operations
```typescript
// Cache a template
async cacheTemplate(template: WorkflowTemplate, type: 'prebuilt' | 'user') {
  const templateKey = `template:${template.id}`;
  const listKey = `templates:${type}`;
  
  await this.client.set(
    templateKey,
    JSON.stringify(template),
    { EX: type === 'prebuilt' ? CACHE_EXPIRY.PREBUILT : CACHE_EXPIRY.USER_GENERATED }
  );
}

// Invalidate cache
async invalidateTemplate(id: string) {
  await this.client.del(`template:${id}`);
  await this.client.lRem(`templates:prebuilt`, 0, id);
  await this.client.lRem(`templates:user`, 0, id);
}
```

### 2. Workflow Template System

#### Template Model
```prisma
model WorkflowTemplate {
  id                String   @id @default(uuid())
  name              String
  description       String
  sourceType        String   // "prebuilt" | "user"
  n8nJson           String
  requiredCredentials String[]
  inputVariables    String[]
  thumbnail         String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

#### Template Service
```typescript
class WorkflowTemplateService {
  private cache: CacheService;

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

### 3. Workflow Instance Promotion

#### Promotion Process
1. User initiates promotion from UI
2. Backend extracts workflow data:
   - n8n JSON configuration
   - Required credentials
   - Input variables
3. Creates new template
4. Updates cache

```typescript
async promoteInstanceToTemplate(
  instanceId: string,
  data: {
    name: string;
    description: string;
    thumbnail?: string;
  }
): Promise<WorkflowTemplate> {
  const instance = await prisma.workflowInstance.findUnique({
    where: { id: instanceId },
    include: { template: true },
  });

  const n8nJson = instance.finalJson || instance.template.n8nJson;
  const requiredCredentials = extractCredentials(n8nJson);
  const inputVariables = extractVariables(n8nJson);

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

### 4. Frontend Implementation

#### Workflow Detail Component
```typescript
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
};
```

## Deployment

### Docker Configuration

```yaml
version: '3.8'
services:
  api:
    build:
      context: ./apps/api
      dockerfile: Dockerfile
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/pumpflix
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=pumpflix

  redis:
    image: redis:7-alpine

  n8n:
    image: n8nio/n8n
    environment:
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=postgres
```

### Environment Variables

```env
# Node Environment
NODE_ENV=production

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pumpflix

# Redis
REDIS_URL=redis://localhost:6379

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

## Security Considerations

1. **Authentication**
   - Passport.js for OAuth and local authentication
   - JWT for session management
   - Rate limiting on authentication endpoints

2. **Data Protection**
   - Redis cache encryption
   - Secure credential storage
   - Input validation and sanitization

3. **API Security**
   - CORS configuration
   - Helmet.js for HTTP headers
   - Request validation middleware

## Monitoring and Logging

1. **Application Logs**
   - Winston logger for structured logging
   - Error tracking and monitoring
   - Performance metrics

2. **Cache Monitoring**
   - Redis cache hit/miss metrics
   - Cache size monitoring
   - Cache invalidation tracking

## Future Improvements

1. **Performance**
   - Implement cache warming
   - Add request batching
   - Optimize database queries

2. **Scalability**
   - Add horizontal scaling support
   - Implement load balancing
   - Add service mesh

3. **Features**
   - Template versioning
   - Template categories
   - Template sharing 