
import React, { useState } from 'react';
import { SpinnerIcon, XCircleIcon } from './icons';

interface VerificationFormProps {
  isVerifying: boolean;
  errorMessage: string;
  onVerify: (email: string, campus: string) => void;
  onTryAgain: () => void;
}

const VerificationForm: React.FC<VerificationFormProps> = ({
  isVerifying,
  errorMessage,
  onVerify,
  onTryAgain,
}) => {
  const [email, setEmail] = useState('');
  const [campus, setCampus] = useState('');
  const [formError, setFormError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!email.trim()) {
      setFormError('Email address is required.');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setFormError('Please enter a valid email address.');
      return;
    }
    if (!campus.trim()) {
      setFormError('Campus (abbreviation) is required.');
      return;
    }

    onVerify(email, campus.trim());
  };

  if (errorMessage) {
    return (
      <div className="card card-lg text-center animate-fade-in">
        <XCircleIcon className="error-icon" aria-hidden />
        <h3 className="error-heading">Verification Failed</h3>
        <p className="error-message">{errorMessage}</p>
        <button type="button" onClick={onTryAgain} className="btn-primary w-full sm:w-auto">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="card card-lg animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-heading mb-2">Enter your details to proceed.</h2>
      </div>
      <form onSubmit={handleSubmit} noValidate>
        <div className="input-wrap">
          <label htmlFor="email" className="input-label">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isVerifying}
            placeholder="you@example.com"
            className="input"
            required
          />
        </div>
        <div className="input-wrap">
          <label htmlFor="campus" className="input-label">
            Campus (abbreviation only, no spaces or special characters like (-!@#$%^&*()_+))
          </label>
          <input
            type="text"
            id="campus"
            value={campus}
            onChange={(e) => setCampus(e.target.value)}
            disabled={isVerifying}
            placeholder="e.g. ITM"
            className="input"
            required
          />
        </div>

        {formError && <p className="form-error">{formError}</p>}

        <div style={{ marginTop: 'var(--space-xl)' }}>
          <button
            type="submit"
            disabled={isVerifying}
            className="btn-primary btn-primary-full"
          >
            {isVerifying ? (
              <>
                <SpinnerIcon className="mr-3 h-5 w-5" style={{ width: 20, height: 20 }} />
                Verifying...
              </>
            ) : (
              'Verify & Proceed to Test'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default VerificationForm;
