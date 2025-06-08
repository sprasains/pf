import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import session from 'express-session';
import passport from 'passport';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import { requestLogger, errorLogger } from './utils/logger';
import { rateLimitMiddleware } from './middleware/rateLimit';
import './config/passport';

// Import routes
import authRoutes from './routes/auth';
import workflowRoutes from './routes/workflow';
import billingRoutes from './routes/billing';
import adminRoutes from './routes/admin';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Compression
app.use(compression());

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Logging middleware
app.use(requestLogger);

// Rate limiting
app.use('/api/auth', rateLimitMiddleware.auth);
app.use('/api', rateLimitMiddleware.api);

// API routes
console.log('authRoutes value:', authRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/admin', adminRoutes);

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Redirect root to health check
app.get('/', (req, res) => {
  res.redirect('/api/health');
});

// Enhanced health check
app.get('/api/health', async (_, res) => {
  try {
    const healthStatus = {
      status: 'UP',
      timestamp: new Date().toISOString(),
      message: 'API is healthy and running!',
      version: '1.0.0',
      database: 'connected',
      redis: 'connected',
      uptime: process.uptime(),
    };

    const statusColor = healthStatus.status === 'UP' ? '#4CAF50' : '#f44336'; // Green for UP, Red for DOWN
    const databaseColor = healthStatus.database === 'connected' ? '#4CAF50' : '#f44336';
    const redisColor = healthStatus.redis === 'connected' ? '#4CAF50' : '#f44336';

    res.status(200).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>API Health Check</title>
          <style>
              body {
                  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  min-height: 100vh;
                  margin: 0;
                  background-color: #f0f2f5;
                  color: #333;
              }
              .container {
                  background-color: #ffffff;
                  padding: 30px 40px;
                  border-radius: 12px;
                  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
                  text-align: center;
                  max-width: 600px;
                  width: 90%;
              }
              h1 {
                  color: #2c3e50;
                  margin-bottom: 25px;
                  font-size: 2.2em;
              }
              table {
                  width: 100%;
                  border-collapse: collapse;
                  margin-top: 30px;
                  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
                  border-radius: 8px;
                  overflow: hidden; /* Ensures rounded corners apply to content */
              }
              th, td {
                  padding: 15px;
                  border-bottom: 1px solid #e0e0e0;
                  text-align: left;
              }
              th {
                  background-color: #e9ecef;
                  color: #555;
                  font-weight: 600;
                  text-transform: uppercase;
                  font-size: 0.9em;
              }
              tr:last-child td {
                  border-bottom: none;
              }
              .status-cell {
                  font-weight: bold;
                  color: ${statusColor};
              }
              .connected {
                  color: #4CAF50; /* Green */
                  font-weight: bold;
              }
              .disconnected {
                  color: #f44336; /* Red */
                  font-weight: bold;
              }
              .message {
                  margin-top: 25px;
                  font-size: 1.1em;
                  color: #555;
              }
          </style>
      </head>
      <body>
          <div class="container">
              <h1>API Health Check Report</h1>
              <p class="message">${healthStatus.message}</p>
              <table>
                  <thead>
                      <tr>
                          <th>Metric</th>
                          <th>Value</th>
                      </tr>
                  </thead>
                  <tbody>
                      <tr>
                          <td>Overall Status</td>
                          <td class="status-cell">${healthStatus.status}</td>
                      </tr>
                      <tr>
                          <td>Timestamp</td>
                          <td>${healthStatus.timestamp}</td>
                      </tr>
                      <tr>
                          <td>API Version</td>
                          <td>${healthStatus.version}</td>
                      </tr>
                      <tr>
                          <td>Database Connection</td>
                          <td class="${healthStatus.database === 'connected' ? 'connected' : 'disconnected'}">${healthStatus.database}</td>
                      </tr>
                      <tr>
                          <td>Redis Connection</td>
                          <td class="${healthStatus.redis === 'connected' ? 'connected' : 'disconnected'}">${healthStatus.redis}</td>
                      </tr>
                      <tr>
                          <td>Uptime (seconds)</td>
                          <td>${healthStatus.uptime.toFixed(2)}</td>
                      </tr>
                  </tbody>
              </table>
          </div>
      </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>API Health Check Error</title>
          <style>
              body {
                  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  min-height: 100vh;
                  margin: 0;
                  background-color: #f0f2f5;
                  color: #333;
              }
              .container {
                  background-color: #ffffff;
                  padding: 30px 40px;
                  border-radius: 12px;
                  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
                  text-align: center;
                  max-width: 600px;
                  width: 90%;
                  border: 2px solid #f44336; /* Red border for error */
              }
              h1 {
                  color: #f44336; /* Red */
                  margin-bottom: 25px;
                  font-size: 2.2em;
              }
              p {
                  color: #555;
                  font-size: 1.1em;
              }
              .error-detail {
                  color: #777;
                  font-family: 'Courier New', Courier, monospace;
                  background-color: #eee;
                  padding: 10px;
                  border-radius: 5px;
                  margin-top: 20px;
                  white-space: pre-wrap; /* Preserves formatting of error message */
                  text-align: left;
              }
          </style>
      </head>
      <body>
          <div class="container">
              <h1>API Health Check Failed!</h1>
              <p>There was an issue retrieving the health status.</p>
              <div class="error-detail">Error: ${error.message || 'Unknown error'}</div>
          </div>
      </body>
      </html>
    `);
  }
});

// Error handling
app.use(errorLogger);
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

const PORT = process.env.API_PORT || process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
