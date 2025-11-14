# TapTab Backend Documentation

## Overview

TapTab is an Express + MongoDB backend that powers TapTag vehicle-contact workflows. It issues QR/NFC tags, handles activation, relays visitor messages, and manages user/admin accounts. The codebase follows a modular structure under `server/`.

## Tech Stack

- Node.js 20+
- Express.js with EJS for public pages
- MongoDB with Mongoose
- AWS S3 (optional) for file storage
- Joi for validation
- JWT for authentication
- Pino/Winston for logging

## Project Layout

- `server/app.js` bootstraps the Express app.
- `server/route.js` registers API and public routers.
- `server/api/` contains versioned REST APIs (auth, user, taptag).
- `server/controllers/` renders public HTML pages.
- `server/config/` handles environment, Express middleware, data sources, logging, and uploads.
- `server/public/` static assets served under `/assets`.
- `server/views/` EJS templates for public routes.
- `server/api/taptag/utils/qr.util.js` generates QR codes for each tag.
- `uploads/` default local storage for uploaded media (including QR PNGs).

## Installation & Setup

```
npm install
npm run dev
```

MongoDB must be reachable at `MONGO_URI`. The server listens on `PORT` (default 4000). Static assets are served from `/assets`, and uploaded files from `/api/static`.

## Environment Variables

Key variables defined in `server/config/environment.js`:

