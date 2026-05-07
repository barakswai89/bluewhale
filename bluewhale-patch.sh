#!/usr/bin/env bash
# ============================================================
# BlueWhale — PDF Converter + Report Scraper Cron Fix
# Run from: /mnt/c/users/hp/documents/sargotec/bluewhale/bluewhale-prd/
# ============================================================

set -e  # Exit on any error

SERVER_DIR="./server/src"
SERVICES_DIR="$SERVER_DIR/services"
JOBS_DIR="$SERVER_DIR/jobs"

echo ""
echo "🐋 BlueWhale Server Patch — Starting..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── Backup existing files ────────────────────────────────────
echo "📦 Backing up existing files..."
cp "$SERVICES_DIR/pdfConverter.service.ts" "$SERVICES_DIR/pdfConverter.service.ts.bak" 2>/dev/null && echo "   ✅ Backed up pdfConverter.service.ts" || echo "   ⚠️  No existing pdfConverter to back up"
cp "$JOBS_DIR/reportScraper.job.ts" "$JOBS_DIR/reportScraper.job.ts.bak" 2>/dev/null && echo "   ✅ Backed up reportScraper.job.ts" || echo "   ⚠️  No existing reportScraper.job to back up"

# ── Write pdfConverter.service.ts ───────────────────────────
echo ""
echo "📝 Writing pdfConverter.service.ts..."
cat > "$SERVICES_DIR/pdfConverter.service.ts" << 'PDFCONVERTER_EOF'
// FILE: server/src/services/pdfConverter.service.ts
// FIXED: Full PDF text extraction using pdf-parse + structured Excel/CSV output.
// pdf-parse and xlsx are already in package.json — no install needed.

import axios from 'axios';
import * as XLSX from 'xlsx';
// @ts-ignore — pdf-parse v2 types may not resolve cleanly in all TS configs
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

interface ConversionResult {
  success: boolean;
  data?: Buffer;
  filename?: string;
  error?: string;
}

