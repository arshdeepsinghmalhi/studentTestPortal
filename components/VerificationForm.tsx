
import React, { useState } from 'react';
import { SpinnerIcon, XCircleIcon } from './icons';

type TestType = 'AMCAT' | 'SVAR';

interface VerificationFormProps {
  isVerifying: boolean;
  errorMessage: string;
  onVerify: (email: string, campus: string, testType: TestType) => void;
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
  const [testType, setTestType] = useState<TestType>('AMCAT');
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

    onVerify(email, campus.trim(), testType);
  };

  if (errorMessage) {
    return (
      <div className="bg-white p-8 sm:p-12 rounded-2xl shadow-lg border border-slate-200 text-center animate-fade-in">
        <XCircleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h3 className="text-2xl font-bold text-slate-800 mb-2">Verification Failed</h3>
        <p className="text-slate-600 mb-6">{errorMessage}</p>
        <button
          onClick={onTryAgain}
          className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition-transform duration-200"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white p-8 sm:p-12 rounded-2xl shadow-lg border border-slate-200 animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-slate-900">Verify Your Attendance</h2>
        <p className="text-slate-600 mt-2">Enter your details to proceed.</p>
      </div>
      <form onSubmit={handleSubmit} noValidate>
        <div className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isVerifying}
              placeholder="you@example.com"
              className="block w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out disabled:bg-slate-100"
              required
            />
          </div>
          <div>
            <label htmlFor="campus" className="block text-sm font-medium text-slate-700 mb-1">
              Campus (abbreviation)
            </label>
            <input
              type="text"
              id="campus"
              value={campus}
              onChange={(e) => setCampus(e.target.value)}
              disabled={isVerifying}
              placeholder="e.g. ITM"
              className="block w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out disabled:bg-slate-100"
              required
            />
          </div>
          <div>
            <label htmlFor="testType" className="block text-sm font-medium text-slate-700 mb-1">
              Test Type
            </label>
            <select
              id="testType"
              value={testType}
              onChange={(e) => setTestType(e.target.value as TestType)}
              disabled={isVerifying}
              className="block w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out disabled:bg-slate-100"
            >
              <option value="AMCAT">AMCAT</option>
              <option value="SVAR">SVAR</option>
            </select>
          </div>
        </div>
        
        {formError && <p className="text-red-600 text-sm mt-4 text-center">{formError}</p>}
        
        <div className="mt-8">
          <button
            type="submit"
            disabled={isVerifying}
            className="w-full flex items-center justify-center px-8 py-4 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition-all duration-300 disabled:bg-blue-400 disabled:cursor-not-allowed"
          >
            {isVerifying ? (
              <>
                <SpinnerIcon className="mr-3 h-5 w-5" />
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
