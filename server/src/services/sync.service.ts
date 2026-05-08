// FILE: server/src/services/sync.service.ts
// COMPLETE REWRITE. Previous version had 5 critical bugs:
//   1. Used bare ticker (MTN) instead of JSE format (MTN.JO) → FMP returned nothing
//   2. Read env.FMP_API_KEY which didn't exist in env.ts → always undefined
//   3. Missing priceChange field on every company update → absolute change always null
//   4. Used (prisma as any).companyMetrics defensive cast → fragile and unreliable
//   5. Only fetched key-metrics (no margins) — ratios endpoint also needed for
//      grossMargin, operatingMargin, netMargin, roic

import axios from 'axios';
import { prisma } from '../config/database';
import { env } from '../config/env';

const FMP = 'https://financialmodelingprep.com/api/v3';

// ── JSE companies to seed if the DB is empty ─────────────────────────────────
// These are the primary JSE-listed companies that FMP reliably covers.
// Sector mapping follows the Prisma Sector enum.
const JSE_COMPANIES = [
  { ticker: 'MTN',  name: 'MTN Group Limited',             sector: 'TELECOMMUNICATIONS' },
  { ticker: 'NPN',  name: 'Naspers Limited',               sector: 'TECHNOLOGY'         },
  { ticker: 'SHP',  name: 'Shoprite Holdings',             sector: 'CONSUMER_GOODS'     },
  { ticker: 'SBK',  name: 'Standard Bank Group',           sector: 'FINANCIALS'         },
  { ticker: 'FSR',  name: 'FirstRand Limited',             sector: 'FINANCIALS'         },
  { ticker: 'CPI',  name: 'Capitec Bank Holdings',         sector: 'FINANCIALS'         },
  { ticker: 'ABG',  name: 'Absa Group Limited',            sector: 'FINANCIALS'         },
  { ticker: 'NED',  name: 'Nedbank Group',                 sector: 'FINANCIALS'         },
  { ticker: 'SLM',  name: 'Sanlam Limited',                sector: 'FINANCIALS'         },
  { ticker: 'OMU',  name: 'Old Mutual Limited',            sector: 'FINANCIALS'         },
  { ticker: 'DSY',  name: 'Discovery Limited',             sector: 'FINANCIALS'         },
  { ticker: 'REM',  name: 'Remgro Limited',                sector: 'FINANCIALS'         },
  { ticker: 'AGL',  name: 'Anglo American Platinum',       sector: 'MATERIALS'          },
  { ticker: 'NPH',  name: 'Northam Platinum Holdings',     sector: 'MATERIALS'          },
  { ticker: 'GFI',  name: 'Gold Fields Limited',           sector: 'MATERIALS'          },
  { ticker: 'AMS',  name: 'Anglo American PLC',            sector: 'MATERIALS'          },
  { ticker: 'BHP',  name: 'BHP Group Limited',             sector: 'MATERIALS'          },
  { ticker: 'SOL',  name: 'Sasol Limited',                 sector: 'ENERGY'             },
  { ticker: 'VOD',  name: 'Vodacom Group',                 sector: 'TELECOMMUNICATIONS' },
  { ticker: 'TBS',  name: 'Tiger Brands Limited',          sector: 'CONSUMER_GOODS'     },
  { ticker: 'APN',  name: 'Aspen Pharmacare Holdings',     sector: 'HEALTHCARE'         },
  { ticker: 'MNP',  name: 'Mondi PLC',                     sector: 'MATERIALS'          },
  { ticker: 'WHL',  name: 'Woolworths Holdings',           sector: 'CONSUMER_GOODS'     },
  { ticker: 'TFG',  name: 'The Foschini Group',            sector: 'CONSUMER_GOODS'     },
  { ticker: 'MRP',  name: 'Mr Price Group',                sector: 'CONSUMER_GOODS'     },
  { ticker: 'TRU',  name: 'Truworths International',       sector: 'CONSUMER_GOODS'     },
  { ticker: 'PIK',  name: 'Pick n Pay Stores',             sector: 'CONSUMER_GOODS'     },
  { ticker: 'BAW',  name: 'Barloworld Limited',            sector: 'INDUSTRIALS'        },
  { ticker: 'BID',  name: 'Bid Corporation Limited',       sector: 'CONSUMER_GOODS'     },
  { ticker: 'SNT',  name: 'Santam Limited',                sector: 'FINANCIALS'         },
  { ticker: 'LBH',  name: 'Liberty Holdings',              sector: 'FINANCIALS'         },
  { ticker: 'OCE',  name: 'Oceana Group Limited',          sector: 'CONSUMER_GOODS'     },
  { ticker: 'ARH',  name: 'ARB Holdings',                  sector: 'INDUSTRIALS'        },
  { ticker: 'PSG',  name: 'PSG Group Limited',             sector: 'FINANCIALS'         },
  { ticker: 'MSM',  name: 'Massmart Holdings',             sector: 'CONSUMER_GOODS'     },
];

