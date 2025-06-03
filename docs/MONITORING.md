# PumpFlix Monitoring Guide

## Overview

This guide covers the monitoring setup for PumpFlix, including metrics collection, alerting, and visualization. The monitoring stack consists of:

- Prometheus for metrics collection
- Grafana for visualization
- AlertManager for alerting
- Node Exporter for system metrics
- Custom metrics for application monitoring

## Metrics Collection

### Prometheus Configuration

```yaml
# prometheus/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  scrape_timeout: 10s

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']

rule_files:
  - 'rules/*.yml'

scrape_configs:
  - job_name: 'pumpflix-api'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['api:3000']
    relabel_configs:
      - source_labels: [__address__]
        target_label: instance
        regex: '([^:]+):.*'
        replacement: '${1}'

  - job_name: 'pumpflix-web'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['web:3001']
    relabel_configs:
      - source_labels: [__address__]
        target_label: instance
        regex: '([^:]+):.*'
        replacement: '${1}'

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']
```

### Custom Metrics

```typescript
// apps/api/src/utils/metrics.ts
import { Counter, Gauge, Histogram } from 'prom-client';

// HTTP Metrics
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5],
});

export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

// Database Metrics
export const dbQueryDuration = new Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['query_type'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1],
});

// Cache Metrics
export const cacheHits = new Counter({
  name: 'cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['cache_type'],
});

export const cacheMisses = new Counter({
  name: 'cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['cache_type'],
});

// Job Queue Metrics
export const jobQueueSize = new Gauge({
  name: 'job_queue_size',
  help: 'Current size of job queues',
  labelNames: ['queue_name'],
});

export const jobProcessingDuration = new Histogram({
  name: 'job_processing_duration_seconds',
  help: 'Duration of job processing in seconds',
  labelNames: ['job_type'],
  buckets: [1, 5, 10, 30, 60],
});
```

## Alerting Rules

```yaml
# prometheus/rules/alerts.yml
groups:
  - name: pumpflix
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status_code=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: High error rate detected
          description: Error rate is above 10% for the last 5 minutes

      - alert: HighLatency
        expr: http_request_duration_seconds{quantile="0.9"} > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: High latency detected
          description: 90th percentile latency is above 1 second

      - alert: HighMemoryUsage
        expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: High memory usage
          description: Memory usage is above 90%

      - alert: HighCPUUsage
        expr: 100 - (avg by(instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: High CPU usage
          description: CPU usage is above 80%

      - alert: JobQueueBacklog
        expr: job_queue_size > 1000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: Job queue backlog
          description: Job queue size is above 1000
```

## Grafana Dashboards

### API Dashboard

```json
{
  "dashboard": {
    "id": null,
    "title": "PumpFlix API",
    "tags": ["api", "monitoring"],
    "timezone": "browser",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "datasource": "Prometheus",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{method}} {{route}}"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "graph",
        "datasource": "Prometheus",
        "targets": [
          {
            "expr": "rate(http_requests_total{status_code=~\"5..\"}[5m])",
            "legendFormat": "{{route}}"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph",
        "datasource": "Prometheus",
        "targets": [
          {
            "expr": "rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m])",
            "legendFormat": "{{route}}"
          }
        ]
      }
    ]
  }
}
```

### System Dashboard

```json
{
  "dashboard": {
    "id": null,
    "title": "PumpFlix System",
    "tags": ["system", "monitoring"],
    "timezone": "browser",
    "panels": [
      {
        "title": "CPU Usage",
        "type": "graph",
        "datasource": "Prometheus",
        "targets": [
          {
            "expr": "100 - (avg by(instance) (irate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)",
            "legendFormat": "{{instance}}"
          }
        ]
      },
      {
        "title": "Memory Usage",
        "type": "graph",
        "datasource": "Prometheus",
        "targets": [
          {
            "expr": "(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100",
            "legendFormat": "{{instance}}"
          }
        ]
      },
      {
        "title": "Disk Usage",
        "type": "graph",
        "datasource": "Prometheus",
        "targets": [
          {
            "expr": "(node_filesystem_size_bytes - node_filesystem_free_bytes) / node_filesystem_size_bytes * 100",
            "legendFormat": "{{instance}} {{mountpoint}}"
          }
        ]
      }
    ]
  }
}
```

## Logging

### Log Configuration

