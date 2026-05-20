// server/src/services/reportScraper.service.ts
import axios from 'axios';
import * as cheerio from 'cheerio';
import https from 'https';

const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

const axiosInstance = axios.create({
  httpsAgent,
  timeout: 30000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1'
  }
});

interface ScrapedReport {
  title: string;
  url: string;
  type: 'Annual Report' | 'Interim Results' | 'Trading Statement' | 'Financial Statement' | 'Integrated Report';
  date?: Date;
}

// Two-pass filter: reject noise first, then require a quality match.
// Goal: only Annual Reports and Financial Results reach the database.
function isFinancialReport(title: string, url: string): boolean {
  const combined = `${title} ${url}`.toLowerCase();

  // ── Pass 1: Hard reject — these are never financial reports ──────────────
  const rejectKeywords = [
    // Governance / legal noise
    'paia', 'privacy policy', 'cookie', 'terms and conditions', 'terms & conditions',
    'code of conduct', 'code of ethics', 'memorandum', 'charter', 'manual',
    'proxy form', 'proxy circular', 'notice to shareholders', 'notice of annual',
    'general meeting', 'special meeting',
    // Announcement / release noise (not the actual report)
    'sens announcement', 'sens release',
    'media release', 'press release',
    'circular to shareholder',
    // Supplementary / ESG / CSR — not financial statements
    'supplementary information', 'supplementary slides',
    'modern slavery', 'uk modern slavery', 'modern slavery statement',
    'sustainability report', 'esg report', 'social report',
    'transformation report', 'bbbee report',
    // Interactive / web-based (no downloadable PDF)
    'view interactive', 'interactive report', 'interactive book',
    'interactive annual',
  ];

  for (const keyword of rejectKeywords) {
    if (combined.includes(keyword)) {
      console.log(`   ⛔ Rejected: "${title}" (contains "${keyword}")`);
      return false;
    }
  }

  // ── Pass 2: Quality accept — must match a financial report pattern ────────
  const acceptKeywords = [
    // Annual reports
    'annual report', 'integrated report', 'integrated annual report',
    'annual financial', 'annual results',
    // Financial results (interim + full year both valuable)
    'financial result', 'analysis of financial result',
    'audited result', 'abridged consolidated',
    'interim result', 'half year result', 'half-year result',
    'full year result', 'full-year result',
    'results presentation',
    // Specific statement types
    'financial statement', 'income statement',
    'summary financial statement',
    // Period markers that indicate a results document
    'fy 20', 'fy20', 'h1 20', 'h2 20',
    // Trailing years in URL (e.g. annual-report-2024.pdf)
  ];

  for (const keyword of acceptKeywords) {
    if (combined.includes(keyword)) {
      return true;
    }
  }

  // ── Pass 3: Narrow PDF fallback — year in URL path AND pdf extension ──────
  // Only accept if the URL itself (not just title) contains a financial keyword
  if (url.toLowerCase().endsWith('.pdf')) {
    const urlLower = url.toLowerCase();
    const urlFinancialHints = [
      'annual', 'result', 'report', 'financial', 'interim',
      'integrated', 'audited', 'abridged'
    ];
    const hasUrlHint = urlFinancialHints.some(hint => urlLower.includes(hint));
    const hasYear    = /20\d{2}/.test(urlLower);
    if (hasUrlHint && hasYear) return true;
  }

  return false;
}

// 🎯 EDGE CASE HANDLERS FOR SPECIFIC COMPANIES

// NEW: BHP with increased timeout and retry logic
async function scrapeBHP(): Promise<ScrapedReport[]> {
  console.log(`   🔧 Using BHP-specific scraper (increased timeout)...`);
  
  const urls = [
    'https://www.bhp.com/investors/annual-reporting',
    'https://www.bhp.com/investors/annual-reports'
  ];

  for (const url of urls) {
    try {
      console.log(`   ⏳ Fetching ${url} (may take 20-30 seconds)...`);
      const response = await axiosInstance.get(url);
      const $ = cheerio.load(response.data);
      const reports: ScrapedReport[] = [];

      $('a[href]').each((_, el) => {
        const $el = $(el);
        const href = $el.attr('href');
        const text = $el.text().trim() || $el.attr('title') || '';

        if (!href) return;

        let fullUrl = href;
        if (href.startsWith('/')) {
          fullUrl = `https://www.bhp.com${href}`;
        } else if (!href.startsWith('http')) {
          fullUrl = `https://www.bhp.com/${href}`;
        }

        if (fullUrl.toLowerCase().endsWith('.pdf')) {
          if (isFinancialReport(text, fullUrl)) {
            reports.push({
              title: text || 'BHP Annual Report',
              url: fullUrl,
              type: classifyReport(text, fullUrl),
              date: extractDate(text)
            });
          }
        }
      });

      if (reports.length > 0) {
        console.log(`   ✅ BHP: Found ${reports.length} reports from ${url}`);
        return reports.slice(0, 10);
      }
    } catch (e: any) {
      console.log(`   ⚠️ BHP: ${url} failed - ${e.message}`);
      continue;
    }
  }

  return [];
}

