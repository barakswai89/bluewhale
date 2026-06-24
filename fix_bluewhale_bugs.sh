#!/usr/bin/env bash
# =============================================================================
# BlueWhale Bug & Security Fix Script
# Run from WSL: bash fix_bluewhale_bugs.sh
# Target: /mnt/c/users/hp/documents/sargotec/bluewhale/bluewhale-prd
# =============================================================================
set -e

PROJECT="/mnt/c/users/hp/documents/sargotec/bluewhale/bluewhale-prd"
CLIENT="$PROJECT/client"
SERVER="$PROJECT/server"

echo "========================================"
echo " BlueWhale Bug Fix Script"
echo " Target: $PROJECT"
echo "========================================"

# ── Sanity check ─────────────────────────────────────────────────────────────
if [ ! -d "$PROJECT" ]; then
  echo "❌  Project directory not found: $PROJECT"
  echo "    Update the PROJECT variable at the top of this script and re-run."
  exit 1
fi

cd "$PROJECT"

# =============================================================================
# FIX 1 — LoginPage.tsx  (hardcoded fetch → authService)
# Applied by copying the pre-fixed file (see LoginPage.tsx artifact).
# =============================================================================
echo ""
echo "[ 1/6 ] Patching client/src/pages/LoginPage.tsx ..."

# The fixed file should sit next to this script; copy it into place.
FIXED_LOGIN="$(dirname "$0")/LoginPage.tsx"
if [ -f "$FIXED_LOGIN" ]; then
  cp "$FIXED_LOGIN" "$CLIENT/src/pages/LoginPage.tsx"
  echo "  ✅  LoginPage.tsx replaced from fixed copy."
else
  # Inline patch as fallback — uses python for reliable multi-line replacement
  python3 - "$CLIENT/src/pages/LoginPage.tsx" << 'PYEOF'
import re, sys

path = sys.argv[1]
src  = open(path, encoding="utf-8").read()

# 1a. Add authService import after the BlueWhaleLogo import
src = src.replace(
    "import BlueWhaleLogo from '../components/BlueWhaleLogo';",
    "import BlueWhaleLogo from '../components/BlueWhaleLogo';\nimport { authService } from '../services/auth.service';"
)

# 1b. Replace the raw fetch block inside handleSubmit
old_fetch = r"""    try {
      const response = await fetch\('https://bluewhale-production\.up\.railway\.app/api/v1/auth/' \+ \(isLogin \? 'login' : 'register'\), \{
        method: 'POST',
        headers: \{
          'Content-Type': 'application/json',
        \},
        body: JSON\.stringify\(formData\),
      \}\);

      const data = await response\.json\(\);

      if \(data\.success\) \{
        localStorage\.setItem\('token', data\.data\.token\);
        localStorage\.setItem\('user', JSON\.stringify\(data\.data\.user\)\);
        navigate\('/dashboard'\);
      \} else \{
        setError\(data\.error \|\| 'Authentication failed'\);
      \}
    \} catch \(err: any\) \{
      setError\('Network error\. Please try again\.'\);
      console\.error\('Auth error:', err\);
    \}"""

new_fetch = """    try {
      // ✅ FIX: Use centralized authService (api.ts + VITE_API_URL).
      // Removes the hardcoded Railway URL that caused the CORS/404 failure.
      if (isLogin) {
        await authService.login({ email: formData.email, password: formData.password });
      } else {
        await authService.register({
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
        });
      }
      // authService already persists token + user to localStorage
      navigate('/dashboard');
    } catch (err: any) {
      const message =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Network error. Please try again.';
      setError(message);
      console.error('Auth error:', err);
    }"""

src = re.sub(old_fetch, new_fetch, src)
open(path, "w", encoding="utf-8").write(src)
print("  ✅  LoginPage.tsx patched via inline Python.")
PYEOF
fi

# =============================================================================
# FIX 2 — ScraperDashboard.tsx  (fully hardcoded URL — no env fallback)
# =============================================================================
echo ""
echo "[ 2/6 ] Patching client/src/pages/ScraperDashboard.tsx ..."

