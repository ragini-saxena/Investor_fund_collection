# Investor Fund Collection — Backend API

## Structure
```
src/config/env.js                 → central config object
src/db/db.js                      → mysql2 pool (default export, like reference)
src/module/investor/
  route.js       → endpoint definitions, wires validation/rate-limit/auth
  controller.js  → thin, try/catch, calls service, next(error)
  service.js     → business logic, throws ApiError, uses runInTransaction
  query.js       → raw SQL, accepts db = pool for transaction support
src/middleware/
  error.middleware.js      → same shape as your reference
  validate.middleware.js   → same as your reference
  rate-limit.middleware.js → loginLimiter (this project's equivalent of
                              your resendOtpLimiter)
  auth.middleware.js       → NEW — your reference didn't need this since
                              its 3 endpoints were all pre-login. This
                              project's /me endpoint needs to know which
                              investor is asking, hence requireAuth.
src/utils/
  api-error.js        → identical to reference
  token.js            → single generateAccessToken/verifyAccessToken pair
                         (no refresh token — this app doesn't need one yet)
  transaction.js       → identical to reference
  pledge-ranges.js      → NEW — the 10 pledge tiers as one source of truth
app.js / server.js      → same shape as reference (pool.query("SELECT 1")
                           before listen, mounts under /api/v1/*)
```

## Setup
```
cp .env.example .env      # fill in DB creds + a JWT_ACCESS_SECRET
mysql -u root -p < schema.sql
npm install
npm start
```

## Endpoints
All mounted under `/api/v1/investors` (register/login live here rather
than a separate `/auth` module, since this project only ever has one
kind of account — investors — unlike your reference project's user/otp
setup).

### POST /api/v1/investors/register
```json
{
  "firstName": "Jean",
  "lastName": "Dupuy",
  "email": "jean.dupuy@example.com",
  "whatsapp": "+509 3701 9922",
  "phone": "+1 305 555 0199",
  "pledgeRangeLabel": "$1,100–$1,500"
}
```
`pledgeRangeLabel` must match one of `PLEDGE_RANGES` in
`src/utils/pledge-ranges.js` — see the note in that file about the
10-tier vs 6-tier spec mismatch, still unresolved from the frontend QA
pass.

Response `201`:
```json
{
  "success": true,
  "data": {
    "profile": { "investorId": "IFC-1000-HT", "firstName": "Jean", ... },
    "accessToken": "eyJhbGciOi...",
    "message": "Registration received. Your investor ID has been generated."
  }
}
```

### POST /api/v1/investors/login
```json
{ "investorId": "IFC-1000-HT", "contactInfo": "jean.dupuy@example.com" }
```
Rate-limited (10 requests / 15 min) since there's no password to slow
down guessing. Response shape matches register.

### GET /api/v1/investors/me
Header: `Authorization: Bearer <accessToken>`

Response `200`:
```json
{
  "success": true,
  "data": {
    "investorId": "IFC-1000-HT",
    "firstName": "Jean",
    "lastName": "Dupuy",
    "email": "jean.dupuy@example.com",
    "whatsapp": "+509 3701 9922",
    "phone": "+1 305 555 0199",
    "pledge": { "rangeLabel": "$1,100–$1,500", "min": 1100, "max": 1500 },
    "isInvestor": false,
    "totalInvested": 0,
    "createdAt": "2026-09-23 10:00:00"
  }
}
```
Maps directly onto `data-profile-field="firstName|lastName|email|phone|whatsapp"`
in `investor profile.html`.

## Still-open flags (carried over from earlier project review)
1. **No password** — login is ID + contact info only, matching the
   current frontend. `loginLimiter` slows down brute-forcing but doesn't
   fix the underlying gap. Adding a password later means adding a
   `password_hash` column + a `password.js` util (bcrypt, same as your
   reference project already has as a dependency) — additive, not a rewrite.
2. **10 pledge tiers vs the original 6-tier spec** — confirm with the
   client which is correct before launch.
3. **`IFC-XXXX-HT` vs `000482`** — the admin pages built earlier in this
   project use a different ID format. Needs reconciling.
4. Payment/refund card storage (separate, future API) — must use a
   compliant processor with tokenization, never store raw card numbers.

## Frontend integration checklist
- [ ] Point `register (2).html` at `POST /api/v1/investors/register`,
      remove its local `Math.random()` ID generator
- [ ] Point `login investor.html`'s `portalLoginForm` at
      `POST /api/v1/investors/login`
- [ ] Store `accessToken`, send as `Authorization: Bearer <token>` when
      loading `investor dashboard.html` / `investor profile.html` via
      `GET /api/v1/investors/me`
