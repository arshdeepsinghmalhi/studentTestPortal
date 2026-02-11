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

// Backend: reads sheet only. Lookup by email, check Present column → if TRUE redirect to amcat link, else "Contact your Campus Manager". No /api/check-eligibility, no external API.

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

  // Sheet headers: ..., Email, ..., SHLE Links, ..., is_present / Present (normalize() lowercases)
  const emailIdx = headerIndex(['email']);
  const amcatIdx = headerIndex(['shle links']);
  const timeIdx = headerIndex(['lecture start time']);
  const dateIdx = headerIndex(['lecture date']);
  const isPresentIdx = headerIndex(['is_present', 'is present', 'is_presnet', 'present']);

  if (emailIdx === -1 || amcatIdx === -1) {
    throw new Error(
      'Expected columns "email" and "SHLE Links" (or "amcatLink") were not found in the sheet header.'
    );
  }

  const targetEmail = normalize(email);

  const row = dataRows.find((r) => normalize(r[emailIdx]) === targetEmail);
  if (!row) {
    return null;
  }

  const isPresent = isPresentIdx >= 0 ? isPresentValue(row[isPresentIdx]) : false;

  return {
    email: targetEmail,
    amcatLink: row[amcatIdx],
    lectureTime: timeIdx >= 0 ? row[timeIdx] : '',
    lectureDate: dateIdx >= 0 ? row[dateIdx] : '',
    isPresent,
  };
}

// Sheet-only verification: read sheet, check Present column → redirect or show error. No external API.
app.post('/api/verify', async (req, res) => {
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

    if (student.isPresent && student.amcatLink) {
      return res.status(200).json({
        success: true,
        url: student.amcatLink,
        message: 'Verification successful. Redirecting...',
      });
    }

    return res.status(200).json({
      success: false,
      message: 'Contact your Campus Manager.',
    });
  } catch (error) {
    console.error('Verify failed:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error. Please contact support.',
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Eligibility backend listening on http://localhost:${PORT}`);
});

