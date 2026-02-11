
import { VerificationResult } from '../types';

// Backend API: use VITE_API_URL in production (e.g. Render), else /api for local dev (Vite proxy).
const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '') + '/api/check-eligibility';

/**
 * Calls the backend API to check if a student is eligible for the test.
 *
 * The backend server is responsible for:
 * 1. Using the email to look up the student's row in the Google Sheet.
 * 2. Finding their specific lectureDate, lectureTime, and amcatLink.
 * 3. Calling the analytics eligibility API with those values.
 * 4. Returning a success response containing the unique amcatLink/url.
 * @param email The student's email address.
 * @returns A promise that resolves with the verification result.
 */
export const verifyAttendance = async (email: string): Promise<VerificationResult> => {
  console.log(`Checking eligibility for: ${email}`);

  // The frontend only sends the email. All Google Sheets lookup +
  // external API logic is handled safely on the backend.
  const requestBody = {
    email: email.trim().toLowerCase(),
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
