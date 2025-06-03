import { Counter, Histogram, Registry } from 'prom-client';
import { logger } from './logger';
import { redisClient, safeRedisOperation } from './redisClient';

class Metrics {
  private registry: Registry;
  private redis: typeof redisClient;

  // HTTP metrics
  private httpRequestDuration: Histogram;
  private httpRequestsTotal: Counter;
  private httpErrorsTotal: Counter;

  // Workflow metrics
  private workflowExecutions: Counter;
  private workflowErrors: Counter;
  private workflowDuration: Histogram;

  // Cache metrics
  private cacheHits: Counter;
  private cacheMisses: Counter;
  private cacheLatency: Histogram;

  // Job metrics
  private jobQueueSize: Counter;
  private jobProcessingDuration: Histogram;
  private jobErrors: Counter;

  // Rate limit metrics
  private rateLimitExceeded: Counter;

  constructor() {
    this.registry = new Registry();
    this.redis = redisClient;

    // Initialize HTTP metrics
    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status'],
      buckets: [0.1, 0.5, 1, 2, 5]
    });

    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status']
    });

    this.httpErrorsTotal = new Counter({
      name: 'http_errors_total',
      help: 'Total number of HTTP errors',
      labelNames: ['method', 'route', 'status']
    });

    // Initialize workflow metrics
    this.workflowExecutions = new Counter({
      name: 'workflow_executions_total',
      help: 'Total number of workflow executions',
      labelNames: ['workflow_id', 'status']
    });

    this.workflowErrors = new Counter({
      name: 'workflow_errors_total',
      help: 'Total number of workflow errors',
      labelNames: ['workflow_id', 'error_type']
    });

    this.workflowDuration = new Histogram({
      name: 'workflow_duration_seconds',
      help: 'Duration of workflow executions in seconds',
      labelNames: ['workflow_id', 'status']
    });

    // Initialize cache metrics
    this.cacheHits = new Counter({
      name: 'cache_hits_total',
      help: 'Total number of cache hits',
    });

    this.cacheMisses = new Counter({
      name: 'cache_misses_total',
      help: 'Total number of cache misses',
    });

    this.cacheLatency = new Histogram({
      name: 'cache_latency_seconds',
      help: 'Latency of cache operations in seconds',
      buckets: [0.01, 0.05, 0.1, 0.5, 1]
    });

    // Initialize job metrics
    this.jobQueueSize = new Counter({
      name: 'job_queue_size',
      help: 'Current size of job queues',
      labelNames: ['queue_name']
    });

    this.jobProcessingDuration = new Histogram({
      name: 'job_processing_duration_seconds',
      help: 'Duration of job processing in seconds',
      labelNames: ['queue_name', 'status'],
      buckets: [1, 5, 10, 30, 60]
    });

    this.jobErrors = new Counter({
      name: 'job_errors_total',
      help: 'Total number of job errors',
      labelNames: ['queue_name', 'error_type']
    });

    // Initialize rate limit metrics
    this.rateLimitExceeded = new Counter({
      name: 'rate_limit_exceeded_total',
      help: 'Total number of rate limit exceeded events',
      labelNames: ['endpoint']
    });

    // Register metrics with the registry
    this.registry.registerMetric(this.httpRequestDuration);
    this.registry.registerMetric(this.httpRequestsTotal);
    this.registry.registerMetric(this.httpErrorsTotal);
    this.registry.registerMetric(this.workflowExecutions);
    this.registry.registerMetric(this.workflowErrors);
    this.registry.registerMetric(this.workflowDuration);
    this.registry.registerMetric(this.cacheHits);
    this.registry.registerMetric(this.cacheMisses);
    this.registry.registerMetric(this.cacheLatency);
    this.registry.registerMetric(this.jobQueueSize);
    this.registry.registerMetric(this.jobProcessingDuration);
    this.registry.registerMetric(this.jobErrors);
    this.registry.registerMetric(this.rateLimitExceeded);
  }

  // Method to get metrics as a string
  async getMetrics(): Promise<string> {
    // Use safeRedisOperation if any metrics retrieval directly interacts with Redis
    // Currently, prom-client collects from its registry, but if we add custom
    // metrics that fetch directly from Redis, we would use safeRedisOperation here.
    return this.registry.metrics();
  }

  // Methods to increment/observe metrics

  // HTTP metrics
  observeHttpRequestDuration(labels: { method: string; route: string; status: string; }, duration: number) {
    this.httpRequestDuration.observe(labels, duration);
  }

  incHttpRequestsTotal(labels: { method: string; route: string; status: string; }) {
    this.httpRequestsTotal.inc(labels);
  }

  incHttpErrorsTotal(labels: { method: string; route: string; status: string; }) {
    this.httpErrorsTotal.inc(labels);
  }

  // Workflow metrics
  incWorkflowExecutions(labels: { workflow_id: string; status: string; }) {
    this.workflowExecutions.inc(labels);
  }

  incWorkflowErrors(labels: { workflow_id: string; error_type: string; }) {
    this.workflowErrors.inc(labels);
  }

  observeWorkflowDuration(labels: { workflow_id: string; status: string; }, duration: number) {
    this.workflowDuration.observe(labels, duration);
  }

  // Cache metrics
  incCacheHits() {
    this.cacheHits.inc();
  }

  incCacheMisses() {
    this.cacheMisses.inc();
  }

  observeCacheLatency(latency: number) {
    this.cacheLatency.observe(latency);
  }

  // Job metrics
  incJobQueueSize(labels: { queue_name: string; }, value: number) {
    this.jobQueueSize.inc(labels, value);
  }

  observeJobProcessingDuration(labels: { queue_name: string; status: string; }, duration: number) {
    this.jobProcessingDuration.observe(labels, duration);
  }

  incJobErrors(labels: { queue_name: string; error_type: string; }) {
    this.jobErrors.inc(labels);
  }

  // Rate limit metrics
  incRateLimitExceeded(labels: { endpoint: string; }) {
    this.rateLimitExceeded.inc(labels);
  }
}

export const metrics = new Metrics(); 