// NPH - Northam Platinum - Try alternative URLs
async function scrapeNPH(): Promise<ScrapedReport[]> {
  console.log(`   🔧 Using NPH-specific scraper...`);
  
  const urls = [
    'https://www.northam.co.za/investors',
    'https://www.northam.co.za/investor-relations',
    'https://www.northam.co.za/our-business/investor-centre'
  ];
  
  for (const url of urls) {
    try {
      const response = await axiosInstance.get(url);
      const $ = cheerio.load(response.data);
      const reports: ScrapedReport[] = [];

      $('a[href*="pdf"], a[href*="report"]').each((_, el) => {
        const $el = $(el);
        const href = $el.attr('href');
        const text = $el.text().trim();

        if (href && href.toLowerCase().includes('pdf') && isFinancialReport(text, href)) {
          let fullUrl = href.startsWith('http') ? href : `https://www.northam.co.za${href}`;
          reports.push({
            title: text || 'NPH Financial Report',
            url: fullUrl,
            type: classifyReport(text, fullUrl),
            date: extractDate(text)
          });
        }
      });

      if (reports.length > 0) {
        console.log(`   ✅ NPH: Found ${reports.length} reports from ${url}`);
        return reports;
      }
    } catch (e) {
      continue;
    }
  }
  
  return [];
}

// CPI - Capitec - Requires special headers to bypass 403
async function scrapeCPI(): Promise<ScrapedReport[]> {
  console.log(`   🔧 Using CPI-specific scraper (bypassing 403)...`);
  
  const specialAxios = axios.create({
    httpsAgent,
    timeout: 20000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-ZA,en;q=0.9',
      'Referer': 'https://www.google.com/',
      'Cache-Control': 'no-cache'
    }
  });

  const urls = [
    'https://www.capitecbank.co.za/about-us/investor-relations',
    'https://www.capitecbank.co.za/about-us/investor-centre',
    'https://www.capitecbank.co.za/about-us/annual-reports'
  ];

  for (const url of urls) {
    try {
      await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds before request
      const response = await specialAxios.get(url);
      const $ = cheerio.load(response.data);
      const reports: ScrapedReport[] = [];

      $('a[href$=".pdf"]').each((_, el) => {
        const $el = $(el);
        const href = $el.attr('href');
        const text = $el.text().trim();

        if (href && isFinancialReport(text, href)) {
          let fullUrl = href.startsWith('http') ? href : `https://www.capitecbank.co.za${href}`;
          reports.push({
            title: text || 'CPI Financial Report',
            url: fullUrl,
            type: classifyReport(text, fullUrl),
            date: extractDate(text)
          });
        }
      });

      if (reports.length > 0) {
        console.log(`   ✅ CPI: Found ${reports.length} reports from ${url}`);
        return reports;
      }
    } catch (e) {
      console.log(`   ⚠️ CPI: ${url} failed - ${(e as any).message}`);
      continue;
    }
  }

  return [];
}

