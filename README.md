# Torqussions

Torqussions is a full-stack collaborative workspace that keeps project chat, shared files, AI-assisted drafting, live preview, and code execution inside one room.

## Stack

- Frontend: React + Vite
- Backend: Express + Socket.IO + MongoDB
- Editor: Monaco Editor

## Local Development

1. Install dependencies:
   - `npm install`
2. Copy env files:
   - `frontend/.env.example` to `frontend/.env`
   - `backend/.env.example` to `backend/.env`
3. Start both apps from the repo root:
   - `npm run dev`

Frontend runs on Vite and proxies API calls to the backend in local development.

## Environment Variables

### Frontend

- `VITE_API_URL`
  Use the full backend base URL in production. Leave empty for same-origin deployments.
- `VITE_SOCKET_URL`
  Optional separate Socket.IO origin if it differs from `VITE_API_URL`.
- `VITE_DEV_PROXY_TARGET`
  Local backend target for Vite dev proxy. Default: `http://localhost:3000`

### Backend

- `PORT`
- `NODE_ENV`
- `MONGO_URI`
- `JWT_SECRET`
- `CLIENT_URL`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `REDIS_HOST`
- `REDIS_PORT`
- `REDIS_PASSWORD`

## Build

- Install all workspace dependencies: `npm install`
- Root build: `npm run build`
- Frontend build only: `cd frontend && npm run build`
- Backend syntax check: `cd backend && npm run check`
- Backend env validation: `npm run validate:env`

## Deployment

### Option 1: Separate frontend + backend deployments

- Deploy `frontend/` as a static Vite app.
- Deploy `backend/` as a Node service.
- Set `VITE_API_URL` to your backend URL.
- Set backend `CLIENT_URL` to your frontend origin.

### Option 2: Same-origin / reverse-proxy deployment

- Serve the frontend build behind the same domain as the backend.
- Leave `VITE_API_URL` empty so frontend requests stay relative.
- Keep backend `CLIENT_URL` set to the deployed frontend origin if you use a custom domain.
- On Render, the app can also fall back to Render's own `RENDER_EXTERNAL_URL` automatically for same-origin deployment.
- In production, the backend now serves the built frontend from `frontend/dist` automatically when that build exists.

## Scripts

- `npm run dev`
- `npm run build`
- `npm run check`
- `npm run start`