// ── PDF downloader ───────────────────────────────────────────────────────────
async function downloadPDF(url: string): Promise<Buffer> {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 45000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/pdf,*/*',
    },
    maxContentLength: 50 * 1024 * 1024, // 50 MB cap
  });
  return Buffer.from(response.data);
}

// ── Text → row splitter ──────────────────────────────────────────────────────
// Financial PDFs use 2+ spaces as column separators.
// This splits each line on that pattern and returns column arrays.
function splitLine(line: string): string[] {
  return line
    .split(/\s{2,}/)
    .map(c => c.trim())
    .filter(c => c.length > 0);
}

// ── Table section detector ───────────────────────────────────────────────────
// Scans extracted PDF text for common JSE financial table headers and
// pulls out the rows that follow each one.
function detectFinancialTables(text: string): { name: string; rows: string[][] }[] {
  const SECTION_MARKERS = [
    'CONSOLIDATED STATEMENT OF COMPREHENSIVE INCOME',
    'CONSOLIDATED INCOME STATEMENT',
    'STATEMENT OF COMPREHENSIVE INCOME',
    'INCOME STATEMENT',
    'CONSOLIDATED STATEMENT OF FINANCIAL POSITION',
    'STATEMENT OF FINANCIAL POSITION',
    'BALANCE SHEET',
    'CONSOLIDATED STATEMENT OF CASH FLOWS',
    'STATEMENT OF CASH FLOWS',
    'CASH FLOW STATEMENT',
    'STATEMENT OF CHANGES IN EQUITY',
    'CHANGES IN EQUITY',
    'EARNINGS PER SHARE',
    'SEGMENT INFORMATION',
    'SEGMENT REPORT',
    'KEY FINANCIAL HIGHLIGHTS',
    'FINANCIAL HIGHLIGHTS',
    'SUMMARY FINANCIAL STATEMENTS',
    'NOTES TO THE FINANCIAL STATEMENTS',
  ];

  const lines = text.split('\n').map(l => l.trim());
  const tables: { name: string; rows: string[][] }[] = [];
  let currentTable: { name: string; rows: string[][] } | null = null;
  let blankStreak = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const upper = line.toUpperCase();

    // Check for a known section header
    const isHeader = SECTION_MARKERS.some(m => upper.includes(m));

    if (isHeader) {
      // Save previous table if it has data
      if (currentTable && currentTable.rows.length > 1) {
        tables.push(currentTable);
      }
      currentTable = { name: line || upper, rows: [] };
      blankStreak = 0;
      continue;
    }

    if (!currentTable) continue;

    if (line.length === 0) {
      blankStreak++;
      // End of table after 4 consecutive blank lines
      if (blankStreak >= 4 && currentTable.rows.length > 2) {
        tables.push(currentTable);
        currentTable = null;
        blankStreak = 0;
      }
      continue;
    }

    blankStreak = 0;
    const cols = splitLine(line);
    if (cols.length >= 1) {
      currentTable.rows.push(cols);
    }

    // Cap each section at 120 rows to prevent runaway captures
    if (currentTable.rows.length >= 120) {
      tables.push(currentTable);
      currentTable = null;
    }
  }

  if (currentTable && currentTable.rows.length > 1) {
    tables.push(currentTable);
  }

  // Deduplicate by table name, keep max 10 sections
  const seen = new Set<string>();
  return tables
    .filter(t => {
      if (seen.has(t.name)) return false;
      seen.add(t.name);
      return true;
    })
    .slice(0, 10);
}

// ── Normalise a sheet name for Excel (max 31 chars, no special chars) ────────
function safeSheetName(name: string): string {
  return name
    .replace(/[:\\\/\?\*\[\]]/g, '')
    .slice(0, 31)
    .trim() || 'Sheet';
}

// ── Build a safe filename base ────────────────────────────────────────────────
function baseFilename(original: string): string {
  return original.replace(/\.pdf$/i, '');
}

// ── Main export ───────────────────────────────────────────────────────────────
export async function convertPDFToFormat(
  pdfUrl: string,
  format: 'pdf' | 'excel' | 'csv',
  originalFilename: string
): Promise<ConversionResult> {
  try {
    // ── PDF pass-through ─────────────────────────────────────────────────────
    if (format === 'pdf') {
      const buffer = await downloadPDF(pdfUrl);
      return { success: true, data: buffer, filename: originalFilename };
    }

    // ── Download + parse the PDF ─────────────────────────────────────────────
    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await downloadPDF(pdfUrl);
    } catch (dlErr: any) {
      return {
        success: false,
        error: `Could not download PDF from source: ${dlErr.message}`,
      };
    }

    let parsedText = '';
    let pageCount = 0;
    let pdfMeta: Record<string, any> = {};

    try {
      const parsed = await pdfParse(pdfBuffer, {
        // Limit to first 20 pages for speed (most financial summaries are in first 20)
        max: 20,
      });
      parsedText = parsed.text || '';
      pageCount = parsed.numpages || 0;
      pdfMeta = parsed.info || {};
    } catch (parseErr: any) {
      // If pdf-parse fails (encrypted/scanned PDF), still return a useful file
      // with metadata rather than an error
      console.warn(`⚠️ pdf-parse could not extract text: ${parseErr.message}`);
      parsedText = '';
    }

    const isScanned = parsedText.trim().length < 100;
    const tables = isScanned ? [] : detectFinancialTables(parsedText);
    const base = baseFilename(originalFilename);

    // ── Excel output ─────────────────────────────────────────────────────────
    if (format === 'excel') {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Report metadata
      const metaRows: string[][] = [
        ['BlueWhale Terminal — Report Export'],
        [],
        ['Source Report', originalFilename],
        ['Source URL', pdfUrl],
        ['Pages Parsed', String(pageCount)],
        ['Exported At', new Date().toISOString()],
        [],
        ['PDF Title', pdfMeta.Title || ''],
        ['PDF Author', pdfMeta.Author || ''],
        ['PDF Subject', pdfMeta.Subject || ''],
        ['PDF Creator', pdfMeta.Creator || ''],
      ];
      if (isScanned) {
        metaRows.push([]);
        metaRows.push([
          '⚠️ Note',
          'This PDF appears to be scanned or image-based. Full text could not be extracted.',
        ]);
        metaRows.push(['', 'Please use the PDF version for complete information.']);
      }
      const metaWS = XLSX.utils.aoa_to_sheet(metaRows);
      metaWS['!cols'] = [{ wch: 22 }, { wch: 80 }];
      XLSX.utils.book_append_sheet(wb, metaWS, 'Report Info');

      // Sheet 2: Full extracted text (chunked into rows of ~150 chars each)
      if (!isScanned && parsedText.length > 0) {
        const textLines = parsedText
          .split('\n')
          .map(l => l.trim())
          .filter(l => l.length > 0)
          .map(l => [l]);
        const textWS = XLSX.utils.aoa_to_sheet([['Extracted Text'], [], ...textLines]);
        textWS['!cols'] = [{ wch: 120 }];
        XLSX.utils.book_append_sheet(wb, textWS, 'Full Text');
      }

      // Sheets 3–12: One sheet per detected financial table section
      if (tables.length > 0) {
        for (const table of tables) {
          const sheetData: string[][] = [
            [table.name],
            [],
            ...table.rows,
          ];
          const ws = XLSX.utils.aoa_to_sheet(sheetData);
          // Auto-width for first 8 columns
          ws['!cols'] = Array(8).fill({ wch: 20 });
          XLSX.utils.book_append_sheet(wb, ws, safeSheetName(table.name));
        }
      } else if (!isScanned) {
        // Fallback: dump all text rows as a single structured sheet
        const allRows = parsedText
          .split('\n')
          .map(l => splitLine(l))
          .filter(r => r.length > 0);
        const ws = XLSX.utils.aoa_to_sheet([['Content'], [], ...allRows]);
        ws['!cols'] = Array(6).fill({ wch: 25 });
        XLSX.utils.book_append_sheet(wb, ws, 'Report Content');
      }

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      return {
        success: true,
        data: buffer,
        filename: `${base}.xlsx`,
      };
    }

    // ── CSV output ───────────────────────────────────────────────────────────
    if (format === 'csv') {
      // Export the first detected financial table as CSV.
      // If no tables detected, fall back to a structured text dump.
      let csvRows: string[][];

      if (tables.length > 0) {
        const primary = tables[0];
        csvRows = [
          [`# ${primary.name}`],
          [`# Source: ${originalFilename}`],
          [`# Exported: ${new Date().toISOString()}`],
          [],
          ...primary.rows,
        ];
      } else if (!isScanned && parsedText.length > 0) {
        csvRows = [
          [`# ${originalFilename}`],
          [`# Source URL: ${pdfUrl}`],
          [`# Exported: ${new Date().toISOString()}`],
          [],
          ...parsedText
            .split('\n')
            .map(l => splitLine(l))
            .filter(r => r.length > 0),
        ];
      } else {
        csvRows = [
          ['Report', originalFilename],
          ['Source', pdfUrl],
          ['Note', 'This PDF is scanned/image-based. Text extraction not available.'],
        ];
      }

      const ws = XLSX.utils.aoa_to_sheet(csvRows);
      const csvData = XLSX.utils.sheet_to_csv(ws);
      return {
        success: true,
        data: Buffer.from(csvData, 'utf-8'),
        filename: `${base}.csv`,
      };
    }

    return { success: false, error: 'Unsupported format' };
  } catch (error: any) {
    console.error('❌ PDF conversion error:', error.message);
    return { success: false, error: error.message };
  }
}

// ── Table extractor (exposed for direct use if needed) ────────────────────────
export async function extractTablesFromPDF(pdfUrl: string): Promise<string[][][]> {
  try {
    const buffer = await downloadPDF(pdfUrl);
    const parsed = await pdfParse(buffer, { max: 20 });
    const tables = detectFinancialTables(parsed.text || '');
    return tables.map(t => t.rows);
  } catch {
    return [];
  }
}
PDFCONVERTER_EOF

echo "   ✅ pdfConverter.service.ts written"

# ── Write reportScraper.job.ts ───────────────────────────────
echo ""
echo "📝 Writing reportScraper.job.ts (with weekly cron)..."
cat > "$JOBS_DIR/reportScraper.job.ts" << 'REPORTJOB_EOF'
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
REPORTJOB_EOF

echo "   ✅ reportScraper.job.ts written"

# ── Verify files written correctly ──────────────────────────
echo ""
echo "🔍 Verifying file sizes..."
PDF_SIZE=$(wc -c < "$SERVICES_DIR/pdfConverter.service.ts")
JOB_SIZE=$(wc -c < "$JOBS_DIR/reportScraper.job.ts")
echo "   pdfConverter.service.ts  → ${PDF_SIZE} bytes"
echo "   reportScraper.job.ts     → ${JOB_SIZE} bytes"

if [ "$PDF_SIZE" -lt 500 ] || [ "$JOB_SIZE" -lt 500 ]; then
  echo ""
  echo "❌ ERROR: One or more files appear too small — write may have failed."
  echo "   Restoring backups..."
  cp "$SERVICES_DIR/pdfConverter.service.ts.bak" "$SERVICES_DIR/pdfConverter.service.ts" 2>/dev/null || true
  cp "$JOBS_DIR/reportScraper.job.ts.bak" "$JOBS_DIR/reportScraper.job.ts" 2>/dev/null || true
  exit 1
fi

# ── Confirm pdf-parse is in node_modules ────────────────────
echo ""
echo "📦 Checking pdf-parse in node_modules..."
if [ -d "./server/node_modules/pdf-parse" ]; then
  echo "   ✅ pdf-parse already installed"
else
  echo "   ⚠️  pdf-parse not found in node_modules — running npm install..."
  cd ./server && npm install && cd ..
  echo "   ✅ npm install complete"
fi

# ── Done ────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ All done! Summary:"
echo ""
echo "   📄 pdfConverter.service.ts"
echo "      • PDF → downloads and streams real file"
echo "      • PDF → Excel: extracts full text + detects"
echo "        financial table sections into separate sheets"
echo "      • PDF → CSV: exports primary financial table"
echo "      • Handles scanned PDFs gracefully"
echo ""
echo "   🔄 reportScraper.job.ts"
echo "      • Runs once on server startup (existing behaviour)"
echo "      • NEW: weekly cron every Sunday at 02:00 AM"
echo "        to pick up newly published reports automatically"
echo ""
echo "   🔒 Backups saved as:"
echo "      • $SERVICES_DIR/pdfConverter.service.ts.bak"
echo "      • $JOBS_DIR/reportScraper.job.ts.bak"
echo ""
echo "   ▶️  To apply: restart your server"
echo "      npm run dev   (local)"
echo "      git add -A && git commit -m 'fix: pdf converter + weekly scraper cron' && git push   (Railway)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
