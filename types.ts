
export interface Student {
  email: string;
  testUrl: string;
}

export interface VerificationResult {
  success: boolean;
  url?: string;
  message: string;
}