// ── Seed companies if the database is empty ───────────────────────────────────
export async function seedCompaniesIfEmpty(): Promise<void> {
  const count = await prisma.company.count();
  if (count > 0) {
    console.log(`📋 Database already has ${count} companies — skipping seed`);
    return;
  }

  console.log('🌱 Database is empty — seeding JSE companies...');
  let seeded = 0;

  for (const c of JSE_COMPANIES) {
    try {
      await prisma.company.upsert({
        where: { ticker: c.ticker },
        update: {},
        create: {
          ticker: c.ticker,
          name: c.name,
          sector: c.sector as any,
          isActive: true,
          lastPrice: 0,
          priceChange: 0,
          priceChangePercent: 0,
        },
      });
      seeded++;
    } catch (err: any) {
      console.warn(`⚠️  Seed: could not upsert ${c.ticker}: ${err.message}`);
    }
  }

  console.log(`✅ Seeded ${seeded}/${JSE_COMPANIES.length} companies`);
}

// ── Delay helper ──────────────────────────────────────────────────────────────
const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

// ── syncPrices — batch quote fetch for all active companies ───────────────────
// FMP supports batch quotes: GET /quote/MTN.JO,NPN.JO,SBK.JO
// This is much faster than one-by-one requests and preserves rate limit budget.
export async function syncPrices(): Promise<{ updated: number; failed: number; skipped: number }> {
  const key = env.FMP_API_KEY;
  if (!key) {
    console.warn('⚠️  syncPrices: FMP_API_KEY not set — aborting');
    return { updated: 0, failed: 0, skipped: 0 };
  }

  const companies = await prisma.company.findMany({
    where: { isActive: true },
    select: { id: true, ticker: true, lastPrice: true },
  });

  if (companies.length === 0) {
    console.warn('⚠️  syncPrices: no active companies in database');
    return { updated: 0, failed: 0, skipped: 0 };
  }

  console.log(`💰 Syncing prices for ${companies.length} companies...`);

  // ✅ FIX: Use .JO suffix for all JSE tickers
  const symbols = companies.map(c => `${c.ticker}.JO`).join(',');
  let quotes: any[] = [];

  try {
    const url = `${FMP}/quote/${symbols}?apikey=${key}`;
    const { data } = await axios.get(url, { timeout: 30000 });
    quotes = Array.isArray(data) ? data : [];
  } catch (err: any) {
    // If batch fails, FMP may have rejected the request — log and return
    console.error('❌ syncPrices batch request failed:', err.message);
    return { updated: 0, failed: companies.length, skipped: 0 };
  }

  // Build a lookup map: MTN.JO → quote
  const quoteMap = new Map<string, any>();
  for (const q of quotes) {
    quoteMap.set(q.symbol, q);
  }

  let updated = 0, failed = 0, skipped = 0;

  for (const company of companies) {
    const symbol = `${company.ticker}.JO`;
    const q = quoteMap.get(symbol);

    if (!q || !q.price) {
      console.warn(`⚠️  ${company.ticker}: no quote data from FMP`);
      skipped++;
      continue;
    }

    try {
      // ✅ FIX: priceChange field was previously missing from every update
      await prisma.company.update({
        where: { id: company.id },
        data: {
          lastPrice:           q.price              ?? company.lastPrice,
          priceChange:         q.change             ?? 0,
          priceChangePercent:  q.changesPercentage  ?? 0,
          volume:              q.volume             ?? null,
          marketCap:           q.marketCap          ?? null,
          lastScrapedAt:       new Date(),
          updatedAt:           new Date(),
        },
      });
      console.log(`✅ ${company.ticker}: R${q.price} (${q.changesPercentage?.toFixed(2)}%)`);
      updated++;
    } catch (err: any) {
      console.error(`❌ ${company.ticker} DB update failed:`, err.message);
      failed++;
    }
  }

  console.log(`💰 Price sync done — updated: ${updated}, skipped: ${skipped}, failed: ${failed}`);
  return { updated, failed, skipped };
}

