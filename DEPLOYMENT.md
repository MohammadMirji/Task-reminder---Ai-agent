# Deployment Guide

## Architecture
- Frontend (`client`) deploys to Vercel.
- Backend (`server`) deploys to Railway.
- MongoDB should be hosted (Atlas is already used).

## 1) Deploy Backend to Railway
1. Create a new Railway project from this repository.
2. Set the **Root Directory** to `server`.
3. Railway will use `npm install` and `npm start` automatically.
4. Add environment variables from `server/.env.example`:
   - `PORT` (Railway sets this automatically)
   - `MONGO_URI`
   - `GROQ_API_KEY`
   - `JWT_SECRET`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `CLIENT_URL`
   - `CLIENT_URLS` (online frontend domains only; comma-separated if multiple)
   - `VAPID_PUBLIC_KEY`
   - `VAPID_PRIVATE_KEY`
   - `VAPID_EMAIL`
5. Deploy and confirm health endpoint:
   - `https://<railway-domain>/health` returns `{ "ok": true }`.

## 2) Configure Google OAuth
In Google Cloud Console OAuth client settings:
- Add Authorized JavaScript origins:
  - `https://<your-vercel-domain>`
- Add Authorized redirect URIs:
  - `https://<your-railway-domain>/api/auth/google/callback`

## 3) Deploy Frontend to Vercel
1. Create a Vercel project from the same repository.
2. Set **Root Directory** to `client`.
3. Framework preset: `Create React App`.
4. Add frontend environment variables from `client/.env.example`:
   - `REACT_APP_API_URL=https://<your-railway-domain>/api`
   - `REACT_APP_VAPID_PUBLIC_KEY=<same public key as backend>`
5. Deploy.
6. `client/vercel.json` is included for SPA route rewrites.

## 4) Final cross-origin checks
- `server` CORS accepts origins from `CLIENT_URLS` (or `CLIENT_URL`).
- Ensure your Vercel domain is present in backend env.
- After changing env vars, trigger a redeploy in both platforms.
- This project is configured for online environments only (no localhost fallback URLs).