// UPDATED: MTN - Parse interactive reporting page to find PDFs
async function scrapeMTN(): Promise<ScrapedReport[]> {
  console.log(`   🔧 Using MTN-specific scraper (parsing interactive page)...`);
  
  try {
    // Main investors page has links to report suites
    const response = await axiosInstance.get('https://www.mtn.com/investors/');
    const $ = cheerio.load(response.data);
    const reports: ScrapedReport[] = [];

    // Look for links to annual reports page
    const annualReportsLink = $('a[href*="annual-reports"]').first().attr('href');
    
    if (annualReportsLink) {
      const fullUrl = annualReportsLink.startsWith('http') 
        ? annualReportsLink 
        : `https://www.mtn.com${annualReportsLink}`;
      
      console.log(`   📄 Found MTN annual reports page: ${fullUrl}`);
      
      // Fetch the annual reports page
      const reportsPage = await axiosInstance.get(fullUrl);
      const $reports = cheerio.load(reportsPage.data);
      
      // Find PDF links or interactive report links
      $reports('a[href*="pdf"], a[href*="mtn-investor.com"], a[href*="report"]').each((_, el) => {
        const $el = $reports(el);
        const href = $el.attr('href');
        const text = $el.text().trim() || $el.parent().text().trim();
        
        if (href && (href.includes('pdf') || href.includes('mtn-investor') || href.includes('reporting'))) {
          if (isFinancialReport(text, href)) {
            let reportUrl = href.startsWith('http') ? href : `https://www.mtn.com${href}`;
            
            reports.push({
              title: text || 'MTN Annual Report',
              url: reportUrl,
              type: classifyReport(text, reportUrl),
              date: extractDate(text)
            });
          }
        }
      });
    }

    if (reports.length > 0) {
      console.log(`   ✅ MTN: Found ${reports.length} reports`);
      return reports;
    }

    // Fallback: Try FY 2024/2025 reporting suite directly
    const reportingSuite = await axiosInstance.get('https://mtn-investor.com/fy-2024-reporting-suite/index.php');
    const $suite = cheerio.load(reportingSuite.data);
    
    $suite('a[href$=".pdf"]').each((_, el) => {
      const $el = $suite(el);
      const href = $el.attr('href');
      const text = $el.text().trim();
      
      if (href && isFinancialReport(text, href)) {
        reports.push({
          title: text || 'MTN Financial Report',
          url: href.startsWith('http') ? href : `https://mtn-investor.com${href}`,
          type: classifyReport(text, href),
          date: new Date(2024, 5, 30)
        });
      }
    });

    if (reports.length > 0) {
      console.log(`   ✅ MTN: Found ${reports.length} reports from reporting suite`);
    }

    return reports;
  } catch (e: any) {
    console.log(`   ⚠️ MTN scraper failed: ${e.message}`);
    return [];
  }
}

// NPN - Naspers/Prosus - Try both brands
async function scrapeNPN(): Promise<ScrapedReport[]> {
  console.log(`   🔧 Using NPN-specific scraper (Naspers/Prosus)...`);
  
  const urls = [
    'https://www.naspers.com/investors',
    'https://www.naspers.com/investors/financial-information',
    'https://www.prosus.com/investors',
    'https://www.prosus.com/investors/reports-and-results'
  ];

  for (const url of urls) {
    try {
      const response = await axiosInstance.get(url);
      const $ = cheerio.load(response.data);
      const reports: ScrapedReport[] = [];

      $('a[href$=".pdf"]').each((_, el) => {
        const $el = $(el);
        const href = $el.attr('href');
        const text = $el.text().trim() || $el.attr('title') || '';

        if (href && isFinancialReport(text, href)) {
          let fullUrl = href.startsWith('http') ? href : `${new URL(url).origin}${href}`;
          reports.push({
            title: text || 'NPN Financial Report',
            url: fullUrl,
            type: classifyReport(text, fullUrl),
            date: extractDate(text)
          });
        }
      });

      if (reports.length > 0) {
        console.log(`   ✅ NPN: Found ${reports.length} reports from ${url}`);
        return reports;
      }
    } catch (e) {
      continue;
    }
  }

  return [];
}

