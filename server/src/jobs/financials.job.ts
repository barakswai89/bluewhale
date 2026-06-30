// FILE: server/src/jobs/financials.job.ts
// DISABLED for demo build — financial data is seeded manually via
// src/scripts/seedFinancials.ts, not synced live from Yahoo Finance.
// The Yahoo sync service was removed due to upstream API blocking (crumb/cookie
// auth failures from server IPs). Re-enable once a reliable data source is wired in.

export function startFinancialsJob(): void {
  console.log('📅 Financials job disabled — using seeded data for this build.');
  console.log('💡 To refresh seed data: npx ts-node -r dotenv/config src/scripts/seedFinancials.ts');
}
