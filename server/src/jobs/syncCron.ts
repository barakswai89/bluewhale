// FILE: server/src/jobs/syncCron.ts
// FIXED:
//   1. Now runs syncPrices() immediately on startup so data is live from first request
//   2. Hourly cron uses the fixed syncPrices() (correct .JO suffix, correct env key)
//   3. Weekly full sync (Sunday 03:00) runs metrics + historical for all companies
//   4. Previously called SyncService.syncAllCompanies() which used broken bare-ticker format

import cron from 'node-cron';
import { syncPrices, syncAllCompanies } from '../services/sync.service';

export const startSyncCron = (): void => {

  // ── 1. Run price sync immediately on startup ────────────────────────────────
  // Without this, all prices show zero until the first hourly trigger fires.
  console.log('🚀 Running initial price sync on startup...');
  syncPrices()
    .then(r => console.log(`✅ Startup sync done — ${r.updated} prices updated`))
    .catch(err => console.error('❌ Startup sync failed:', err.message));

  // ── 2. Hourly price sync — every hour at :05 ───────────────────────────────
  // Using :05 instead of :00 to avoid racing with other scheduled jobs.
  cron.schedule('5 * * * *', async () => {
    console.log(`🕐 [${new Date().toISOString()}] Hourly price sync starting...`);
    try {
      const r = await syncPrices();
      console.log(`✅ Hourly sync done — updated: ${r.updated}, skipped: ${r.skipped}, failed: ${r.failed}`);
    } catch (err: any) {
      console.error('❌ Hourly price sync failed:', err.message);
    }
  });

  // ── 3. Weekly full sync — every Sunday at 03:00 ────────────────────────────
  // Syncs prices + metrics + historical prices for all companies.
  // This is the slow one (many API calls) so runs once a week.
  cron.schedule('0 3 * * 0', async () => {
    console.log(`📅 [${new Date().toISOString()}] Weekly full sync starting...`);
    try {
      const r = await syncAllCompanies();
      console.log(`✅ Weekly full sync done — metrics: ${r.metricsOk}/${r.total}, historical: ${r.historicalOk}/${r.total}`);
    } catch (err: any) {
      console.error('❌ Weekly full sync failed:', err.message);
    }
  });

  console.log('⏰ Cron jobs scheduled:');
  console.log('   💰 Prices:  every hour at :05');
  console.log('   📊 Full:    every Sunday at 03:00');
};