// SHP - Shoprite - Try alternative paths
async function scrapeSHP(): Promise<ScrapedReport[]> {
  console.log(`   🔧 Using SHP-specific scraper...`);
  
  const urls = [
    'https://www.shopriteholdings.co.za/investor-centre.html',
    'https://www.shopriteholdings.co.za/investor-centre/financial-results.html',
    'https://www.shopriteholdings.co.za/investor-centre/integrated-reports.html',
    'https://www.shoprite.co.za/corporate/investor-relations.html'
  ];

  for (const url of urls) {
    try {
      const response = await axiosInstance.get(url);
      const $ = cheerio.load(response.data);
      const reports: ScrapedReport[] = [];

      $('a[href$=".pdf"]').each((_, el) => {
        const $el = $(el);
        const href = $el.attr('href');
        const text = $el.text().trim();

        if (href && isFinancialReport(text, href)) {
          let fullUrl = href.startsWith('http') ? href : `https://www.shopriteholdings.co.za${href}`;
          reports.push({
            title: text || 'SHP Financial Report',
            url: fullUrl,
            type: classifyReport(text, fullUrl),
            date: extractDate(text)
          });
        }
      });

      if (reports.length > 0) {
        console.log(`   ✅ SHP: Found ${reports.length} reports from ${url}`);
        return reports;
      }
    } catch (e) {
      continue;
    }
  }

  return [];
}

// VOD - Vodacom - Try alternative structure
async function scrapeVOD(): Promise<ScrapedReport[]> {
  console.log(`   🔧 Using VOD-specific scraper...`);
  
  const urls = [
    'https://vodacom.com/investor-relations.php',
    'https://www.vodacom.com/vodacom/investor-centre',
    'https://www.vodacom.com/vodacom/investors'
  ];

  for (const url of urls) {
    try {
      const response = await axiosInstance.get(url);
      const $ = cheerio.load(response.data);
      const reports: ScrapedReport[] = [];

      $('a[href*="pdf"]').each((_, el) => {
        const $el = $(el);
        const href = $el.attr('href');
        const text = $el.text().trim();

        if (href && isFinancialReport(text, href)) {
          let fullUrl = href.startsWith('http') ? href : `https://www.vodacom.com${href}`;
          reports.push({
            title: text || 'VOD Financial Report',
            url: fullUrl,
            type: classifyReport(text, fullUrl),
            date: extractDate(text)
          });
        }
      });

      if (reports.length > 0) {
        console.log(`   ✅ VOD: Found ${reports.length} reports from ${url}`);
        return reports;
      }
    } catch (e) {
      continue;
    }
  }

  return [];
}

// TBS - Tiger Brands - Try alternative paths
async function scrapeTBS(): Promise<ScrapedReport[]> {
  console.log(`   🔧 Using TBS-specific scraper...`);
  
  const urls = [
    'https://www.tigerbrands.com/investors.html',
    'https://www.tigerbrands.com/investors/financial-information.html',
    'https://www.tigerbrands.com/our-company/investor-relations.html'
  ];

  for (const url of urls) {
    try {
      const response = await axiosInstance.get(url);
      const $ = cheerio.load(response.data);
      const reports: ScrapedReport[] = [];

      $('a[href$=".pdf"]').each((_, el) => {
        const $el = $(el);
        const href = $el.attr('href');
        const text = $el.text().trim();

        if (href && isFinancialReport(text, href)) {
          let fullUrl = href.startsWith('http') ? href : `https://www.tigerbrands.com${href}`;
          reports.push({
            title: text || 'TBS Financial Report',
            url: fullUrl,
            type: classifyReport(text, fullUrl),
            date: extractDate(text)
          });
        }
      });

      if (reports.length > 0) {
        console.log(`   ✅ TBS: Found ${reports.length} reports from ${url}`);
        return reports;
      }
    } catch (e) {
      continue;
    }
  }

  return [];
}