```typescript
// apps/api/src/utils/logger.ts
import winston from 'winston';
import { ElasticsearchTransport } from 'winston-elasticsearch';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'pumpflix-api' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
    }),
    new ElasticsearchTransport({
      level: 'info',
      index: 'pumpflix-logs',
      clientOpts: {
        node: process.env.ELASTICSEARCH_URL,
      },
    }),
  ],
});

export default logger;
```

### Log Aggregation

```yaml
# filebeat/filebeat.yml
filebeat.inputs:
- type: log
  enabled: true
  paths:
    - /var/log/pumpflix/*.log
  fields:
    app: pumpflix
  fields_under_root: true

output.elasticsearch:
  hosts: ["elasticsearch:9200"]
  index: "pumpflix-logs-%{+yyyy.MM.dd}"

setup.kibana:
  host: "kibana:5601"
```

## Health Checks

```typescript
// apps/api/src/routes/health.ts
import { Router } from 'express';
import { redis } from '../utils/cache';
import { prisma } from '../utils/database';

const router = Router();

router.get('/health', async (req, res) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    
    // Check Redis connection
    await redis.ping();
    
    // Check n8n connection
    const n8nResponse = await fetch(`${process.env.N8N_URL}/health`);
    if (!n8nResponse.ok) {
      throw new Error('n8n health check failed');
    }
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'up',
        redis: 'up',
        n8n: 'up',
      },
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

export default router;
```

## Performance Monitoring

### Frontend Performance

```typescript
// apps/web/src/utils/performance.ts
export const trackPageLoad = () => {
  const timing = window.performance.timing;
  const pageLoadTime = timing.loadEventEnd - timing.navigationStart;
  
  // Send to analytics
  sendMetric('page_load_time', pageLoadTime);
};

export const trackApiCall = (endpoint: string, duration: number) => {
  // Send to analytics
  sendMetric('api_call_duration', duration, { endpoint });
};

export const trackUserInteraction = (action: string, duration: number) => {
  // Send to analytics
  sendMetric('user_interaction_duration', duration, { action });
};
```

### Backend Performance

```typescript
// apps/api/src/middleware/performance.ts
import { Request, Response, NextFunction } from 'express';
import { httpRequestDuration, httpRequestsTotal } from '../utils/metrics';

export const trackPerformance = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    
    httpRequestDuration
      .labels(req.method, req.route?.path || req.path, res.statusCode.toString())
      .observe(duration);
    
    httpRequestsTotal
      .labels(req.method, req.route?.path || req.path, res.statusCode.toString())
      .inc();
  });
  
  next();
};
```

## Monitoring Best Practices

1. **Metrics Collection**
   - Collect metrics at appropriate intervals
   - Use meaningful metric names
   - Include relevant labels
   - Set appropriate retention periods

2. **Alerting**
   - Set meaningful thresholds
   - Use appropriate severity levels
   - Include actionable alert messages
   - Configure proper notification channels

3. **Dashboard Design**
   - Group related metrics
   - Use appropriate visualization types
   - Include time range controls
   - Add helpful annotations

4. **Logging**
   - Use structured logging
   - Include relevant context
   - Set appropriate log levels
   - Configure log rotation

5. **Health Checks**
   - Check all critical services
   - Include detailed status information
   - Set appropriate timeouts
   - Configure proper error handling

## Troubleshooting

### Common Issues

1. **High Error Rates**
   - Check application logs
   - Review recent deployments
   - Check dependent services
   - Monitor system resources

2. **High Latency**
   - Check database performance
   - Review cache hit rates
   - Monitor network latency
   - Check system resources

3. **Memory Issues**
   - Check for memory leaks
   - Review garbage collection
   - Monitor heap usage
   - Check system memory

4. **CPU Issues**
   - Check for infinite loops
   - Review expensive operations
   - Monitor thread usage
   - Check system CPU

### Debugging Tools

1. **Node.js Profiling**
   ```bash
   # Start profiling
   node --prof app.js
   
   # Process profile
   node --prof-process isolate-0xnnnnnnnnnnnn-v8.log > processed.txt
   ```

2. **Memory Analysis**
   ```bash
   # Take heap snapshot
   node --heapsnapshot app.js
   
   # Analyze with Chrome DevTools
   chrome://inspect
   ```

3. **Network Analysis**
   ```bash
   # Monitor network traffic
   tcpdump -i any port 3000
   
   # Check connection status
   netstat -an | grep 3000
   ```

## Contact

For monitoring issues, please contact:
- DevOps Team: devops@pumpflix.com
- On-Call Engineer: oncall@pumpflix.com
- Monitoring Team: monitoring@pumpflix.com 