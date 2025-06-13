import express from 'express';
// Remove session, passport, cors, helmet, compression imports as they are handled in index.ts
import { logger } from './utils/logger';
// import { sessionManager } from './middleware/authMiddleware'; // REMOVE THIS IMPORT
import authRoutes from './routes/auth';

// No need to import Passport configuration here, it's in index.ts
// import './config/passport';

// This file should define and export a router, not an app instance
const router = express.Router();

// Remove all global middleware as they are handled in index.ts
// router.use(helmet());
// router.use(cors({ /* ... */ }));
// router.use(express.json());
// router.use(express.urlencoded({ extended: true }));
// router.use(compression());
// router.use(session({ /* ... */ }));
// router.use(passport.initialize());
// router.use(passport.session());

// sessionManager is a global middleware and should be applied in index.ts
// router.use(sessionManager);

// Routes specific to this router
router.use('/auth', authRoutes); // Note: path should be relative to where this router is used

// Remove error handling middleware as it's handled in index.ts
// router.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
//   logger.error('Unhandled error:', err);
//   res.status(err.status || 500).json({
//     message: err.message || 'Internal server error',
//     ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
//   });
// });

export default router; // Export the router instead of the app 