// UPDATED: SBK - Parse interactive reports page properly
async function scrapeSBK(): Promise<ScrapedReport[]> {
  console.log(`   🔧 Using SBK-specific scraper (parsing interactive page)...`);
  
  try {
    // Main reporting page
    const response = await axiosInstance.get('https://reporting.standardbank.com/');
    const $ = cheerio.load(response.data);
    const reports: ScrapedReport[] = [];

    // Find links to integrated reports or annual reports
    $('a[href*="integrated"], a[href*="annual"], a[href*="report"], a[href*="pdf"]').each((_, el) => {
      const $el = $(el);
      const href = $el.attr('href');
      const text = $el.text().trim() || $el.attr('title') || '';
      
      if (href) {
        // Check if it's a direct PDF or another page
        if (href.toLowerCase().endsWith('.pdf')) {
          if (isFinancialReport(text, href)) {
            const fullUrl = href.startsWith('http') ? href : `https://reporting.standardbank.com${href}`;
            reports.push({
              title: text || 'SBK Integrated Report',
              url: fullUrl,
              type: classifyReport(text, fullUrl),
              date: extractDate(text)
            });
          }
        } else if (href.includes('integrated') || href.includes('annual') || href.includes('20')) {
          // It's a page to another report - follow it
          const pageUrl = href.startsWith('http') ? href : `https://reporting.standardbank.com${href}`;
          
          // Add a title based on the link text
          if (text && text.length > 5 && /20\d{2}/.test(text)) {
            reports.push({
              title: `SBK - ${text}`,
              url: pageUrl,
              type: 'Integrated Report',
              date: extractDate(text)
            });
          }
        }
      }
    });

    if (reports.length > 0) {
      console.log(`   ✅ SBK: Found ${reports.length} reports`);
      return reports.slice(0, 10);
    }

    // Fallback: Try specific year pages
    for (const year of [2024, 2023, 2022]) {
      try {
        const yearPage = await axiosInstance.get(`https://reporting.standardbank.com/${year}/`);
        const $year = cheerio.load(yearPage.data);
        
        $year('a[href$=".pdf"]').each((_, el) => {
          const $el = $year(el);
          const href = $el.attr('href');
          const text = $el.text().trim();
          
          if (href && isFinancialReport(text, href)) {
            reports.push({
              title: `SBK Integrated Report ${year}`,
              url: href.startsWith('http') ? href : `https://reporting.standardbank.com${href}`,
              type: 'Integrated Report',
              date: new Date(year, 5, 30)
            });
          }
        });
        
        if (reports.length > 0) break;
      } catch {
        continue;
      }
    }

    if (reports.length > 0) {
      console.log(`   ✅ SBK: Found ${reports.length} reports from year pages`);
    }

    return reports;
  } catch (e: any) {
    console.log(`   ⚠️ SBK scraper failed: ${e.message}`);
    return [];
  }
}

// APN - Aspen - Try investor centre
async function scrapeAPN(): Promise<ScrapedReport[]> {
  console.log(`   🔧 Using APN-specific scraper...`);
  
  const urls = [
    'https://www.aspenpharma.com/our-company/investor-centre/',
    'https://www.aspenpharma.com/investor-centre/',
    'https://www.aspenpharma.com/about/investors/'
  ];

  for (const url of urls) {
    try {
      const response = await axiosInstance.get(url);
      const $ = cheerio.load(response.data);
      const reports: ScrapedReport[] = [];

      $('a[href$=".pdf"]').each((_, el) => {
        const $el = $(el);
        const href = $el.attr('href');
        const text = $el.text().trim();

        if (href && isFinancialReport(text, href)) {
          let fullUrl = href.startsWith('http') ? href : `https://www.aspenpharma.com${href}`;
          reports.push({
            title: text || 'APN Financial Report',
            url: fullUrl,
            type: classifyReport(text, fullUrl),
            date: extractDate(text)
          });
        }
      });

      if (reports.length > 0) {
        console.log(`   ✅ APN: Found ${reports.length} reports from ${url}`);
        return reports;
      }
    } catch (e) {
      continue;
    }
  }

  return [];
}

// AGL - Anglo American Platinum - Try alternative
async function scrapeAGL(): Promise<ScrapedReport[]> {
  console.log(`   🔧 Using AGL-specific scraper...`);
  
  const urls = [
    'https://www.angloamericanplatinum.com/about-us/investor-centre',
    'https://www.angloamericanplatinum.com/investors',
    'https://www.angloamericanplatinum.com/about-us/investors'
  ];

  for (const url of urls) {
    try {
      const response = await axiosInstance.get(url);
      const $ = cheerio.load(response.data);
      const reports: ScrapedReport[] = [];

      $('a[href$=".pdf"]').each((_, el) => {
        const $el = $(el);
        const href = $el.attr('href');
        const text = $el.text().trim();

        if (href && isFinancialReport(text, href)) {
          let fullUrl = href.startsWith('http') ? href : `https://www.angloamericanplatinum.com${href}`;
          reports.push({
            title: text || 'AGL Financial Report',
            url: fullUrl,
            type: classifyReport(text, fullUrl),
            date: extractDate(text)
          });
        }
      });

      if (reports.length > 0) {
        console.log(`   ✅ AGL: Found ${reports.length} reports from ${url}`);
        return reports;
      }
    } catch (e) {
      continue;
    }
  }

  return [];
}

