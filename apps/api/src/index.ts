import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import session from 'express-session';
import passport from 'passport';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import { requestLogger, errorLogger } from './utils/logger';
import { apiLimiter, authLimiter } from './middleware/rateLimit';
import './config/passport';
import { rateLimits } from './middleware/rateLimit';

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
app.use('/api/auth', rateLimits.auth);
app.use('/api', rateLimits.api);

// API routes
console.log('authRoutes value:', authRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/admin', adminRoutes);

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Error handling
app.use(errorLogger);
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 