- `PORT`, `IP`, `PROJECT_NAME`
- `MONGO_URI`
- `PUBLIC_BASE_URL`
- `ADMIN_API_KEY`
- `ALLOWED_ORIGINS` (comma separated)
- `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`
- `EMERGENCY_NUMBER`
- `SUPPORT_HELP_URL`, `SUPPORT_WHATSAPP_URL`, `SUPPORT_DASHBOARD_URL`, `SUPPORT_ORDER_URL`, `SUPPORT_SHOP_URL`, `SUPPORT_EMAIL`
- `QR_STORAGE_DRIVER` (`s3` or leave empty for local)
- `QR_ASSET_BASE_URL`, `QR_MARGIN`, `QR_SCALE`, `QR_DARK_COLOR`, `QR_LIGHT_COLOR`
- Notification providers: `SMS_PROVIDER`, `WHATSAPP_PROVIDER`, Twilio credentials (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_MESSAGING_SERVICE_SID`, `TWILIO_PHONE_NUMBER` for virtual calls - backup only), and Gupshup credentials.
- Phone encryption: `PHONE_ENCRYPTION_SECRET` (required for direct calls - zero cost solution)

For S3 uploads, provide the AWS credentials and set `QR_STORAGE_DRIVER=s3`. Without it, the service writes QR PNGs to `uploads/qr`.

## Express Middleware

- Helmet (CSP disabled) for security headers.
- Configurable CORS (`ALLOWED_ORIGINS`).
- Compression, body-parser, method-override, cookie-parser.
- Static routes: `/api/static` → `uploads`, `/api/temp` → `temp`, `/assets` → `public`.

## Public Routes

- `GET /` health text (JSON message).
- `GET /r/:shortCode` renders the tag contact page.
- `POST /r/:shortCode/message` submits a visitor message.
- `POST /r/:shortCode/call-request` submits a callback request.
- `GET /thanks`, `/privacy`, `/terms` render static EJS pages.

## Health Route

- `GET /api/health` returns `{ ok: true }`.

## API Authentication

- JWT-based tokens (see `server/api/auth`).
- `authService.isAuthenticated({ role: [] })` guards user routes with role checks.
- Admin endpoints expect `X-Admin-Api-Key` header matching `ADMIN_API_KEY`.

## Auth API

Base path: `/api/v1`.

- `POST /auth/signin` – email/phone + password login (body validated by Joi).
- `POST /refresh` – refresh token (reads `refresh` header).

Additional OTP methods exist in `auth.service`, though primary routes are above (OTP endpoints are exposed via user routes).

## User API

All paths prefix `/api/v1`. Many endpoints require JWT authentication with role constraints.

- `POST /auth/send-otp` – send OTP (requires authenticated user).
- `POST /auth/verify-otp` – verify OTP for logged-in user.
- `POST /auth/login` – login via email/password returns tokens.
- `POST /user/upload-profile-pic` – upload image (multipart). Uses local/S3 storage utilities.
- `PUT /user/update-profile` – update self profile info.
- `POST /user/create-admin` – create admin/tutor/etc. user (currently no auth guard enabled).
- `GET /user/get-role-wise-user-list` – list users by role (role-protected).
- `GET /user/:id` – fetch details for user ID with authentication.
- `PUT /user/:id` – update user details (authenticated).

## TapTag API

Base path: `/api/v1`.

- **Activation**
  - `POST /activate-tag/request-otp` – send OTP for tag activation (body: shortCode, phone, etc.).
  - `POST /activate-tag/confirm` – confirm activation with OTP.
- **Visitor Messages**
  - `POST /message` – submit message by shortCode in body.
  - `POST /message/:shortCode` – same as above but shortCode in URL.
  - `POST /message/:shortCode/call-request` – request callback for a tag.
- **Virtual Calls (Masked Phone Numbers)**
  - `GET /call/virtual-number` – get the virtual number visitors should call.
  - `POST /call/:shortCode/initiate` – programmatically initiate a masked call.
  - `GET /call/:shortCode/history` – get call history for a tag (paginated).
  - `POST /call/connect` – Twilio webhook for incoming calls (internal).
  - `POST /call/status` – Twilio webhook for call status updates (internal).
  - `POST /call/dial-status` – Twilio webhook for dial status (internal).
- **Admin (requires `X-Admin-Api-Key`)**
  - `POST /qr/generate-bulk` – create `count` tags, generate QR PNGs, return metadata.
  - `GET /admin/tags` – list tags with filters (status, batchName, search, pagination).
  - `GET /admin/dashboard/summary` – aggregated stats on tags/messages/users.
  - `PATCH /admin/tags/:shortCode/status` – update tag status (`generated|assigned|activated|archived`).

QR creation stores files via `generateQrImage` utility. Each generated tag contains:

- `tagId`
- `shortCode`
- `shortUrl` – landing page URL
- `qrUrl` – PNG asset either on S3 or local static route
- `status`, `batchName`, `metadata`

## Message Delivery

`message.service` handles message submission and callback requests, enforcing rate limits via `rateLimit` middleware (default 10 requests/min on message, 6/min for callbacks). Messages include metadata (`reason`, `note`, etc.) for owner notifications.

## Direct Calls (Zero Cost - PRIMARY)

**This is the recommended method** - zero backend cost, complete privacy.

- Owner's phone number is **encrypted** in database (AES-256-GCM)
- Frontend shows "Call Owner" button with `tel:` link
- Phone number **never displayed** to visitors
- Direct call from visitor's device - no backend API/VoIP charges
- See `docs/direct-call-zero-cost.md` for complete details

**Setup**: Add `PHONE_ENCRYPTION_SECRET` to `.env` (strong random key, 32+ chars)

## Virtual Calls (Twilio - BACKUP)

**Backup option** - has per-minute costs, use only if direct calls don't work.

The system supports Uber-style masked phone calls using Twilio. Visitors call a virtual number that routes to the owner's real number without exposing it. See `docs/virtual-calls.md` for complete setup and usage.

- `virtualCall.service` handles call initiation and routing
- `VirtualCall` model stores call records with status, duration, and metadata
- Twilio webhooks update call status in real-time
- Rate limiting: 5 calls per 60 seconds per IP
- **Cost**: Per-minute charges from Twilio

## Activation Flow

1. Visitor scans QR (`/r/:shortCode`) and sees contact page.
2. Owner receives card, triggers `request-otp` to verify phone.
3. Owner confirms activation with OTP via `confirm`.
4. Tag status moves to `activated`, enabling visitor messages.

## Logging & Error Handling

- `server/config/logger.js` configures Pino/Winston loggers.
- `server/config/errorHandling.js` contains Express error middleware.
- Daily rotate files stored under `logs/`.

## Scripts

- `npm run dev` – start with nodemon (development).
- `npm start` – production nodemon with increased memory.
- `npm run start:debug` – start with inspector.
- `npm run dist` – run in production mode (NODE_ENV=production).
- `npm test` – reuse start script with NODE_ENV=test.

## Building a Dashboard

To consume APIs in a dashboard client (React, etc.):

1. Authenticate with `POST /api/v1/auth/signin` or email/password login.
2. Store JWT and refresh tokens (refresh via `POST /api/v1/refresh`).
3. Call admin endpoints with `X-Admin-Api-Key` header.
4. Use `GET /api/v1/admin/dashboard/summary` for KPIs.
5. List tags via `GET /api/v1/admin/tags?status=activated&page=1&limit=25`.
6. Use `POST /api/v1/qr/generate-bulk` to create new tags and QR assets.
7. Display QR images using the `qrUrl` returned by the API.

Remember to route all network requests through a central service or custom hook layer to keep UI logic separate, and respect token refresh logic.

## Troubleshooting

- **Cannot GET /api/static/qr/...** – ensure backend runs on `PORT` and QR files exist locally or S3 credentials are valid.
- **CORS errors** – add frontend origin to `ALLOWED_ORIGINS`.
- **S3 upload fallback** – if S3 fails, QR utility logs an error and saves locally; check AWS credentials/policy.
- **JWT/Role errors** – verify token roles match the required list in route guards.

This document should provide enough context for handing over the project or building a dashboard that integrates the available REST endpoints.