async function scrapeFromCompanyIRPage(ticker: string, companyWebsite: string): Promise<ScrapedReport[]> {
  const edgeCaseHandlers: Record<string, () => Promise<ScrapedReport[]>> = {
    'NPH': scrapeNPH,
    'BHG': scrapeBHP, // BHG = BHP Group Ltd on JSE
    'MTN': scrapeMTN,
    'NPN': scrapeNPN,
    'SHP': scrapeSHP,
    'VOD': scrapeVOD,
    'TBS': scrapeTBS,
    'SBK': scrapeSBK,
    'APN': scrapeAPN,
    'AGL': scrapeAGL
  };

  // CPI is impossible to scrape (403 with enterprise bot protection)
  // Skip it entirely and show empty
  if (ticker === 'CPI') {
    console.log(`   ⚠️ CPI has enterprise bot protection - cannot scrape`);
    console.log(`   💡 Recommendation: Add CPI reports manually to database`);
    return [];
  }

  if (edgeCaseHandlers[ticker]) {
    console.log(`   🎯 Detected edge case company: ${ticker}`);
    return await edgeCaseHandlers[ticker]();
  }

  // Standard scraper for working companies
  // Expanded verified IR pages — static HTML that cheerio can parse
  // Ordered: highest-confidence pages first
  const verifiedIRPages: Record<string, string[]> = {
    // Originally verified ─────────────────────────────────────
    'GFI': ['https://www.goldfields.com/investors/reports/'],
    'SOL': ['https://www.sasol.com/investor-centre/integrated-reports'],
    'FSR': ['https://www.firstrand.co.za/investors/financial-results/'],
    // Mining & Resources ──────────────────────────────────────
    'EXX': [
      'https://www.exxaro.com/investor-centre/integrated-reports/',
      'https://www.exxaro.com/investor-centre/results-and-reports/',
    ],
    'HAR': [
      'https://www.harmony.co.za/investors/reports/',
      'https://www.harmony.co.za/investors/financial-results/',
    ],
    'ARI': [
      'https://www.africanrainbow.co.za/investor-centre/annual-reports/',
      'https://www.africanrainbow.co.za/investor-centre/results-presentations/',
    ],
    'DRD': ['https://www.drdgold.com/investors/results-presentations/'],
    'NPH': [
      'https://www.northamplatinum.com/investors/annual-reports/',
      'https://www.northamplatinum.com/investors/results/',
    ],
    // Financials ──────────────────────────────────────────────
    'SLM': [
      'https://www.sanlam.com/investor-relations/financial-results/',
      'https://www.sanlam.com/investor-relations/reports-and-results/',
    ],
    'OMU': [
      'https://www.oldmutual.com/investor-relations/results-reports/',
      'https://www.oldmutual.com/investor-relations/annual-reports/',
    ],
    'DSY': ['https://www.discovery.co.za/corporate/investor-relations'],
    'GRT': [
      'https://www.growthpoint.co.za/investor-relations/results-and-presentations/',
      'https://www.growthpoint.co.za/investor-relations/annual-report/',
    ],
    // Consumer & Retail ───────────────────────────────────────
    'WHL': [
      'https://www.woolworthsholdings.co.za/investor/results-and-presentations/',
      'https://www.woolworthsholdings.co.za/investor/annual-report/',
    ],
    'TFG': [
      'https://www.tfggroup.co.za/investor-relations/results-and-reports/',
      'https://www.tfggroup.co.za/investor-relations/annual-reports/',
    ],
    'MRP': [
      'https://mrpg.com/investor-relations/results-presentations/',
      'https://mrpg.com/investor-relations/annual-reports/',
    ],
    'SPP': [
      'https://www.spargroup.com/investors/annual-reports/',
      'https://www.spargroup.com/investors/results/',
    ],
    // Healthcare ──────────────────────────────────────────────
    'APN': [
      'https://www.aspenpharma.com/investor-relations/results-and-reports/',
      'https://www.aspenpharma.com/investor-relations/annual-reports/',
    ],
    'NTC': [
      'https://www.netcare.co.za/Investor-Relations/Financial-Reports',
      'https://www.netcare.co.za/Investor-Relations/Annual-Report',
    ],
    'LHC': [
      'https://www.lifehealthcare.co.za/investors/annual-reports/',
      'https://www.lifehealthcare.co.za/investors/results/',
    ],
    // Industrials ─────────────────────────────────────────────
    'BAW': [
      'https://www.barloworld.com/investors/annual-reports/',
      'https://www.barloworld.com/investors/results-presentations/',
    ],
    // Telecom ─────────────────────────────────────────────────
    'TKG': [
      'https://www.telkom.co.za/ir/annual-report/',
      'https://www.telkom.co.za/ir/results/',
    ],
    // Media / Tech ────────────────────────────────────────────
    'MCG': [
      'https://www.multichoicegroup.com/investor-relations/results-presentations/',
      'https://www.multichoicegroup.com/investor-relations/annual-report/',
    ],
    // ── Previously uncovered 20 companies ────────────────────

    // Financials
    'ABG': [
      'https://www.absa.africa/absaafrica/investor-relations/annual-integrated-reports/',
      'https://www.absa.co.za/investor-relations/results/',
    ],
    'NED': [
      'https://www.nedbank.co.za/content/nedbank/desktop/gt/en/investor-relations/results/annual-report.html',
      'https://www.nedbank.co.za/content/nedbank/desktop/gt/en/investor-relations/results.html',
    ],
    'SNT': [
      'https://www.santam.co.za/investor-relations/annual-reports/',
      'https://www.santam.co.za/investor-relations/results/',
    ],
    'REM': [
      'https://www.remgro.com/investors/annual-financial-statements/',
      'https://www.remgro.com/investors/',
    ],
    'INL': [
      'https://www.investec.com/en_za/about-investec/investor-relations/results-and-presentations.html',
      'https://www.investec.com/en_gb/welcome-to-investec/investor-relations/results-publications.html',
    ],
    'RDF': [
      'https://www.redefine.co.za/investor-centre/results-presentations/',
      'https://www.redefine.co.za/investor-centre/',
    ],
    'HYP': [
      'https://www.hyprop.co.za/investor-relations/integrated-reports/',
      'https://www.hyprop.co.za/investor-relations/results/',
    ],

    // Materials / Mining
    'IMP': [
      'https://www.implats.co.za/implats/reports.asp',
      'https://www.implats.co.za/implats/investor-centre.asp',
    ],
    'SSW': [
      'https://www.sibanyestillwater.com/investors/results-reports/',
      'https://www.sibanyestillwater.com/investors/annual-reports/',
    ],
    'GLN': [
      'https://www.glencore.com/investors/reports-results',
      'https://www.glencore.com/investors/annual-reports',
    ],

    // Technology
    'PRX': [
      'https://www.prosus.com/investors/reports-results/',
      'https://www.prosus.com/investors/',
    ],

    // Consumer / Retail
    'BID': [
      'https://www.bidcorp.com/investor-relations/results-and-presentations/',
      'https://www.bidcorp.com/investor-relations/',
    ],
    'PIK': [
      'https://www.pnpinvestors.co.za/results/',
      'https://www.pnpinvestors.co.za/',
    ],
    'TRU': [
      'https://www.truworths.co.za/investor/results.aspx',
      'https://www.truworths.co.za/investor/',
    ],
    'CFR': [
      'https://www.richemont.com/investors/reports-and-results/',
      'https://www.richemont.com/investors/',
    ],

    // Industrials
    'BTI': [
      'https://www.bat.com/annualreport',
      'https://www.bat.com/group/sites/UK__9D9KCY.nsf/vwPagesWebLive/DOBB7HJ3',
    ],
    'MNP': [
      'https://www.mondigroup.com/investors/results-and-reports/',
      'https://www.mondigroup.com/investors/annual-reports/',
    ],
    'WBO': [
      'https://www.wbho.co.za/investor-centre/',
      'https://www.wbho.co.za/investor-centre/annual-reports/',
    ],
    'SPG': [
      'https://www.supergroup.co.za/investor-centre/reports/',
      'https://www.supergroup.co.za/investor-centre/',
    ],
  };

  const urls = verifiedIRPages[ticker];
  if (!urls) {
    return [];
  }

  console.log(`   🌐 Trying verified IR pages for ${ticker}...`);
  
  for (const url of urls) {
    try {
      const response = await axiosInstance.get(url);
      const $ = cheerio.load(response.data);
      const reports: ScrapedReport[] = [];

      $('a[href]').each((_, el) => {
        const $el = $(el);
        const href = $el.attr('href');
        const text = $el.text().trim() || $el.attr('title') || $el.attr('aria-label') || '';

        if (!href) return;

        let fullUrl = href;
        if (href.startsWith('/')) {
          const baseUrl = new URL(url);
          fullUrl = `${baseUrl.protocol}//${baseUrl.host}${href}`;
        } else if (!href.startsWith('http')) {
          const baseUrl = new URL(url);
          fullUrl = `${baseUrl.origin}/${href}`;
        }

        if (fullUrl.toLowerCase().endsWith('.pdf')) {
          if (isFinancialReport(text, fullUrl)) {
            reports.push({
              title: text || `${ticker} Financial Report`,
              url: fullUrl,
              type: classifyReport(text, fullUrl),
              date: extractDate(text)
            });
            console.log(`   ✅ Found: "${text}"`);
          }
        }
      });

      if (reports.length > 0) {
        console.log(`   📊 Found ${reports.length} reports from ${url}`);
        return reports.slice(0, 10);
      }
    } catch (error: any) {
      console.log(`   ❌ ${url} failed: ${error.message}`);
      continue;
    }
  }

  return [];
}


