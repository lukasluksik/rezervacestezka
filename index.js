// server/index.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sgMail = require('@sendgrid/mail');
const { google } = require('googleapis');
require('dotenv').config();

const PORT = process.env.PORT || 3000;
const OWNER_EMAIL = process.env.OWNER_EMAIL || 'dvorekboys@seznam.cz';
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY && process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || '*';

if (!SENDGRID_API_KEY) {
  console.error('SENDGRID_API_KEY chybí v .env');
}
if (!GOOGLE_CLIENT_EMAIL || !GOOGLE_PRIVATE_KEY || !SHEET_ID) {
  console.warn('Google Sheets credentials nebo SHEET_ID nejsou nastaveny v .env (pro vývoj OK, pro produkci nutné).');
}

sgMail.setApiKey(SENDGRID_API_KEY);

const app = express();
app.use(cors({ origin: FRONTEND_ORIGIN }));
app.use(bodyParser.json());

// Google Sheets auth
const scopes = ['https://www.googleapis.com/auth/spreadsheets'];
const auth = new google.auth.JWT(
  GOOGLE_CLIENT_EMAIL,
  null,
  GOOGLE_PRIVATE_KEY,
  scopes
);
const sheets = google.sheets({ version: 'v4', auth });

function validateBooking(body) {
  const { name, email, people, slot } = body;
  if (!name || !email || !slot) return false;
  if (!/^\S+@\S+\.\S+$/.test(email)) return false;
  const p = Number(people);
  if (!Number.isFinite(p) || p < 1 || p > 8) return false;
  return true;
}

app.post('/api/reserve', async (req, res) => {
  try {
    const data = req.body;
    if (!validateBooking(data)) return res.status(400).json({ ok: false, error: 'Invalid data' });

    const row = [new Date().toISOString(), data.slot, data.name, data.email, data.people];

    // 1) Append to Google Sheet (if configured)
    if (sheets && SHEET_ID) {
      await sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: 'Sheet1!A:E',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [row] },
      });
    }

    // 2) Send email to customer
    const msgCustomer = {
      to: data.email,
      from: OWNER_EMAIL,
      subject: `Potvrzení rezervace ${data.slot}`,
      text: `Děkujeme, ${data.name}. Vaše rezervace na ${data.slot} pro ${data.people} osob byla přijata.`,
      html: `<p>Děkujeme, <strong>${data.name}</strong>.</p><p>Vaše rezervace na <strong>${data.slot}</strong> pro <strong>${data.people}</strong> osob byla přijata.</p>`,
    };

    // 3) Send copy to owner
    const msgOwner = {
      to: OWNER_EMAIL,
      from: OWNER_EMAIL,
      subject: `Nová rezervace: ${data.slot} — ${data.name}`,
      text: `Nová rezervace: ${data.slot} | ${data.name} | ${data.email} | ${data.people} osob`,
    };

    if (SENDGRID_API_KEY) {
      await sgMail.send(msgCustomer);
      await sgMail.send(msgOwner);
    } else {
      console.log('SENDGRID_API_KEY není nastaveno — e-maily nebudou odeslány v demo módu.');
      console.log('Customer email would be:', msgCustomer);
      console.log('Owner email would be:', msgOwner);
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error('Error /api/reserve', err);
    return res.status(500).json({ ok: false, error: 'server error' });
  }
});

app.get('/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
