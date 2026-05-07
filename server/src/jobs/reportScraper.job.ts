// FILE: server/src/jobs/reportScraper.job.ts
// FIXED: Added weekly cron re-scrape so new published reports are picked up
// automatically without needing a server restart.
// node-cron is already in package.json — no install needed.

import { PrismaClient } from '@prisma/client';
import cron from 'node-cron';
import { scrapeAllCompanyReports } from '../services/reportScraper.service';

const prisma = new PrismaClient();

// ── Core job logic ────────────────────────────────────────────────────────────
export async function runReportScraperJob(): Promise<void> {
  const startTime = Date.now();
  console.log('\n📄 Report scraper job starting...');
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  console.log('⚠️  Only real financial reports will be stored — NO MOCK DATA\n');

  try {
    // Fetch all active companies that have a website configured
    const companies = await prisma.company.findMany({
      where: {
        isActive: true,
        website: { not: null },
      },
      select: { id: true, ticker: true, name: true, website: true },
    });

    if (companies.length === 0) {
      console.log('⚠️  No active companies with websites found — nothing to scrape.');
      return;
    }

    console.log(`📋 Found ${companies.length} companies to scrape\n`);

    // Run the scraper across all companies
    const scrapedResults = await scrapeAllCompanyReports(
      companies as Array<{ ticker: string; website: string; id: string; name: string }>
    );

    // Persist results to the database
    let totalStored = 0;
    let totalUpdated = 0;
    let companiesWithReports = 0;
    let companiesWithoutReports = 0;

    for (const [companyId, reports] of scrapedResults.entries()) {
      const company = companies.find(c => c.id === companyId);
      const ticker = company?.ticker ?? 'UNKNOWN';

      if (reports.length === 0) {
        console.log(`⚠️  No real reports found for ${ticker} — skipping`);
        companiesWithoutReports++;
        continue;
      }

      companiesWithReports++;
      console.log(`💾 Storing ${reports.length} reports for ${ticker}...`);

      for (const report of reports) {
        try {
          const result = await prisma.companyReport.upsert({
            where: {
              companyId_title: { companyId, title: report.title },
            },
            create: {
              companyId,
              title: report.title,
              reportType: report.type,
              fiscalYear: report.date ? report.date.getFullYear() : new Date().getFullYear(),
              publishDate: report.date ?? new Date(),
              fileUrl: report.url,
              fileName: report.url.split('/').pop() ?? 'report.pdf',
              aiProcessed: false,
            },
            update: {
              fileUrl: report.url,
              reportType: report.type,
              publishDate: report.date ?? new Date(),
              updatedAt: new Date(),
            },
          });

          // Determine if it was a create or update by checking createdAt vs updatedAt
          const wasCreated =
            Math.abs(result.createdAt.getTime() - result.updatedAt.getTime()) < 1000;
          if (wasCreated) totalStored++;
          else totalUpdated++;
        } catch (err: any) {
          console.error(`   ❌ Failed to store "${report.title}": ${err.message}`);
        }
      }

      console.log(`   ✅ Done: ${ticker}`);
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('\n🎉 Report scraper job complete!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📊 New reports stored:      ${totalStored}`);
    console.log(`🔄 Existing reports updated: ${totalUpdated}`);
    console.log(`✅ Companies with reports:  ${companiesWithReports}/${companies.length}`);
    console.log(`⚠️  Companies without reports: ${companiesWithoutReports}/${companies.length}`);
    console.log(`⏱️  Elapsed: ${elapsed}s`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  } catch (error: any) {
    console.error('❌ Report scraper job failed:', error.message);
    throw error;
  }
}

// ── Startup runner (fire-and-forget on server boot) ───────────────────────────
function runOnStartup(): void {
  console.log('\n📄 Running initial report scrape on startup...\n');
  runReportScraperJob()
    .then(() => console.log('✅ Startup report scrape complete\n'))
    .catch(err => console.error('❌ Startup report scrape failed:', err.message, '\n'));
}

// ── Weekly cron — every Sunday at 2:00 AM ─────────────────────────────────────
// Cron pattern: minute hour day-of-month month day-of-week
// '0 2 * * 0' = 02:00 every Sunday
function scheduleWeeklyScrape(): void {
  const CRON_EXPRESSION = '0 2 * * 0';

  cron.schedule(CRON_EXPRESSION, () => {
    console.log('\n🔄 Weekly report scraper triggered (Sunday 02:00)...');
    runReportScraperJob()
      .then(() => console.log('✅ Weekly report scrape complete\n'))
      .catch(err => console.error('❌ Weekly report scrape failed:', err.message, '\n'));
  });

  console.log('📅 Weekly report scraper scheduled — runs every Sunday at 02:00');
}

// ── Entry point called from server.ts ─────────────────────────────────────────
export function startReportScraperJob(): void {
  // 1. Run once immediately on startup to populate the DB
  runOnStartup();

  // 2. Schedule weekly re-scrape so newly published reports are picked up
  scheduleWeeklyScrape();
}