function classifyReport(title: string, url: string): ScrapedReport['type'] {
  const combined = `${title} ${url}`.toLowerCase();
  
  if (combined.includes('integrated') || combined.includes('annual')) {
    return 'Annual Report';
  }
  if (combined.includes('interim') || combined.includes('half') || combined.includes('h1') || combined.includes('h2')) {
    return 'Interim Results';
  }
  if (combined.includes('trading')) {
    return 'Trading Statement';
  }
  if (combined.includes('financial')) {
    return 'Financial Statement';
  }
  
  return 'Integrated Report';
}

function extractDate(text: string): Date {
  const yearMatch = text.match(/20\d{2}/);
  if (yearMatch) {
    const year = parseInt(yearMatch[0]);
    return new Date(year, 5, 30);
  }
  return new Date();
}

export async function scrapeCompanyReports(
  ticker: string,
  companyWebsite: string,
  companyName: string = ''
): Promise<ScrapedReport[]> {
  console.log(`📄 Scraping reports for ${ticker}...`);
  
  const reports = await scrapeFromCompanyIRPage(ticker, companyWebsite);
  
  if (reports.length === 0) {
    console.log(`   ⚠️ No real reports found for ${ticker} - will show empty`);
  } else {
    console.log(`   ✅ Found ${reports.length} real reports for ${ticker}`);
  }

  const uniqueReports = Array.from(
    new Map(reports.map(r => [r.url, r])).values()
  );

  return uniqueReports
    .sort((a, b) => {
      const dateA = a.date || new Date(0);
      const dateB = b.date || new Date(0);
      return dateB.getTime() - dateA.getTime();
    })
    .slice(0, 10);
}

