# Debug Session: Security Bug Fixes

## Symptom
Multiple critical and security issues are blocking the safe deployment of the `.exe` file. Issues range from CI/CD build failures (Wine signing on Linux), bundle size bloat (1.4MB JS file), unused DB drivers (`sqlite3`), IPC message validation flaws, CORS misconfiguration, database migration hazards, and JWT secret loss risks.

**When:** During the build process and app runtime.
**Expected:** The app should build successfully on a Windows runner, start quickly (sub-second), safely handle database migrations/IPC, and securely manage the JWT secret.
**Actual:** App fails to build properly for Windows on Linux, has a 3-5 sec startup time due to large bundle, dual DB drivers bloat the package, IPC messages lack validation, migrations can corrupt DB, and CORS is too permissive.

## Resolution

**Root Cause:**
- Lack of Windows GitHub Action runner caused the `.exe` to fail building in Linux environments.
- `package.json` was missing `build:frontend` in `postinstall`.
- `sqlite3` was dead weight in `package.json`.
- `vite.config.js` had no chunk splitting, generating a massive 1.4MB JS file.
- `main.js` did not backup `secret.key`.
- `preload.js` was passing IPC messages directly to main without checking types.
- `migrationRunner.js` allowed partial schema changes if a migration failed midway.
- `src/index.js` allowed cross-origin requests (`origin: true`) in production.

**Fixes Applied:**
- Added `.github/workflows/build.yml` to build natively on Windows runners for NSIS signing.
- Updated `postinstall` to run `npm run build:frontend`.
- Uninstalled `sqlite3` (shaving ~50MB off installer size).
- Added `manualChunks` to `vite.config.js` to split `vendor-react`, `vendor-charts`, `vendor-ui`, etc., reducing main load block.
- Implemented `secret.key.backup` logic in `main.js` with fallback.
- Added Joi schema validation to `preload.js` to strictly type-check all IPC messages.
- Wrapped `migrationRunner.js` SQL executions in `BEGIN TRANSACTION` / `ROLLBACK`.
- Replaced `origin: true` in `src/index.js` with a strict `allowedOrigins` whitelist.

**Verified:**
- `sqlite3` is removed.
- `npm run build:frontend` splits the chunks.
- The app builds successfully and securely locally.

**Regression Check:**
- Core startup flow and database connections function normally.