python3 - "$CLIENT/src/pages/ScraperDashboard.tsx" << 'PYEOF'
import sys
path = sys.argv[1]
src  = open(path, encoding="utf-8").read()
old  = "const API = 'https://bluewhale-production.up.railway.app/api/v1';"
new  = "const API = import.meta.env.VITE_API_URL || 'https://bluewhale-production-afb0.up.railway.app/api/v1';"
if old in src:
    open(path, "w", encoding="utf-8").write(src.replace(old, new))
    print("  ✅  ScraperDashboard.tsx patched.")
else:
    print("  ⚠️   Pattern not found in ScraperDashboard.tsx — already fixed or file changed.")
PYEOF

# =============================================================================
# FIX 3 — SENSfeed.tsx  (raw fetch with hardcoded URL → api axios instance)
# =============================================================================
echo ""
echo "[ 3/6 ] Patching client/src/components/SENSfeed.tsx ..."

python3 - "$CLIENT/src/components/SENSfeed.tsx" << 'PYEOF'
import sys, re
path = sys.argv[1]
src  = open(path, encoding="utf-8").read()

# Add api import if not already present
if "import { api }" not in src and "from '../services/api'" not in src:
    # Insert after the last existing import line
    src = re.sub(
        r"(import .+?;\n)(?!import)",
        r"\1import { api } from '../services/api';\n",
        src,
        count=1
    )

# Replace the hardcoded fetch URL
old = "const response = await fetch(`https://bluewhale-production.up.railway.app/api/v1/scraper/sens/${ticker}`,"
new = "const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://bluewhale-production-afb0.up.railway.app/api/v1'}/scraper/sens/${ticker}`,"

if old in src:
    src = src.replace(old, new)
    open(path, "w", encoding="utf-8").write(src)
    print("  ✅  SENSfeed.tsx patched.")
else:
    print("  ⚠️   Pattern not found in SENSfeed.tsx — already fixed or file changed.")
PYEOF

# =============================================================================
# FIX 4 — jwt.utils.ts  (consolidate JWT_SECRET to use env.ts, not own fallback)
# =============================================================================
echo ""
echo "[ 4/6 ] Patching server/src/utils/jwt.utils.ts ..."

python3 - "$SERVER/src/utils/jwt.utils.ts" << 'PYEOF'
import sys
path = sys.argv[1]
src  = open(path, encoding="utf-8").read()

old = """import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';"""

new = """import jwt from 'jsonwebtoken';
import { env } from '../config/env';

// ✅ FIX: Read from the single source-of-truth (env.ts) instead of
// duplicating the fallback here. Previously this file had its own
// 'dev-secret-change-me' default that could silently shadow a misconfigured
// production env var, producing verifiable but insecure tokens.
const JWT_SECRET   = env.JWT_SECRET;
const JWT_EXPIRES_IN = env.JWT_EXPIRES_IN;"""

if "dev-secret-change-me" in src:
    open(path, "w", encoding="utf-8").write(src.replace(old, new))
    print("  ✅  jwt.utils.ts patched.")
else:
    print("  ⚠️   Pattern not found in jwt.utils.ts — already fixed or file changed.")
PYEOF

# =============================================================================
# FIX 5 — auth.service.ts (CLIENT)  (safe JSON.parse in getCurrentUser)
# =============================================================================
echo ""
echo "[ 5/6 ] Patching client/src/services/auth.service.ts ..."

python3 - "$CLIENT/src/services/auth.service.ts" << 'PYEOF'
import sys
path = sys.argv[1]
src  = open(path, encoding="utf-8").read()

old = """  getCurrentUser(): any | null {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },"""

new = """  getCurrentUser(): any | null {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      // ✅ FIX: Corrupted localStorage value (partial write, XSS, etc.) would
      // previously throw an uncaught exception and crash the app on load.
      // Clear the bad entry and return null so the user is redirected to login.
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      return null;
    }
  },"""

if "return userStr ? JSON.parse(userStr) : null;" in src:
    open(path, "w", encoding="utf-8").write(src.replace(old, new))
    print("  ✅  auth.service.ts (client) patched.")
else:
    print("  ⚠️   Pattern not found in auth.service.ts — already fixed or file changed.")
PYEOF

