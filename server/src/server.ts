// FILE: server/src/server.ts
// ✅ FIX: Removed duplicate stray imports that appeared before this comment.
// The original file had `import { syncJsePrices } from './services/priceSync'`
// and `import syncRoutes from './routes/sync.routes'` at the very top before
// the module comment, causing duplicate import compilation warnings/errors.

import app from './app';
import { env } from './config/env';
import { prisma } from './config/database';
import { startSyncCron } from './jobs/syncCron';
import { startScraperCron } from './jobs/scraper.cron';
import { startReportScraperJob } from './jobs/reportScraper.job';

const PORT = env.PORT || 5000;

async function startServer() {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected');

    // Start cron jobs
    startSyncCron();        // Hourly price sync
    startScraperCron();     // Daily SENS scraper (6 AM + 5 PM)
    startReportScraperJob(); // Runs once on startup

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📍 Environment: ${env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

startServer();
