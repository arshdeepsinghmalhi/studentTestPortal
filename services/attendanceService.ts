
import { VerificationResult } from '../types';

// Backend API: VITE_API_URL in prod, or fallback to Render when on Vercel, else /api for local dev (Vite proxy).
const RENDER_API_BASE = 'https://student-test-portal-api.onrender.com';
// Normalize wrong/old Render host to the correct one (avoids CORS when VITE_API_URL was set to studenttestportal.onrender.com).
const rawBase =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')
    ? RENDER_API_BASE
    : '');
const base = rawBase.replace(/\/$/, '');
const normalizedBase =
  !base || base.startsWith('https://studenttestportal.onrender.com')
    ? (base ? RENDER_API_BASE : base)
    : base;
const API_URL = (normalizedBase ? normalizedBase.replace(/\/$/, '') + '/api/verify' : '/api/verify');

/**
 * Verifies the student using sheet data only. Backend uses campus → mapping sheet → campus sheet;
 * tab Apti/Svar by test type; checks Present column → redirect or "Contact your Campus Manager".
 */
export const verifyAttendance = async (
  email: string,
  campus: string,
  testType: string
): Promise<VerificationResult> => {
  console.log(`Verifying for: ${email}, campus: ${campus}, testType: ${testType}`);

  const requestBody = {
    email: email.trim().toLowerCase(),
    campus: campus.trim(),
    testType: testType.trim(),
  };

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json().catch(() => ({} as any));

    if (response.ok && data.success) {
      const redirectUrl: string | undefined = data.url || data.amcatLink;

      if (redirectUrl) {
        console.log(`Student is eligible. Redirecting to dynamic URL: ${redirectUrl}`);
        return {
          success: true,
          url: redirectUrl,
          message: data.message || 'Verification successful. Redirecting...',
        };
      }

      console.error('Eligibility check successful, but the API response did not contain a redirect URL.');
      return {
        success: false,
        message: 'Eligibility confirmed, but the test link is missing. Please contact your instructor.',
      };
    }

    console.log('Student is not eligible or backend reported failure:', data.message || 'No specific reason provided.');
    return {
      success: false,
      message: data.message || 'You are not eligible for this test at this time.',
    };
  } catch (error) {
    console.error('API call failed:', error);
    return {
      success: false,
      message: 'A network error occurred. Please check your connection and try again.',
    };
  }
};