// ── syncMetrics — fetch ratios + key-metrics for a single company ──────────────
// Uses BOTH /ratios (margins, ROE, ROA, D/E) AND /key-metrics (ROIC, EV/EBITDA)
async function syncMetrics(ticker: string, companyId: string): Promise<boolean> {
  const key = env.FMP_API_KEY;
  const symbol = `${ticker}.JO`;

  try {
    // Fetch ratios and key-metrics in parallel
    const [ratiosRes, keyMetricsRes] = await Promise.allSettled([
      axios.get(`${FMP}/ratios/${symbol}?period=annual&limit=1&apikey=${key}`, { timeout: 15000 }),
      axios.get(`${FMP}/key-metrics/${symbol}?period=annual&limit=1&apikey=${key}`, { timeout: 15000 }),
    ]);

    const ratios    = ratiosRes.status === 'fulfilled'    ? ratiosRes.value.data?.[0]    : null;
    const keyMetrics = keyMetricsRes.status === 'fulfilled' ? keyMetricsRes.value.data?.[0] : null;

    if (!ratios && !keyMetrics) {
      console.warn(`⚠️  ${ticker}: no metrics data from FMP`);
      return false;
    }

    const n = (v: any) => (v != null && !isNaN(Number(v)) ? Number(v) : null);
    const pct = (v: any) => (v != null && !isNaN(Number(v)) ? Number(v) * 100 : null);

    // ✅ FIX: use prisma.companyMetrics directly (not (prisma as any).companyMetrics)
    const _existingMetrics = await prisma.companyMetrics.findFirst({ where: { companyId } });
    const _metricsData = {
        // Valuation (from ratios)
        peRatio:          n(ratios?.priceEarningsRatio),
        pbRatio:          n(ratios?.priceToBookRatio),
        psRatio:          n(ratios?.priceToSalesRatio),
        evToEbitda:       n(keyMetrics?.enterpriseValueOverEBITDA),
        // Profitability (from ratios — converted from decimal to %)
        grossMargin:      pct(ratios?.grossProfitMargin),
        operatingMargin:  pct(ratios?.operatingProfitMargin),
        netMargin:        pct(ratios?.netProfitMargin),
        roe:              pct(ratios?.returnOnEquity),
        roa:              pct(ratios?.returnOnAssets),
        roic:             pct(ratios?.returnOnCapitalEmployed),
        // Liquidity
        currentRatio:     n(ratios?.currentRatio),
        quickRatio:       n(ratios?.quickRatio),
        debtToEquity:     n(ratios?.debtEquityRatio),
        // Dividend
        dividendYield:    pct(ratios?.dividendYield),
        payoutRatio:      pct(ratios?.payoutRatio),
        updatedAt:        new Date(),
    };
    if (_existingMetrics) {
      await prisma.companyMetrics.update({ where: { id: _existingMetrics.id }, data: _metricsData });
    } else {
      await prisma.companyMetrics.create({ data: { companyId, asOfDate: new Date(new Date().toDateString()), ..._metricsData } });
    }

    return true;
  } catch (err: any) {
    console.error(`❌ ${ticker} metrics sync failed:`, err.message);
    return false;
  }
}

