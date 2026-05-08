// FILE: server/src/config/env.ts
// FIXED: Added FMP_API_KEY and ANTHROPIC_API_KEY — both were completely missing,
// causing sync.service.ts to read undefined and all FMP calls to fail silently.

import dotenv from 'dotenv';
dotenv.config();

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000'),

  // Database
  DATABASE_URL: process.env.DATABASE_URL!,

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'bluewhale-super-secret-change-in-production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

  // Frontend
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',

  // ✅ FIXED: These were completely missing from the original env.ts
  FMP_API_KEY: process.env.FMP_API_KEY || '',
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',

  // Redis (optional)
  REDIS_URL: process.env.REDIS_URL,
};

// Warn loudly at startup if critical keys are missing
if (!env.FMP_API_KEY) {
  console.warn('⚠️  WARNING: FMP_API_KEY is not set — all price/metric syncs will fail');
}
if (!env.ANTHROPIC_API_KEY) {
  console.warn('⚠️  WARNING: ANTHROPIC_API_KEY is not set — AI Hub features will fail');
}
