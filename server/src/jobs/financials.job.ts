// FILE: server/src/jobs/financials.job.ts
// STANDALONE — weekly cron to refresh financial statements for all companies.
// Runs every Sunday at 04:00 (one hour after the full price sync at 03:00).

import cron from 'node-cron';
import { syncAllFinancials } from '../services/financials.service';

export function startFinancialsJob(): void {
  // Run once on startup to populate the DB on first deploy
  console.log('📊 Financials job ready — manual sync via POST /api/v1/financials/sync-all or Sunday 04:00 cron');

  // Weekly refresh — every Sunday at 04:00
  cron.schedule('0 4 * * 0', () => {
    console.log('📅 Weekly financials sync starting (Sunday 04:00)...');