// ── syncHistorical — 1 year of daily OHLCV for a single company ───────────────
async function syncHistorical(ticker: string, companyId: string): Promise<boolean> {
  const key = env.FMP_API_KEY;
  const symbol = `${ticker}.JO`;

  try {
    const url = `${FMP}/historical-price-full/${symbol}?apikey=${key}`;
    const { data } = await axios.get(url, { timeout: 30000 });
    const historical: any[] = data?.historical || [];

    if (historical.length === 0) {
      console.warn(`⚠️  ${ticker}: no historical price data`);
      return false;
    }

    // Keep last 365 trading days
    const last365 = historical.slice(0, 365);

    // Delete old records and reinsert (faster than individual upserts)
    await prisma.historicalPrice.deleteMany({ where: { companyId } });

    await prisma.historicalPrice.createMany({
      data: last365.map((d: any) => ({
        companyId,
        date:   new Date(d.date),
        open:   d.open   || 0,
        high:   d.high   || 0,
        low:    d.low    || 0,
        close:  d.close  || 0,
        volume: BigInt(Math.round(d.volume || 0)),
      })),
      skipDuplicates: true,
    });

    console.log(`📈 ${ticker}: ${last365.length} historical records synced`);
    return true;
  } catch (err: any) {
    console.error(`❌ ${ticker} historical sync failed:`, err.message);
    return false;
  }
}

// ── syncCompanyProfile — updates name, description, website from FMP profile ──
async function syncProfile(ticker: string, companyId: string): Promise<boolean> {
  const key = env.FMP_API_KEY;
  const symbol = `${ticker}.JO`;

  try {
    const url = `${FMP}/profile/${symbol}?apikey=${key}`;
    const { data } = await axios.get(url, { timeout: 15000 });
    const profile = Array.isArray(data) ? data[0] : null;

    if (!profile) return false;

    await prisma.company.update({
      where: { id: companyId },
      data: {
        name:        profile.companyName || undefined,
        description: profile.description || undefined,
        website:     profile.website     || undefined,
        logoUrl:     profile.image       || undefined,
        industry:    profile.industry    || undefined,
      },
    });

    return true;
  } catch (err: any) {
    console.warn(`⚠️  ${ticker} profile sync failed: ${err.message}`);
    return false;
  }
}

// ── Full single-company sync ───────────────────────────────────────────────────
export async function syncCompanyData(ticker: string) {
  const company = await prisma.company.findUnique({ where: { ticker } });
  if (!company) return { success: false, message: `${ticker} not found in DB` };

  console.log(`🔄 Full sync: ${ticker}...`);

  const [priceResult] = await Promise.allSettled([
    // Use batch price sync for single ticker too
    axios.get(`${FMP}/quote/${ticker}.JO?apikey=${env.FMP_API_KEY}`, { timeout: 15000 })
      .then(res => {
        const q = res.data?.[0];
        if (q?.price) {
          return prisma.company.update({
            where: { id: company.id },
            data: {
              lastPrice:          q.price,
              priceChange:        q.change           ?? 0,
              priceChangePercent: q.changesPercentage ?? 0,
              volume:             q.volume           ?? null,
              marketCap:          q.marketCap        ?? null,
              lastScrapedAt:      new Date(),
            },
          });
        }
      }),
  ]);

  await delay(500);
  await syncProfile(ticker, company.id);
  await delay(500);
  await syncMetrics(ticker, company.id);
  await delay(500);
  await syncHistorical(ticker, company.id);

  return { success: true, message: `${ticker} fully synced` };
}

// ── Full all-companies sync (prices + metrics + historical) ───────────────────
// Run this weekly — it's slow (1 API call per company per endpoint)
export async function syncAllCompanies() {
  console.log('\n🌊 Full sync starting for all companies...');

  const companies = await prisma.company.findMany({
    where: { isActive: true },
    select: { id: true, ticker: true },
  });

  // First do a fast batch price sync for everyone
  await syncPrices();

  // Then do metrics + historical per company (slower, one at a time)
  let metricsOk = 0, historicalOk = 0;

  for (const c of companies) {
    await delay(800); // Respect FMP rate limits

    const [m, h] = await Promise.all([
      syncMetrics(c.ticker, c.id),
      syncHistorical(c.ticker, c.id),
    ]);

    if (m) metricsOk++;
    if (h) historicalOk++;
  }

  console.log(`\n✨ Full sync complete:`);
  console.log(`   📊 Metrics synced:    ${metricsOk}/${companies.length}`);
  console.log(`   📈 Historical synced: ${historicalOk}/${companies.length}`);

  return { success: true, total: companies.length, metricsOk, historicalOk };
}

// ── SyncService class (keeps backward compat with controller) ─────────────────
export class SyncService {
  async syncCompanyData(ticker: string) {
    return syncCompanyData(ticker);
  }
  async syncAllCompanies() {
    return syncAllCompanies();
  }
}
