# PumpFlix Deployment Guide

## Overview

This guide covers the deployment of PumpFlix in various environments, from development to production. The application uses a microservices architecture with the following components:

- Frontend (Next.js)
- Backend API (Express)
- PostgreSQL Database
- Redis Cache
- n8n Workflow Engine
- Prometheus & Grafana Monitoring

## Prerequisites

- Docker and Docker Compose
- Kubernetes cluster (for production)
- Domain name and SSL certificates
- Cloud provider accounts (AWS/GCP/Azure)
- CI/CD pipeline (GitHub Actions)

## Environment Setup

### Development

1. Local Development:
   ```bash
   # Clone repository
   git clone https://github.com/your-org/pumpflix
   cd pumpflix

   # Install dependencies
   npm install

   # Start services
   docker-compose -f docker-compose.dev.yml up -d
   npm run dev
   ```

2. Development Environment Variables:
   ```env
   # apps/api/.env
   NODE_ENV=development
   PORT=3000
   DATABASE_URL=postgresql://user:pass@localhost:5432/pumpflix
   REDIS_URL=redis://localhost:6379
   N8N_URL=http://localhost:5678
   ```

### Staging

1. Staging Environment Setup:
   ```bash
   # Deploy to staging
   npm run deploy:staging
   ```

2. Staging Environment Variables:
   ```env
   # apps/api/.env.staging
   NODE_ENV=staging
   PORT=3000
   DATABASE_URL=postgresql://user:pass@staging-db:5432/pumpflix
   REDIS_URL=redis://staging-redis:6379
   N8N_URL=http://staging-n8n:5678
   ```

### Production

1. Production Environment Setup:
   ```bash
   # Deploy to production
   npm run deploy:prod
   ```

2. Production Environment Variables:
   ```env
   # apps/api/.env.production
   NODE_ENV=production
   PORT=3000
   DATABASE_URL=postgresql://user:pass@prod-db:5432/pumpflix
   REDIS_URL=redis://prod-redis:6379
   N8N_URL=http://prod-n8n:5678
   ```

## Docker Configuration

### Development Docker Compose

```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile.dev
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
    volumes:
      - ./apps/api:/app
      - /app/node_modules

  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile.dev
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=development
    volumes:
      - ./apps/web:/app
      - /app/node_modules

  postgres:
    image: postgres:14
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
      - POSTGRES_DB=pumpflix

  redis:
    image: redis:6
    ports:
      - "6379:6379"

  n8n:
    image: n8nio/n8n
    ports:
      - "5678:5678"
    environment:
      - N8N_HOST=localhost
      - N8N_PORT=5678
```

### Production Docker Compose

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure

  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure

  postgres:
    image: postgres:14
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
      - POSTGRES_DB=pumpflix
    deploy:
      placement:
        constraints: [node.role == manager]

  redis:
    image: redis:6
    volumes:
      - redis_data:/data
    deploy:
      placement:
        constraints: [node.role == manager]

  n8n:
    image: n8nio/n8n
    environment:
      - N8N_HOST=localhost
      - N8N_PORT=5678
    deploy:
      replicas: 2
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure

volumes:
  postgres_data:
  redis_data:
```

## Kubernetes Deployment

### API Deployment

```yaml
# k8s/api-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pumpflix-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: pumpflix-api
  template:
    metadata:
      labels:
        app: pumpflix-api
    spec:
      containers:
      - name: api
        image: pumpflix/api:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: pumpflix-secrets
              key: database-url
        resources:
          requests:
            memory: "256Mi"
            cpu: "200m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

### Web Deployment