export async function scrapeAllCompanyReports(
  companies: Array<{ ticker: string; website: string; id: string; name: string }>
): Promise<Map<string, ScrapedReport[]>> {
  const results = new Map<string, ScrapedReport[]>();
  
  console.log(`\n🌊 Starting bulk report scraping for ${companies.length} companies...\n`);
  console.log(`⚠️ Only real reports will be stored - NO MOCK DATA\n`);
  
  for (const company of companies) {
    try {
      const reports = await scrapeCompanyReports(company.ticker, company.website, company.name);
      results.set(company.id, reports);
      
      // Rate limiting - 2 seconds between companies
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error: any) {
      console.error(`❌ Failed to scrape ${company.ticker}:`, error.message);
      results.set(company.id, []);
    }
  }
  
  const totalReports = Array.from(results.values()).reduce((sum, reports) => sum + reports.length, 0);
  const companiesWithReports = Array.from(results.values()).filter(reports => reports.length > 0).length;
  
  console.log(`\n✨ Report scraping complete!`);
  console.log(`📊 Total real reports found: ${totalReports}`);
  console.log(`📈 Companies with reports: ${companiesWithReports}/${companies.length}`);
  console.log(`⚠️ Companies without reports: ${companies.length - companiesWithReports}/${companies.length}\n`);
  
  return results;
}