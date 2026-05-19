// FILE: server/src/jobs/financials.job.ts
// Weekly cron to refresh financial statements for all companies.
// Startup sync removed — triggers Yahoo rate limits on 50 companies.
// Use POST /api/v1/financials/:ticker/sync to sync individual companies.

import cron from 'node-cron';
import { syncAllFinancials } from '../services/financials.service';

export function startFinancialsJob(): void {
  console.log('📅 Financials job scheduled — every Sunday at 04:00');
  console.log('💡 To sync a company: POST /api/v1/financials/:ticker/sync');

  // Weekly refresh — every Sunday at 04:00
  cron.schedule('0 4 * * 0', () => {
    console.log('📅 Weekly financials sync starting (Sunday 04:00)...');
    syncAllFinancials()
      .then(() => console.log('✅ Weekly financials sync complete'))
      .catch(err => console.error('❌ Weekly financials sync failed:', err.message));
  });
}
