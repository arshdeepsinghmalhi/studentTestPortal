import express from 'express';
import { google } from 'googleapis';
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

// Backend: mapping sheet (campus → sheet ID), then campus sheet Apti tab; lookup by email, Present column → redirect or error.
// Mapping sheet ID (not secret) – Mapping tab has CAMPUS and Sheet ID.
const MAPPING_SHEET_ID = '1ZM22n9C3BE_pIUwkvhEAgbz-9mvU6JM5dKAGThmZiUE';
const DEFAULT_TAB = 'Apti';

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

/** Treat sheet value as boolean (TRUE, true, YES, 1, etc.). */
function isPresentValue(value) {
  const v = normalize(value);
  return v === 'true' || v === 'yes' || v === '1' || v === 'x' || v === 'y';
}

/** Get spreadsheet ID for campus from Mapping sheet (Mapping tab: CAMPUS, Sheet ID). */
async function getSheetIdForCampus(campus) {
  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: MAPPING_SHEET_ID,
    range: 'Mapping!A:Z',
  });
  const rows = response.data.values || [];
  if (!rows.length) return null;
  const [headerRow, ...dataRows] = rows;
  const headerIndex = (names) => headerRow.findIndex((h) => names.includes(normalize(h)));
  const campusIdx = headerIndex(['campus']);
  const sheetIdIdx = headerIndex(['sheet id', 'sheet_id']);
  if (campusIdx === -1 || sheetIdIdx === -1) return null;
  const targetCampus = normalize(campus);
  const row = dataRows.find((r) => normalize(r[campusIdx]) === targetCampus);
  return row && row[sheetIdIdx] ? String(row[sheetIdIdx]).trim() : null;
}

/** Find student in given spreadsheet and tab (Apti); check Present, return link. */
async function findStudentByEmail(email, spreadsheetId, tabName) {
  const range = `${tabName}!A:Z`;
  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });
  const rows = response.data.values || [];
  if (!rows.length) return null;
  const [headerRow, ...dataRows] = rows;
  const headerIndex = (names) => headerRow.findIndex((h) => names.includes(normalize(h)));
  const emailIdx = headerIndex(['email']);
  const amcatIdx = headerIndex(['shle links']);
  const timeIdx = headerIndex(['lecture start time']);
  const dateIdx = headerIndex(['lecture date']);
  const isPresentIdx = headerIndex(['is_present', 'is present', 'is_presnet', 'present']);
  if (emailIdx === -1 || amcatIdx === -1) return null;
  const targetEmail = normalize(email);
  const row = dataRows.find((r) => normalize(r[emailIdx]) === targetEmail);
  if (!row) return null;
  const isPresent = isPresentIdx >= 0 ? isPresentValue(row[isPresentIdx]) : false;
  return {
    email: targetEmail,
    amcatLink: row[amcatIdx],
    lectureTime: timeIdx >= 0 ? row[timeIdx] : '',
    lectureDate: dateIdx >= 0 ? row[dateIdx] : '',
    isPresent,
  };
}

// Verify: mapping sheet (campus → sheet ID), then campus sheet Apti tab; lookup email, Present → redirect or error.
app.post('/api/verify', async (req, res) => {
  const { email, campus } = req.body || {};

  if (!email || !normalize(email)) {
    return res.status(400).json({ success: false, message: 'Please enter your email address.' });
  }
  if (!campus || !normalize(campus)) {
    return res.status(400).json({ success: false, message: 'Please select or enter your campus.' });
  }

  try {
    const sheetId = await getSheetIdForCampus(campus);
    if (!sheetId) {
      return res.status(404).json({
        success: false,
        message: 'This campus was not found. Please check the campus name and try again.',
      });
    }

    const student = await findStudentByEmail(email, sheetId, DEFAULT_TAB);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Your email is not in the list. Please recheck your email and try again.',
      });
    }

    if (student.isPresent && student.amcatLink) {
      return res.status(200).json({
        success: true,
        url: student.amcatLink,
        message: 'Verification successful. Redirecting...',
      });
    }

    return res.status(200).json({
      success: false,
      message: 'You are not marked present yet. Please ask your exam coordinator to mark you present, then try again.',
    });
  } catch (error) {
    console.error('Verify failed:', error);
    const status = error?.response?.status || error?.code;
    const isForbidden = status === 403 || (error?.errors?.[0]?.reason === 'forbidden');
    const message = isForbidden
      ? 'Attendance sheet is not available right now. Please contact your administrator to update or fix the sheet and try again later.'
      : 'Something went wrong on our end. Please try again in a few minutes or contact support if it continues.';
    return res.status(isForbidden ? 503 : 500).json({
      success: false,
      message,
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Eligibility backend listening on http://localhost:${PORT}`);
});