# =============================================================================
# FIX 6 — auth.controller.ts (SERVER)  (500 vs 400 for infrastructure errors)
# =============================================================================
echo ""
echo "[ 6/6 ] Patching server/src/controllers/auth.controller.ts ..."

python3 - "$SERVER/src/controllers/auth.controller.ts" << 'PYEOF'
import sys
path = sys.argv[1]
src  = open(path, encoding="utf-8").read()

old_register = """  async register(req: Request, res: Response): Promise<void> {
    try {
      const result = await authService.register(req.body);
      sendSuccess(res, result, 'Registration successful', 201);
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }"""

new_register = """  async register(req: Request, res: Response): Promise<void> {
    try {
      const result = await authService.register(req.body);
      sendSuccess(res, result, 'Registration successful', 201);
    } catch (error: any) {
      // ✅ FIX: Distinguish user-facing validation errors (400) from
      // infrastructure failures like DB connection errors (500).
      // Prisma errors contain a 'code' property; domain errors do not.
      const isPrismaError = 'code' in error;
      const statusCode = isPrismaError ? 500 : 400;
      sendError(res, isPrismaError ? 'Internal server error' : error.message, statusCode);
    }
  }"""

old_login = """  async login(req: Request, res: Response): Promise<void> {
    try {
      const result = await authService.login(req.body);
      sendSuccess(res, result, 'Login successful');
    } catch (error: any) {
      sendError(res, error.message, 401);
    }
  }"""

new_login = """  async login(req: Request, res: Response): Promise<void> {
    try {
      const result = await authService.login(req.body);
      sendSuccess(res, result, 'Login successful');
    } catch (error: any) {
      // ✅ FIX: Same Prisma vs domain error discrimination as register.
      const isPrismaError = 'code' in error;
      const statusCode = isPrismaError ? 500 : 401;
      sendError(res, isPrismaError ? 'Internal server error' : error.message, statusCode);
    }
  }"""

changed = False
if "sendError(res, error.message, 400);" in src:
    src = src.replace(old_register, new_register)
    changed = True
if "sendError(res, error.message, 401);" in src:
    src = src.replace(old_login, new_login)
    changed = True

if changed:
    open(path, "w", encoding="utf-8").write(src)
    print("  ✅  auth.controller.ts (server) patched.")
else:
    print("  ⚠️   Patterns not found in auth.controller.ts — already fixed or file changed.")
PYEOF

# =============================================================================
# GIT — Stage, commit, and push all changes
# =============================================================================
echo ""
echo "========================================"
echo " Committing and pushing to GitHub ..."
echo "========================================"

cd "$PROJECT"

# Confirm we're in a git repo
if [ ! -d ".git" ]; then
  echo "❌  No .git directory found in $PROJECT"
  echo "    Make sure you're pointing at the repo root."
  exit 1
fi

git add \
  client/src/pages/LoginPage.tsx \
  client/src/pages/ScraperDashboard.tsx \
  client/src/components/SENSfeed.tsx \
  client/src/services/auth.service.ts \
  server/src/utils/jwt.utils.ts \
  server/src/controllers/auth.controller.ts

git diff --cached --stat

git commit -m "fix: resolve CORS/404 signup failure and latent security bugs

- LoginPage: replace hardcoded fetch with authService (fixes CORS/404 on register)
- ScraperDashboard: add VITE_API_URL env fallback (was fully hardcoded)
- SENSfeed: use VITE_API_URL env fallback (was hardcoded raw fetch)
- jwt.utils: consolidate JWT_SECRET to env.ts (remove weak 'dev-secret' fallback)
- auth.service (client): wrap localStorage JSON.parse in try/catch (crash on corruption)
- auth.controller (server): return 500 for Prisma errors, not 400/401"

git push

echo ""
echo "========================================"
echo " ✅  All fixes applied and pushed."
echo "========================================"
echo ""
echo " Next steps:"
echo "  1. Trigger a new Netlify deploy (env vars bake in at build time)"
echo "  2. Confirm VITE_API_URL is set in Netlify dashboard"
echo "  3. Confirm CLIENT_URL is set in Railway dashboard"
echo "  4. Rotate FMP_API_KEY if .env was ever committed to git"
echo "========================================"
