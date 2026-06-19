import jwt from 'jsonwebtoken';
import { env } from '../config/env';

// ✅ FIX: Read from the single source-of-truth (env.ts) instead of
// duplicating the fallback here. Previously this file had its own
// 'dev-secret-change-me' default that could silently shadow a misconfigured
// production env var, producing verifiable but insecure tokens.
const JWT_SECRET   = env.JWT_SECRET;
const JWT_EXPIRES_IN = env.JWT_EXPIRES_IN;

export const signToken = (payload: object) => 
  jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as any);

export const generateToken = signToken;

export const verifyToken = (token: string) => 
  jwt.verify(token, JWT_SECRET);
