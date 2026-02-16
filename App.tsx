
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

  const handleVerification = useCallback(async (email: string, campus: string) => {
    setAppState('verifying');
    try {
      const result = await verifyAttendance(email, campus);
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
    <div className="app-shell">
      <header className="app-header">
        <img
          src="/sunstone-logo.png"
          alt="Sunstone eDuvarsity"
          className="app-header-logo"
        />
      </header>
      <main className="main-content">
        <div className="main-content-inner">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;
