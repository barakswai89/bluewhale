// FILE: server/src/app.ts
import './utils/bigint.utils';
import express from 'express';
import healthRoute from './routes/health.route';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import authRoutes from './routes/auth.routes';
import companiesRoutes from './routes/companies.routes';
import watchlistRoutes from './routes/watchlist.routes';
import syncRoutes from './routes/sync.routes';
import reportsRoutes from './routes/reports.routes';
import aiRoutes from './routes/ai.routes';
import scraperRoutes from './routes/scraper.routes';
import { errorHandler } from './middleware/errorHandler.middleware';

const app = express();
app.use('/', healthRoute);

// ✅ FIX: CORS now accepts an array of allowed origins.
// Previously, origin was a single string (env.CLIENT_URL), which defaults
// to http://localhost:5173 if CLIENT_URL is not set on Railway, blocking
// all requests from the Netlify frontend.
const allowedOrigins = [
  env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:3000',
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok', message: 'BlueWhale Terminal API' });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/companies', companiesRoutes);
app.use('/api/v1/watchlist', watchlistRoutes);
app.use('/api/v1/sync', syncRoutes);
app.use('/api/v1/reports', reportsRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/scraper', scraperRoutes);

// Error handler (must be last)
app.use(errorHandler);

export default app;
