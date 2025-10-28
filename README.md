# Rezervace - frontend + backend

Tento projekt obsahuje frontend (React) a backend (Node/Express) připravené pro nasazení.
- Potvrzení rezervace bude zasláno klientovi a kopie na **dvorekboys@seznam.cz**
- Rezervace se zapíší do Google Sheets (pokud nastavíte service account a SHEET_ID)

## Rychlý postup (lokálně)

1. Backend
   - Jdi do `server/`, vytvoř `.env` na základě `.env.example`.
   - `npm install`
   - `npm run dev` (nebo `npm start`)

2. Frontend
   - Jdi do `frontend/`
   - `npm install`
   - v `.env` (root frontendu) nastav `REACT_APP_API_URL` na URL backendu (lokálně `http://localhost:3000`)
   - `npm start`

## Nasazení
- Doporučeno: backend na Render.com (Web Service), frontend na Vercel.
- V Render přidejte environment variables (SENDGRID_API_KEY, OWNER_EMAIL, GOOGLE_...).
- Ve Vercel nastavte `REACT_APP_API_URL` na URL backendu.

## Jak vytvořit Git repo a nahrát (pokud chceš)
V kořenové složce projektu spusť:
```bash
git init
git add .
git commit -m "Initial commit - rezervace"
# vytvoř repo na GitHub přes web, pak:
git remote add origin https://github.com/TVUJ-USER/rezervace.git
git push -u origin main
```

Pokud budeš chtít, mohu připravit branch a upravit cokoliv. 
