
import React, { useState, useCallback } from 'react';
import LandingPage from './components/LandingPage';
import VerificationForm from './components/VerificationForm';
import { verifyAttendance } from './services/attendanceService';

type AppState = 'landing' | 'form' | 'verifying' | 'error';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('landing');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleProceed = () => {
    setAppState('form');
  };

  const handleVerification = useCallback(async (email: string) => {
    setAppState('verifying');
    try {
      const result = await verifyAttendance(email);
      if (result.success && result.url) {
        window.location.href = result.url;
      } else {
        setErrorMessage(result.message);
        setAppState('error');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred.';
      setErrorMessage(message);
      setAppState('error');
    }
  }, []);

  const handleTryAgain = () => {
    setErrorMessage('');
    setAppState('form');
  };
  
  const renderContent = () => {
    switch (appState) {
      case 'landing':
        return <LandingPage onProceed={handleProceed} />;
      case 'form':
      case 'verifying':
      case 'error':
        return (
          <VerificationForm
            isVerifying={appState === 'verifying'}
            errorMessage={errorMessage}
            onVerify={handleVerification}
            onTryAgain={handleTryAgain}
          />
        );
      default:
        return <LandingPage onProceed={handleProceed} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col items-center justify-center p-4 font-sans">
       <header className="absolute top-0 left-0 p-6">
          <h1 className="text-2xl font-bold text-blue-600">TestPortal</h1>
       </header>
       <main className="w-full max-w-2xl">
         {renderContent()}
       </main>
    </div>
  );
};

export default App;
