// FILE: server/src/controllers/companies.controller.ts
import { Request, Response } from 'express';
import { CompaniesService } from '../services/companies.service';
import { sendSuccess, sendError } from '../utils/response.utils';
import axios from 'axios';

const companiesService = new CompaniesService();

const YAHOO_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': 'application/json',
};

export class CompaniesController {
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const filters = {
        sector:           req.query.sector as any,
        minMarketCap:     req.query.minMarketCap     ? Number(req.query.minMarketCap)     : undefined,
        maxMarketCap:     req.query.maxMarketCap     ? Number(req.query.maxMarketCap)     : undefined,
        minPE:            req.query.minPE            ? Number(req.query.minPE)            : undefined,
        maxPE:            req.query.maxPE            ? Number(req.query.maxPE)            : undefined,
        minDividendYield: req.query.minDividendYield ? Number(req.query.minDividendYield) : undefined,
        maxDividendYield: req.query.maxDividendYield ? Number(req.query.maxDividendYield) : undefined,
        sortBy:           req.query.sortBy    as string,
        sortOrder:        req.query.sortOrder as 'asc' | 'desc',
        page:             req.query.page   ? Number(req.query.page)  : undefined,
        limit:            req.query.limit  ? Number(req.query.limit) : undefined,
        search:           req.query.search as string,
      };
      const result = await companiesService.getAll(filters);
      sendSuccess(res, result);
    } catch (error: any) {
      sendError(res, error.message, 500);
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const company = await companiesService.getById(req.params.id);
      sendSuccess(res, company);
    } catch (error: any) {
      sendError(res, error.message, 404);
    }
  }

  async getByTicker(req: Request, res: Response): Promise<void> {
    try {
      const company = await companiesService.getByTicker(req.params.ticker);
      sendSuccess(res, company);
    } catch (error: any) {
      sendError(res, error.message, 404);
    }
  }

  async search(req: Request, res: Response): Promise<void> {
    try {
      const query = req.query.q as string;
      if (!query) { sendError(res, 'Search query is required', 400); return; }
      const companies = await companiesService.search(query);
      sendSuccess(res, companies);
    } catch (error: any) {
      sendError(res, error.message, 500);
    }
  }
}

// ── GET /companies/ticker/:ticker/live ────────────────────────────────────────
// Returns fresh Yahoo Finance data: extended stats, 52-week range, beta, etc.
// Always fetches live — never served from DB cache.
// Profile shift: this endpoint enables the frontend to revalidate on demand
// rather than rely solely on the hourly sync snapshot.
export async function getLiveStats(req: Request, res: Response): Promise<void> {
  const ticker = req.params.ticker.toUpperCase();
  const symbol = `${ticker}.JO`;
  try {
    const { data } = await axios.get(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`,
      { params: { interval: '1d', range: '5d' }, headers: YAHOO_HEADERS, timeout: 12000 }
    );

    const result = data?.chart?.result?.[0];
    const meta   = result?.meta;

    if (!meta?.regularMarketPrice) {
      sendError(res, `Live data unavailable for ${ticker}`, 404);
      return;
    }

    const prev = meta.previousClose ?? meta.chartPreviousClose ?? meta.regularMarketPrice;

    sendSuccess(res, {
      ticker,
      symbol,
      // Price
      price:             meta.regularMarketPrice,
      previousClose:     prev,
      change:            meta.regularMarketPrice - prev,
      changePercent:     prev ? ((meta.regularMarketPrice - prev) / prev) * 100 : 0,
      // Intraday
      open:              meta.regularMarketOpen,
      dayHigh:           meta.regularMarketDayHigh,
      dayLow:            meta.regularMarketDayLow,
      // Volume
      volume:            meta.regularMarketVolume,
      avgVolume3m:       meta.averageDailyVolume3Month ?? meta.averageDailyVolume10Day,
      // 52-week range
      fiftyTwoWeekHigh:  meta.fiftyTwoWeekHigh,
      fiftyTwoWeekLow:   meta.fiftyTwoWeekLow,
      fiftyDayAvg:       meta.fiftyDayAverage,
      twoHundredDayAvg:  meta.twoHundredDayAverage,
      // Fundamentals
      marketCap:         meta.marketCap,
      sharesOutstanding: meta.sharesOutstanding,
      beta:              meta.beta,
      trailingPE:        meta.trailingPE,
      // Meta
      currency:          meta.currency ?? 'ZAc',
      exchange:          meta.fullExchangeName ?? meta.exchangeName ?? 'JSE',
      timezone:          meta.timezone,
      lastUpdated:       new Date().toISOString(),
    });
  } catch (err: any) {
    sendError(res, 'Could not fetch live stats: ' + err.message, 500);
  }
}

// ── GET /companies/ticker/:ticker/news ────────────────────────────────────────
// Returns up to 10 recent news articles from Yahoo Finance.
// Always fetches live — no caching needed, news is inherently time-sensitive.
// This is the "news ingestion" layer of the profile pipeline.
export async function getCompanyNews(req: Request, res: Response): Promise<void> {
  const ticker = req.params.ticker.toUpperCase();
  const symbol = `${ticker}.JO`;
  try {
    const { data } = await axios.get(
      'https://query1.finance.yahoo.com/v1/finance/search',
      {
        params: {
          q:                        symbol,
          newsCount:                10,
          enableNavLinks:           false,
          enableEnhancedTrivialQuery: true,
        },
        headers: YAHOO_HEADERS,
        timeout: 12000,
      }
    );

    const articles = (data?.news || []).map((n: any) => ({
      id:             n.uuid,
      title:          n.title,
      publisher:      n.publisher,
      link:           n.link,
      publishedAt:    new Date(n.providerPublishTime * 1000).toISOString(),
      thumbnail:      n.thumbnail?.resolutions?.find((r: any) => r.tag === 'original')?.url
                   ?? n.thumbnail?.resolutions?.[0]?.url
                   ?? null,
      relatedTickers: n.relatedTickers ?? [],
      type:           n.type,
    }));

    sendSuccess(res, articles);
  } catch (err: any) {
    // Non-critical — return empty array rather than error
    sendSuccess(res, []);
  }
}
