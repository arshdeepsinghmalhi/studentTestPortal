import express from 'express';
import { google } from 'googleapis';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables for the backend.
// 1. `.env` (if present)
// 2. `.env.local` (overrides, matching your existing setup)
dotenv.config();
dotenv.config({ path: '.env.local', override: true });

// Exit on uncaught errors so the process manager (e.g. nodemon) can restart the app.
function crashAndExit(err) {
  console.error('Fatal error, exiting for restart:', err instanceof Error ? err.stack : err);
  process.exit(1);
}
process.on('uncaughtException', crashAndExit);
process.on('unhandledRejection', crashAndExit);

// Simple Express backend that:
// 1. Uses the student's email to find their row in a Google Sheet.
// 2. Reads amcatLink, lectureTime, lectureDate from that row.
// 3. Calls the analytics eligibility API with those values.
// 4. Returns a normalized response to the frontend.

const ANALYTICS_API_URL = 'https://analytics.sunstone.in/check-eligibility';

const app = express();
app.use(express.json());

// Allow requests from the Vite dev server (change origin in production if needed).
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Google Sheets auth: use service account from env (private key + client email) or from file.
const SHEETS_SCOPE = ['https://www.googleapis.com/auth/spreadsheets.readonly'];

function getGoogleAuth() {
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL;
  if (privateKey && clientEmail) {
    // Credentials from .env: private key may have literal \n in value → normalize to real newlines
    return new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey.replace(/\\n/g, '\n'),
      },
      scopes: SHEETS_SCOPE,
    });
  }
  // Fallback: use service account file path (GOOGLE_APPLICATION_CREDENTIALS)
  return new google.auth.GoogleAuth({
    scopes: SHEETS_SCOPE,
  });
}

const auth = getGoogleAuth();

const normalize = (value) => (value ?? '').toString().trim().toLowerCase();

/**
 * Converts a date string from the sheet (e.g. "2/9/2026", "02/09/2026") to SQL DATE format YYYY-MM-DD
 * so the analytics API / MySQL accepts it (avoids "Incorrect DATE value" error).
 */
function formatDateForApi(value) {
  const raw = (value ?? '').toString().trim();
  if (!raw) return raw;
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  // M/D/YYYY or MM/DD/YYYY
  const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const [, month, day, year] = match;
    const m = month.padStart(2, '0');
    const d = day.padStart(2, '0');
    return `${year}-${m}-${d}`;
  }
  // Fallback: try Date parse and format
  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  return raw;
}

async function findStudentByEmail(email) {
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
  const range = process.env.GOOGLE_SHEETS_RANGE || 'userDetails!A:Z';

  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEETS_ID is not set. Please configure it in your environment.');
  }

  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  const rows = response.data.values || [];
  if (!rows.length) {
    return null;
  }

  const [headerRow, ...dataRows] = rows;

  const headerIndex = (names) =>
    headerRow.findIndex((h) => names.includes(normalize(h)));

  // Sheet headers: Unique ID, Email, ..., SHLE Links, Lecture Date, Lecture Start Time
  // normalize() lowercases, so match with lowercase names
  const emailIdx = headerIndex(['email']);
  const amcatIdx = headerIndex(['shle links']);
  const timeIdx = headerIndex(['lecture start time']);
  const dateIdx = headerIndex(['lecture date']);

  if (emailIdx === -1 || amcatIdx === -1 || timeIdx === -1 || dateIdx === -1) {
    throw new Error(
      'Expected columns "email", "amcatLink", "lectureTime", "lectureDate" were not found in the sheet header.'
    );
  }

  const targetEmail = normalize(email);

  const row = dataRows.find((r) => normalize(r[emailIdx]) === targetEmail);
  if (!row) {
    return null;
  }

  return {
    email: targetEmail,
    amcatLink: row[amcatIdx],
    lectureTime: row[timeIdx],
    lectureDate: row[dateIdx],
  };
}

app.post('/api/check-eligibility', async (req, res) => {
  const { email } = req.body || {};

  if (!email || !normalize(email)) {
    return res.status(400).json({
      success: false,
      message: 'Email is required.',
    });
  }

  try {
    const student = await findStudentByEmail(email);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Email not found in the registration list. Please check your registered email.',
      });
    }

    const payload = {
      email: student.email,
      amcatLink: student.amcatLink,
      lectureTime: student.lectureTime,
      lectureDate: formatDateForApi(student.lectureDate),
    };

    console.log('Sending payload to analytics API:', payload);

    const apiResponse = await fetch(ANALYTICS_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await apiResponse.json().catch(() => ({}));

    if (apiResponse.ok && (data.url || data.amcatLink)) {
      const redirectUrl = data.url || data.amcatLink;

      return res.status(200).json({
        success: true,
        url: redirectUrl,
        message: data.message || 'Verification successful. Redirecting...',
      });
    }

    return res.status(apiResponse.status || 500).json({
      success: false,
      message: data.message || 'You are not eligible for this test at this time.',
    });
  } catch (error) {
    console.error('Eligibility check failed:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while checking eligibility. Please contact support.',
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Eligibility backend listening on http://localhost:${PORT}`);
});

