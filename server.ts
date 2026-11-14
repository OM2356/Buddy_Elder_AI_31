import fs from 'node:fs';
import path from 'node:path';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { env } from './server/config/env.ts';
import { db, initializeDatabase } from './server/db/database.ts';
import { aiAndSafetyRouter } from './server/routes/aiAndSafetyRoutes.ts';
import { authRouter } from './server/routes/authRoutes.ts';
import { careAndWellnessRouter } from './server/routes/careAndWellnessRoutes.ts';
import { learningAndAdminRouter } from './server/routes/learningAndAdminRoutes.ts';
import { isGeminiAvailable } from './server/services/geminiService.ts';

initializeDatabase();

const app = express();
app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    frameguard: false,
  })
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (!env.isProduction) {
        callback(null, true);
        return;
      }
      const allowed = new Set([...env.allowedOrigins, env.appUrl]);
      if (allowed.has(origin) || origin.endsWith('.run.app')) {
        callback(null, true);
      } else {
        callback(new Error('Origin not permitted by CORS policy.'));
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please wait a few minutes and try again.' },
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 180,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Request rate limit exceeded. Please pause briefly and retry.' },
});

app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

app.get('/api/health', (_req, res) => {
  try {
    db.prepare('SELECT 1').get();
    res.json({
      status: 'ok',
      database: 'connected',
      geminiAvailable: isGeminiAvailable(),
      geminiModel: env.geminiModel,
      timestamp: new Date().toISOString(),
    });
  } catch {
    res.status(500).json({ status: 'error', database: 'disconnected' });
  }
});

app.use('/api/auth', authRouter);
app.use('/api', aiAndSafetyRouter);
app.use('/api', careAndWellnessRouter);
app.use('/api', learningAndAdminRouter);

// Proper JSON 404 for unknown API endpoints
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'API endpoint not found.' });
});

// Global error handler for APIs
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  console.error('Server error on', req.originalUrl, err);
  if (req.originalUrl.startsWith('/api')) {
    res.status(500).json({ error: err.message || 'Internal server error.' });
    return;
  }
  res.status(500).send('Internal server error.');
});

async function startServer() {
  if (!env.isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  }

  app.listen(env.port, '0.0.0.0', () => {
    console.log(`Buddy Elder AI server running on http://0.0.0.0:${env.port} (${env.isProduction ? 'production' : 'development'})`);
  });
}

startServer();
