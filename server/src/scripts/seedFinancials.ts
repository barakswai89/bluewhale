/**
 * seedFinancials.ts — uses exact columns from the live database.
 * Run: npx ts-node -r dotenv/config src/scripts/seedFinancials.ts
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const seedData = [
  { ticker: 'SHP', revenue: 247800, costOfRevenue: 193200, grossProfit: 54600, operatingExpenses: 38200, ebitda: 18400, ebit: 13200, interestExpense: 2100, taxExpense: 2800, netIncome: 8900, totalAssets: 98500, currentAssets: 38600, totalLiabilities: 65200, currentLiabilities: 42100, totalEquity: 33300, cash: 12400, debt: 8900, operatingCashFlow: 16800, investingCashFlow: -8100, financingCashFlow: -6200, freeCashFlow: 9600, eps: 14.82, dividendPerShare: 6.40, currency: 'ZAR' },
  { ticker: 'MTN', revenue: 196400, costOfRevenue: 98200, grossProfit: 98200, operatingExpenses: 42100, ebitda: 74800, ebit: 28600, interestExpense: 18400, taxExpense: 8900, netIncome: 4200, totalAssets: 412000, currentAssets: 86400, totalLiabilities: 312000, currentLiabilities: 98200, totalEquity: 100000, cash: 28400, debt: 142000, operatingCashFlow: 58200, investingCashFlow: -38600, financingCashFlow: -24200, freeCashFlow: 25800, eps: 2.18, dividendPerShare: 1.50, currency: 'ZAR' },
  { ticker: 'SBK', revenue: 142800, costOfRevenue: 48200, grossProfit: 94600, operatingExpenses: 48400, ebitda: 52000, ebit: 46200, interestExpense: 48200, taxExpense: 10800, netIncome: 38400, totalAssets: 2840000, currentAssets: 420000, totalLiabilities: 2680000, currentLiabilities: 380000, totalEquity: 160000, cash: 184000, debt: 280000, operatingCashFlow: 52400, investingCashFlow: -182000, financingCashFlow: 124000, freeCashFlow: 47600, eps: 24.16, dividendPerShare: 14.80, currency: 'ZAR' },
  { ticker: 'NPN', revenue: 8420, costOfRevenue: 3740, grossProfit: 4680, operatingExpenses: 3060, ebitda: 1420, ebit: 980, interestExpense: 280, taxExpense: 320, netIncome: 3240, totalAssets: 42800, currentAssets: 8600, totalLiabilities: 18400, currentLiabilities: 4800, totalEquity: 24400, cash: 4200, debt: 9800, operatingCashFlow: 1840, investingCashFlow: 2840, financingCashFlow: -3200, freeCashFlow: 1420, eps: 7.84, dividendPerShare: 0.48, currency: 'USD' },
  { ticker: 'FSR', revenue: 118400, costOfRevenue: 36000, grossProfit: 82400, operatingExpenses: 34200, ebitda: 54000, ebit: 48200, interestExpense: 36000, taxExpense: 11200, netIncome: 40800, totalAssets: 2180000, currentAssets: 320000, totalLiabilities: 2040000, currentLiabilities: 280000, totalEquity: 140000, cash: 162000, debt: 224000, operatingCashFlow: 48600, investingCashFlow: -142000, financingCashFlow: 98000, freeCashFlow: 44800, eps: 22.84, dividendPerShare: 13.20, currency: 'ZAR' },
  { ticker: 'ABG', revenue: 104200, costOfRevenue: 31800, grossProfit: 72400, operatingExpenses: 33800, ebitda: 44000, ebit: 38600, interestExpense: 31800, taxExpense: 8400, netIncome: 22800, totalAssets: 1820000, currentAssets: 280000, totalLiabilities: 1700000, currentLiabilities: 240000, totalEquity: 120000, cash: 142000, debt: 186000, operatingCashFlow: 38400, investingCashFlow: -124000, financingCashFlow: 84000, freeCashFlow: 35600, eps: 28.42, dividendPerShare: 15.80, currency: 'ZAR' },
  { ticker: 'NED', revenue: 78400, costOfRevenue: 21600, grossProfit: 56800, operatingExpenses: 28400, ebitda: 32000, ebit: 28400, interestExpense: 21600, taxExpense: 6800, netIncome: 21200, totalAssets: 1420000, currentAssets: 180000, totalLiabilities: 1320000, currentLiabilities: 160000, totalEquity: 100000, cash: 98000, debt: 142000, operatingCashFlow: 28800, investingCashFlow: -92000, financingCashFlow: 62000, freeCashFlow: 26600, eps: 46.82, dividendPerShare: 24.80, currency: 'ZAR' },
  { ticker: 'CPI', revenue: 62400, costOfRevenue: 14200, grossProfit: 48200, operatingExpenses: 23400, ebitda: 28400, ebit: 24800, interestExpense: 13800, taxExpense: 6200, netIncome: 19600, totalAssets: 384000, currentAssets: 62000, totalLiabilities: 332000, currentLiabilities: 48000, totalEquity: 52000, cash: 42000, debt: 82000, operatingCashFlow: 24200, investingCashFlow: -48000, financingCashFlow: 22000, freeCashFlow: 22400, eps: 166.42, dividendPerShare: 68.00, currency: 'ZAR' },
  { ticker: 'SLM', revenue: 82400, costOfRevenue: 40400, grossProfit: 42000, operatingExpenses: 25200, ebitda: 20000, ebit: 16800, interestExpense: 4200, taxExpense: 3800, netIncome: 12400, totalAssets: 1240000, currentAssets: 140000, totalLiabilities: 1140000, currentLiabilities: 120000, totalEquity: 100000, cash: 28400, debt: 42000, operatingCashFlow: 18400, investingCashFlow: -42000, financingCashFlow: 22000, freeCashFlow: 17200, eps: 5.84, dividendPerShare: 3.20, currency: 'ZAR' },
  { ticker: 'DSY', revenue: 98400, costOfRevenue: 56400, grossProfit: 42000, operatingExpenses: 27200, ebitda: 18400, ebit: 14800, interestExpense: 3800, taxExpense: 3200, netIncome: 10200, totalAssets: 248000, currentAssets: 62000, totalLiabilities: 192000, currentLiabilities: 48000, totalEquity: 56000, cash: 18400, debt: 28000, operatingCashFlow: 16800, investingCashFlow: -18000, financingCashFlow: -8400, freeCashFlow: 14400, eps: 9.42, dividendPerShare: 4.20, currency: 'ZAR' },
  { ticker: 'BID', revenue: 142800, costOfRevenue: 104400, grossProfit: 38400, operatingExpenses: 26000, ebitda: 16800, ebit: 12400, interestExpense: 2800, taxExpense: 2600, netIncome: 8200, totalAssets: 98400, currentAssets: 42000, totalLiabilities: 64200, currentLiabilities: 38400, totalEquity: 34200, cash: 14200, debt: 18400, operatingCashFlow: 14200, investingCashFlow: -5200, financingCashFlow: -8400, freeCashFlow: 10400, eps: 14.28, dividendPerShare: 7.80, currency: 'ZAR' },
  { ticker: 'BHG', revenue: 128400, costOfRevenue: 85600, grossProfit: 42800, operatingExpenses: 28600, ebitda: 18400, ebit: 14200, interestExpense: 2400, taxExpense: 3200, netIncome: 9800, totalAssets: 88400, currentAssets: 38400, totalLiabilities: 56800, currentLiabilities: 34200, totalEquity: 31600, cash: 8400, debt: 14200, operatingCashFlow: 16200, investingCashFlow: -6200, financingCashFlow: -8800, freeCashFlow: 12000, eps: 19.84, dividendPerShare: 10.40, currency: 'ZAR' },
  { ticker: 'REM', revenue: 62400, costOfRevenue: 34000, grossProfit: 28400, operatingExpenses: 16000, ebitda: 14800, ebit: 12400, interestExpense: 1800, taxExpense: 2400, netIncome: 9800, totalAssets: 248000, currentAssets: 18400, totalLiabilities: 82000, currentLiabilities: 14200, totalEquity: 166000, cash: 8400, debt: 22000, operatingCashFlow: 14200, investingCashFlow: -8400, financingCashFlow: -4200, freeCashFlow: 12400, eps: 15.42, dividendPerShare: 8.80, currency: 'ZAR' },
  { ticker: 'TBS', revenue: 42800, costOfRevenue: 30400, grossProfit: 12400, operatingExpenses: 7600, ebitda: 6400, ebit: 4800, interestExpense: 680, taxExpense: 980, netIncome: 3200, totalAssets: 28400, currentAssets: 12400, totalLiabilities: 16800, currentLiabilities: 9800, totalEquity: 11600, cash: 2800, debt: 3800, operatingCashFlow: 4800, investingCashFlow: -1800, financingCashFlow: -2400, freeCashFlow: 3600, eps: 14.82, dividendPerShare: 8.40, currency: 'ZAR' },
  { ticker: 'MRP', revenue: 38400, costOfRevenue: 20200, grossProfit: 18200, operatingExpenses: 11400, ebitda: 8400, ebit: 6800, interestExpense: 680, taxExpense: 1600, netIncome: 4800, totalAssets: 22400, currentAssets: 12800, totalLiabilities: 12400, currentLiabilities: 8400, totalEquity: 10000, cash: 4200, debt: 2800, operatingCashFlow: 6800, investingCashFlow: -2200, financingCashFlow: -3800, freeCashFlow: 5400, eps: 22.84, dividendPerShare: 14.60, currency: 'ZAR' },
  { ticker: 'TFG', revenue: 54200, costOfRevenue: 25800, grossProfit: 28400, operatingExpenses: 20200, ebitda: 12400, ebit: 8400, interestExpense: 1800, taxExpense: 1800, netIncome: 5200, totalAssets: 48400, currentAssets: 18400, totalLiabilities: 32400, currentLiabilities: 16800, totalEquity: 16000, cash: 2800, debt: 8400, operatingCashFlow: 8400, investingCashFlow: -3200, financingCashFlow: -4200, freeCashFlow: 6000, eps: 11.42, dividendPerShare: 6.20, currency: 'ZAR' },
  { ticker: 'PIK', revenue: 98400, costOfRevenue: 76000, grossProfit: 22400, operatingExpenses: 24200, ebitda: 4200, ebit: -1800, interestExpense: 2800, taxExpense: 0, netIncome: -3200, totalAssets: 38400, currentAssets: 14200, totalLiabilities: 42800, currentLiabilities: 22400, totalEquity: -4400, cash: 1800, debt: 12400, operatingCashFlow: 2800, investingCashFlow: -2200, financingCashFlow: 2400, freeCashFlow: 1400, eps: -5.84, dividendPerShare: 0, currency: 'ZAR' },
  { ticker: 'SPP', revenue: 148400, costOfRevenue: 130000, grossProfit: 18400, operatingExpenses: 14200, ebitda: 6800, ebit: 4200, interestExpense: 1800, taxExpense: 680, netIncome: 1800, totalAssets: 42800, currentAssets: 18400, totalLiabilities: 32400, currentLiabilities: 16800, totalEquity: 10400, cash: 3200, debt: 8400, operatingCashFlow: 4800, investingCashFlow: -2200, financingCashFlow: -1800, freeCashFlow: 3600, eps: 5.42, dividendPerShare: 2.80, currency: 'ZAR' },
  { ticker: 'OMU', revenue: 124800, costOfRevenue: 82800, grossProfit: 42000, operatingExpenses: 29600, ebitda: 16000, ebit: 12400, interestExpense: 4200, taxExpense: 2800, netIncome: 8400, totalAssets: 742000, currentAssets: 80000, totalLiabilities: 682000, currentLiabilities: 72000, totalEquity: 60000, cash: 18400, debt: 28000, operatingCashFlow: 14200, investingCashFlow: -18000, financingCashFlow: 4200, freeCashFlow: 13000, eps: 1.84, dividendPerShare: 0.90, currency: 'ZAR' },
  { ticker: 'SOL', revenue: 242000, costOfRevenue: 160000, grossProfit: 82000, operatingExpenses: 63600, ebitda: 42000, ebit: 18400, interestExpense: 8400, taxExpense: 4200, netIncome: 8200, totalAssets: 248000, currentAssets: 62000, totalLiabilities: 148000, currentLiabilities: 42000, totalEquity: 100000, cash: 12400, debt: 68000, operatingCashFlow: 32000, investingCashFlow: -22000, financingCashFlow: -14000, freeCashFlow: 14000, eps: 13.42, dividendPerShare: 5.00, currency: 'ZAR' },
  { ticker: 'APN', revenue: 48400, costOfRevenue: 26000, grossProfit: 22400, operatingExpenses: 12600, ebitda: 12400, ebit: 9800, interestExpense: 3200, taxExpense: 1600, netIncome: 4800, totalAssets: 98400, currentAssets: 28400, totalLiabilities: 68400, currentLiabilities: 18400, totalEquity: 30000, cash: 4200, debt: 38400, operatingCashFlow: 12400, investingCashFlow: -4200, financingCashFlow: -6800, freeCashFlow: 9600, eps: 10.84, dividendPerShare: 4.20, currency: 'ZAR' },
  { ticker: 'LHC', revenue: 32400, costOfRevenue: 24000, grossProfit: 8400, operatingExpenses: 5200, ebitda: 5800, ebit: 3200, interestExpense: 1800, taxExpense: 680, netIncome: 1400, totalAssets: 42800, currentAssets: 8400, totalLiabilities: 28400, currentLiabilities: 8800, totalEquity: 14400, cash: 2400, debt: 12400, operatingCashFlow: 4200, investingCashFlow: -2400, financingCashFlow: -1800, freeCashFlow: 2400, eps: 1.42, dividendPerShare: 0.68, currency: 'ZAR' },
  { ticker: 'NTC', revenue: 28400, costOfRevenue: 21200, grossProfit: 7200, operatingExpenses: 3400, ebitda: 5400, ebit: 3800, interestExpense: 980, taxExpense: 880, netIncome: 2400, totalAssets: 28400, currentAssets: 6800, totalLiabilities: 18400, currentLiabilities: 6400, totalEquity: 10000, cash: 2800, debt: 6800, operatingCashFlow: 4800, investingCashFlow: -1800, financingCashFlow: -2400, freeCashFlow: 3600, eps: 2.84, dividendPerShare: 1.40, currency: 'ZAR' },
  { ticker: 'GRT', revenue: 18400, costOfRevenue: 4200, grossProfit: 14200, operatingExpenses: 5800, ebitda: 10800, ebit: 8400, interestExpense: 3200, taxExpense: 280, netIncome: 6800, totalAssets: 148000, currentAssets: 8400, totalLiabilities: 72000, currentLiabilities: 6800, totalEquity: 76000, cash: 3800, debt: 42000, operatingCashFlow: 9800, investingCashFlow: -4200, financingCashFlow: -4800, freeCashFlow: 7000, eps: 1.42, dividendPerShare: 1.30, currency: 'ZAR' },
  { ticker: 'GLN', revenue: 217000, costOfRevenue: 198600, grossProfit: 18400, operatingExpenses: 11600, ebitda: 14200, ebit: 6800, interestExpense: 1200, taxExpense: 2400, netIncome: 1680, totalAssets: 142000, currentAssets: 48000, totalLiabilities: 98000, currentLiabilities: 42000, totalEquity: 44000, cash: 8400, debt: 28000, operatingCashFlow: 9800, investingCashFlow: -6800, financingCashFlow: -4200, freeCashFlow: 5000, eps: 0.12, dividendPerShare: 0.08, currency: 'USD' },
  { ticker: 'GFI', revenue: 4820, costOfRevenue: 2580, grossProfit: 2240, operatingExpenses: 1160, ebitda: 1980, ebit: 1080, interestExpense: 142, taxExpense: 280, netIncome: 680, totalAssets: 12400, currentAssets: 1840, totalLiabilities: 5800, currentLiabilities: 1240, totalEquity: 6600, cash: 680, debt: 2400, operatingCashFlow: 1680, investingCashFlow: -1200, financingCashFlow: -480, freeCashFlow: 700, eps: 0.74, dividendPerShare: 0.28, currency: 'USD' },
  { ticker: 'HAR', revenue: 42800, costOfRevenue: 26000, grossProfit: 16800, operatingExpenses: 8400, ebitda: 12400, ebit: 8400, interestExpense: 680, taxExpense: 2200, netIncome: 5800, totalAssets: 52800, currentAssets: 14200, totalLiabilities: 22400, currentLiabilities: 8400, totalEquity: 30400, cash: 8400, debt: 6800, operatingCashFlow: 12400, investingCashFlow: -7200, financingCashFlow: -3800, freeCashFlow: 6200, eps: 10.84, dividendPerShare: 4.80, currency: 'ZAR' },
  { ticker: 'DRD', revenue: 8400, costOfRevenue: 5200, grossProfit: 3200, operatingExpenses: 1400, ebitda: 2800, ebit: 1800, interestExpense: 42, taxExpense: 480, netIncome: 1400, totalAssets: 8400, currentAssets: 2800, totalLiabilities: 2400, currentLiabilities: 1200, totalEquity: 6000, cash: 1800, debt: 680, operatingCashFlow: 2400, investingCashFlow: -1400, financingCashFlow: -680, freeCashFlow: 1200, eps: 0.62, dividendPerShare: 0.28, currency: 'ZAR' },
  { ticker: 'SSW', revenue: 82400, costOfRevenue: 74000, grossProfit: 8400, operatingExpenses: 12600, ebitda: 8400, ebit: -4200, interestExpense: 4200, taxExpense: 0, netIncome: -8400, totalAssets: 98400, currentAssets: 22400, totalLiabilities: 62000, currentLiabilities: 18400, totalEquity: 36400, cash: 8400, debt: 28400, operatingCashFlow: 6800, investingCashFlow: -10200, financingCashFlow: 2400, freeCashFlow: -1600, eps: -4.84, dividendPerShare: 0, currency: 'ZAR' },
  { ticker: 'IMP', revenue: 62400, costOfRevenue: 54000, grossProfit: 8400, operatingExpenses: 5600, ebitda: 8400, ebit: 2800, interestExpense: 1200, taxExpense: 680, netIncome: 1400, totalAssets: 98400, currentAssets: 18400, totalLiabilities: 38400, currentLiabilities: 12400, totalEquity: 60000, cash: 8400, debt: 18400, operatingCashFlow: 8400, investingCashFlow: -8400, financingCashFlow: -2800, freeCashFlow: 1600, eps: 1.84, dividendPerShare: 0.68, currency: 'ZAR' },
  { ticker: 'NPH', revenue: 28400, costOfRevenue: 21600, grossProfit: 6800, operatingExpenses: 4400, ebitda: 5200, ebit: 2400, interestExpense: 980, taxExpense: 480, netIncome: 1800, totalAssets: 62800, currentAssets: 8400, totalLiabilities: 28400, currentLiabilities: 6400, totalEquity: 34400, cash: 4200, debt: 14200, operatingCashFlow: 4800, investingCashFlow: -4200, financingCashFlow: -1200, freeCashFlow: 1600, eps: 2.84, dividendPerShare: 1.20, currency: 'ZAR' },
  { ticker: 'ARI', revenue: 22400, costOfRevenue: 15600, grossProfit: 6800, operatingExpenses: 3600, ebitda: 5200, ebit: 3200, interestExpense: 280, taxExpense: 880, netIncome: 2800, totalAssets: 38400, currentAssets: 8400, totalLiabilities: 12400, currentLiabilities: 4800, totalEquity: 26000, cash: 4200, debt: 2800, operatingCashFlow: 4200, investingCashFlow: -2400, financingCashFlow: -2200, freeCashFlow: 2400, eps: 14.84, dividendPerShare: 8.40, currency: 'ZAR' },
  { ticker: 'EXX', revenue: 28400, costOfRevenue: 20000, grossProfit: 8400, operatingExpenses: 3600, ebitda: 7200, ebit: 4800, interestExpense: 480, taxExpense: 1200, netIncome: 3800, totalAssets: 42800, currentAssets: 12400, totalLiabilities: 14400, currentLiabilities: 6800, totalEquity: 28400, cash: 6800, debt: 4200, operatingCashFlow: 6800, investingCashFlow: -3200, financingCashFlow: -4800, freeCashFlow: 4400, eps: 24.84, dividendPerShare: 14.80, currency: 'ZAR' },
  { ticker: 'AGL', revenue: 72400, costOfRevenue: 60000, grossProfit: 12400, operatingExpenses: 10000, ebitda: 8400, ebit: 2400, interestExpense: 1200, taxExpense: 480, netIncome: 1200, totalAssets: 98400, currentAssets: 18400, totalLiabilities: 38400, currentLiabilities: 12400, totalEquity: 60000, cash: 6800, debt: 14200, operatingCashFlow: 6800, investingCashFlow: -6200, financingCashFlow: -2400, freeCashFlow: 2000, eps: 4.84, dividendPerShare: 2.40, currency: 'ZAR' },
  { ticker: 'BAW', revenue: 42800, costOfRevenue: 30400, grossProfit: 12400, operatingExpenses: 8200, ebitda: 6800, ebit: 4200, interestExpense: 1200, taxExpense: 980, netIncome: 2800, totalAssets: 48400, currentAssets: 18400, totalLiabilities: 28400, currentLiabilities: 14200, totalEquity: 20000, cash: 4200, debt: 8400, operatingCashFlow: 6200, investingCashFlow: -3200, financingCashFlow: -2800, freeCashFlow: 3800, eps: 12.84, dividendPerShare: 6.40, currency: 'ZAR' },
  { ticker: 'INL', revenue: 28400, costOfRevenue: 10000, grossProfit: 18400, operatingExpenses: 10000, ebitda: 10200, ebit: 8400, interestExpense: 8400, taxExpense: 2000, netIncome: 6200, totalAssets: 548000, currentAssets: 80000, totalLiabilities: 502000, currentLiabilities: 72000, totalEquity: 46000, cash: 42000, debt: 52000, operatingCashFlow: 8400, investingCashFlow: -28000, financingCashFlow: 18000, freeCashFlow: 7720, eps: 7.84, dividendPerShare: 4.00, currency: 'ZAR' },
  { ticker: 'MCG', revenue: 62400, costOfRevenue: 40000, grossProfit: 22400, operatingExpenses: 18200, ebitda: 9800, ebit: 4200, interestExpense: 2400, taxExpense: 0, netIncome: -2800, totalAssets: 42800, currentAssets: 12400, totalLiabilities: 38400, currentLiabilities: 18400, totalEquity: 4400, cash: 4200, debt: 12400, operatingCashFlow: 6800, investingCashFlow: -3200, financingCashFlow: -2800, freeCashFlow: 4400, eps: -4.84, dividendPerShare: 0, currency: 'ZAR' },
  { ticker: 'TKG', revenue: 42800, costOfRevenue: 24400, grossProfit: 18400, operatingExpenses: 14200, ebitda: 9800, ebit: 4200, interestExpense: 2400, taxExpense: 680, netIncome: 1800, totalAssets: 62800, currentAssets: 12400, totalLiabilities: 42800, currentLiabilities: 14200, totalEquity: 20000, cash: 2800, debt: 18400, operatingCashFlow: 8400, investingCashFlow: -7800, financingCashFlow: -2400, freeCashFlow: 1600, eps: 3.84, dividendPerShare: 1.60, currency: 'ZAR' },
  { ticker: 'SNT', revenue: 28400, costOfRevenue: 21600, grossProfit: 6800, operatingExpenses: 2600, ebitda: 5200, ebit: 4200, interestExpense: 480, taxExpense: 1080, netIncome: 3200, totalAssets: 48400, currentAssets: 18400, totalLiabilities: 34200, currentLiabilities: 14200, totalEquity: 14200, cash: 4200, debt: 4800, operatingCashFlow: 4200, investingCashFlow: -3800, financingCashFlow: -2800, freeCashFlow: 3720, eps: 28.42, dividendPerShare: 18.40, currency: 'ZAR' },
  { ticker: 'HYP', revenue: 4800, costOfRevenue: 1000, grossProfit: 3800, operatingExpenses: 1400, ebitda: 3200, ebit: 2400, interestExpense: 980, taxExpense: 42, netIncome: 2000, totalAssets: 42800, currentAssets: 2400, totalLiabilities: 18400, currentLiabilities: 2800, totalEquity: 24400, cash: 880, debt: 12400, operatingCashFlow: 2800, investingCashFlow: -1200, financingCashFlow: -1800, freeCashFlow: 1920, eps: 8.42, dividendPerShare: 7.20, currency: 'ZAR' },
  { ticker: 'RDF', revenue: 8400, costOfRevenue: 2200, grossProfit: 6200, operatingExpenses: 2400, ebitda: 5200, ebit: 3800, interestExpense: 1800, taxExpense: 42, netIncome: 2800, totalAssets: 98400, currentAssets: 4200, totalLiabilities: 52000, currentLiabilities: 4800, totalEquity: 46400, cash: 1800, debt: 28400, operatingCashFlow: 4800, investingCashFlow: -2800, financingCashFlow: -1200, freeCashFlow: 3000, eps: 0.42, dividendPerShare: 0.38, currency: 'ZAR' },
  { ticker: 'SPG', revenue: 38400, costOfRevenue: 30000, grossProfit: 8400, operatingExpenses: 5200, ebitda: 5200, ebit: 3200, interestExpense: 980, taxExpense: 680, netIncome: 2200, totalAssets: 28400, currentAssets: 12400, totalLiabilities: 16800, currentLiabilities: 9800, totalEquity: 11600, cash: 2400, debt: 4800, operatingCashFlow: 4200, investingCashFlow: -1800, financingCashFlow: -1800, freeCashFlow: 3000, eps: 4.84, dividendPerShare: 2.40, currency: 'ZAR' },
  { ticker: 'PRX', revenue: 8420, costOfRevenue: 3740, grossProfit: 4680, operatingExpenses: 3700, ebitda: 1420, ebit: 980, interestExpense: 280, taxExpense: 320, netIncome: 3240, totalAssets: 38400, currentAssets: 7200, totalLiabilities: 14800, currentLiabilities: 4200, totalEquity: 23600, cash: 3800, debt: 8400, operatingCashFlow: 1640, investingCashFlow: 2400, financingCashFlow: -2800, freeCashFlow: 1260, eps: 0.68, dividendPerShare: 0.22, currency: 'USD' },
  { ticker: 'BTI', revenue: 27280, costOfRevenue: 4800, grossProfit: 22480, operatingExpenses: 13560, ebitda: 12400, ebit: 8920, interestExpense: 2400, taxExpense: 2200, netIncome: 2680, totalAssets: 98400, currentAssets: 12400, totalLiabilities: 72000, currentLiabilities: 14200, totalEquity: 26400, cash: 2800, debt: 38400, operatingCashFlow: 9800, investingCashFlow: -1200, financingCashFlow: -8400, freeCashFlow: 9120, eps: 1.18, dividendPerShare: 0.72, currency: 'GBP' },
  { ticker: 'CFR', revenue: 21400, costOfRevenue: 7200, grossProfit: 14200, operatingExpenses: 9400, ebitda: 6200, ebit: 4800, interestExpense: 180, taxExpense: 980, netIncome: 3680, totalAssets: 42800, currentAssets: 18400, totalLiabilities: 12400, currentLiabilities: 8400, totalEquity: 30400, cash: 8400, debt: 2400, operatingCashFlow: 4800, investingCashFlow: -1800, financingCashFlow: -2800, freeCashFlow: 4120, eps: 6.42, dividendPerShare: 2.80, currency: 'EUR' },
  { ticker: 'MNP', revenue: 8400, costOfRevenue: 6000, grossProfit: 2400, operatingExpenses: 1420, ebitda: 1680, ebit: 980, interestExpense: 280, taxExpense: 280, netIncome: 580, totalAssets: 12400, currentAssets: 3200, totalLiabilities: 6800, currentLiabilities: 2400, totalEquity: 5600, cash: 680, debt: 2800, operatingCashFlow: 1400, investingCashFlow: -980, financingCashFlow: -680, freeCashFlow: 720, eps: 1.18, dividendPerShare: 0.48, currency: 'USD' },
];

// FY2025 period end date (end of fiscal year)
const PERIOD_END = new Date('2025-12-31T00:00:00.000Z');
const FISCAL_PERIOD = 'FY2025';
const STATEMENT_TYPE = 'ANNUAL';

async function main() {
  console.log(`[seed] Starting FY2025 seed for ${seedData.length} companies...`);
  let saved = 0, skipped = 0;

  for (const data of seedData) {
    const company = await prisma.company.findFirst({
      where: { ticker: data.ticker },
      select: { id: true },
    });

    if (!company) {
      console.log(`[seed] ⚠ ${data.ticker} not found, skipping.`);
      skipped++;
      continue;
    }

    const existing = await (prisma as any).financialStatement.findFirst({
      where: {
        companyId: company.id,
        fiscalYear: 2025,
        statementType: STATEMENT_TYPE,
      },
      select: { id: true },
    });

    const payload = {
      fiscalYear: 2025,
      fiscalPeriod: FISCAL_PERIOD,
      periodEnd: PERIOD_END,
      statementType: STATEMENT_TYPE,
      currency: data.currency,
      revenue: data.revenue,
      costOfRevenue: data.costOfRevenue,
      grossProfit: data.grossProfit,
      operatingExpenses: data.operatingExpenses,
      ebitda: data.ebitda,
      ebit: data.ebit,
      interestExpense: data.interestExpense,
      taxExpense: data.taxExpense,
      netIncome: data.netIncome,
      totalAssets: data.totalAssets,
      currentAssets: data.currentAssets,
      totalLiabilities: data.totalLiabilities,
      currentLiabilities: data.currentLiabilities,
      totalEquity: data.totalEquity,
      cash: data.cash,
      debt: data.debt,
      operatingCashFlow: data.operatingCashFlow,
      investingCashFlow: data.investingCashFlow,
      financingCashFlow: data.financingCashFlow,
      freeCashFlow: data.freeCashFlow,
      eps: data.eps,
      dividendPerShare: data.dividendPerShare,
      updatedAt: new Date(),
    };

    if (existing) {
      await (prisma as any).financialStatement.update({
        where: { id: existing.id },
        data: payload,
      });
    } else {
      await (prisma as any).financialStatement.create({
        data: { companyId: company.id, ...payload },
      });
    }

    console.log(`[seed] ✓ ${data.ticker} FY2025 saved.`);
    saved++;
  }

  console.log(`[seed] Complete. ${saved} saved, ${skipped} skipped.`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('[seed] Fatal error:', err);
  process.exit(1);
});
