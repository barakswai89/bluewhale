// FILE: server/src/server.ts
// FIXED:
//   1. Calls seedCompaniesIfEmpty() on startup — if DB has no companies,
//      sync has nothing to update. Previously there was no seed at all.
//   2. Removed duplicate stray imports that caused compilation warnings.

import app from './app';
import { env } from './config/env';
import { prisma } from './config/database';
import { startSyncCron } from './jobs/syncCron';
import { startScraperCron } from './jobs/scraper.cron';
import { startReportScraperJob } from './jobs/reportScraper.job';
import { seedCompaniesIfEmpty } from './services/sync.service';

const PORT = env.PORT || 5000;

async function startServer() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected');

    // Seed companies BEFORE starting sync cron
    await seedCompaniesIfEmpty();

    startSyncCron();
    startScraperCron();
    startReportScraperJob();

    app.listen(PORT, () => {
      console.log(`\n🚀 BlueWhale API running on http://localhost:${PORT}`);
      console.log(`📍 Environment: ${env.NODE_ENV}`);
      console.log(`💰 FMP key:     ${env.FMP_API_KEY ? '✅ set' : '❌ MISSING'}`);
      console.log(`🤖 Anthropic:   ${env.ANTHROPIC_API_KEY ? '✅ set' : '❌ MISSING'}\n`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

process.on('SIGINT',  async () => { await prisma.$disconnect(); process.exit(0); });
process.on('SIGTERM', async () => { await prisma.$disconnect(); process.exit(0); });

startServer();