```yaml
# k8s/web-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pumpflix-web
spec:
  replicas: 3
  selector:
    matchLabels:
      app: pumpflix-web
  template:
    metadata:
      labels:
        app: pumpflix-web
    spec:
      containers:
      - name: web
        image: pumpflix/web:latest
        ports:
        - containerPort: 3001
        env:
        - name: NODE_ENV
          value: "production"
        resources:
          requests:
            memory: "256Mi"
            cpu: "200m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

## CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy PumpFlix

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - name: Install dependencies
      run: npm install
    - name: Run tests
      run: npm run test

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - name: Build Docker images
      run: |
        docker build -t pumpflix/api:latest -f apps/api/Dockerfile .
        docker build -t pumpflix/web:latest -f apps/web/Dockerfile .

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
    - name: Deploy to production
      run: |
        kubectl apply -f k8s/
        kubectl rollout restart deployment/pumpflix-api
        kubectl rollout restart deployment/pumpflix-web
```

## Monitoring Setup

### Prometheus Configuration

```yaml
# prometheus/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'pumpflix-api'
    static_configs:
      - targets: ['api:3000']
    metrics_path: '/metrics'

  - job_name: 'pumpflix-web'
    static_configs:
      - targets: ['web:3001']
    metrics_path: '/metrics'
```

### Grafana Dashboard

Import the dashboard configuration from `apps/api/src/config/grafana-dashboard.json` into your Grafana instance.

## Backup and Recovery

### Database Backup

```bash
# Backup PostgreSQL
pg_dump -U user -d pumpflix > backup.sql

# Backup Redis
redis-cli SAVE
cp /var/lib/redis/dump.rdb /backup/redis.rdb
```

### Recovery Procedures

1. Database Recovery:
   ```bash
   # Restore PostgreSQL
   psql -U user -d pumpflix < backup.sql

   # Restore Redis
   cp /backup/redis.rdb /var/lib/redis/dump.rdb
   redis-cli BGREWRITEAOF
   ```

2. Application Recovery:
   ```bash
   # Rollback to previous version
   kubectl rollout undo deployment/pumpflix-api
   kubectl rollout undo deployment/pumpflix-web
   ```

## Security Considerations

1. SSL/TLS Configuration:
   ```nginx
   # nginx.conf
   server {
     listen 443 ssl;
     server_name pumpflix.com;

     ssl_certificate /etc/nginx/ssl/pumpflix.crt;
     ssl_certificate_key /etc/nginx/ssl/pumpflix.key;

     location / {
       proxy_pass http://pumpflix-web:3001;
     }

     location /api {
       proxy_pass http://pumpflix-api:3000;
     }
   }
   ```

2. Security Headers:
   ```typescript
   // apps/api/src/middleware/security.ts
   import helmet from 'helmet';

   app.use(helmet());
   app.use(helmet.contentSecurityPolicy({
     directives: {
       defaultSrc: ["'self'"],
       scriptSrc: ["'self'", "'unsafe-inline'"],
       styleSrc: ["'self'", "'unsafe-inline'"],
       imgSrc: ["'self'", "data:", "https:"],
     },
   }));
   ```

## Scaling Considerations

1. Horizontal Scaling:
   - API and Web services can be scaled horizontally
   - Use load balancer for traffic distribution
   - Implement session sharing with Redis

2. Database Scaling:
   - Use read replicas for PostgreSQL
   - Implement connection pooling
   - Use Redis for caching

3. Cache Scaling:
   - Use Redis Cluster for high availability
   - Implement cache sharding
   - Use cache tags for invalidation

## Maintenance

1. Regular Updates:
   ```bash
   # Update dependencies
   npm update

   # Update Docker images
   docker-compose pull
   docker-compose up -d
   ```

2. Health Checks:
   ```bash
   # Check service health
   curl http://localhost:3000/health
   curl http://localhost:3001/health
   ```

3. Log Rotation:
   ```bash
   # Configure log rotation
   /var/log/pumpflix/*.log {
     daily
     rotate 7
     compress
     delaycompress
     missingok
     notifempty
     create 644 root root
   }
   ```

## Support and Troubleshooting

1. Common Issues:
   - Database connection issues
   - Redis connection issues
   - n8n workflow execution issues
   - Performance degradation

2. Monitoring Alerts:
   - High CPU usage
   - High memory usage
   - High latency
   - Error rate spikes

3. Contact Information:
   - DevOps Team: devops@pumpflix.com
   - Support Team: support@pumpflix.com
   - Emergency: oncall@pumpflix.com 