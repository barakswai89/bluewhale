/**
 * syncFinancials.ts
 * 
 * CLI script to sync FY2025 financial data for all companies.
 * 
 * Usage:
 *   npx ts-node src/scripts/syncFinancials.ts           # sync all companies
 *   npx ts-node src/scripts/syncFinancials.ts AAPL      # sync one ticker
 *   npx ts-node src/scripts/syncFinancials.ts AAPL MSFT # sync multiple tickers
 */

import { PrismaClient } from '@prisma/client';
import { syncCompanyFinancials, syncAllFinancials } from '../services/financials.service';

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    // Sync all companies
    await syncAllFinancials();
  } else {
    // Sync specific tickers
    for (const ticker of args) {
      const company = await prisma.company.findFirst({
        where: { ticker: ticker.toUpperCase() },
        select: { id: true, ticker: true },
      });

      if (!company) {
        console.error(`[sync] Company with ticker "${ticker}" not found in database.`);
        continue;
      }

      await syncCompanyFinancials(company.ticker, company.id);
    }
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('[sync] Fatal error:', err);
  process.exit(1);
});
