
import React from 'react';
import { ArrowRightIcon, CheckCircleIcon } from './icons';

interface LandingPageProps {
  onProceed: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onProceed }) => {
  return (
    <div className="card card-lg text-center animate-fade-in">
      <h2 className="text-heading-lg mb-4">Welcome to Your Test</h2>
      <p className="text-body mb-8 max-w-lg mx-auto">
        Please read the instructions below carefully before you begin.
      </p>

      <div className="instruction-block">
        <h3>Test Instructions</h3>
        <Instruction text="Ensure you have a stable internet connection." />
        <Instruction text="This is a timed test. The timer will start as soon as you open the test link." />
        <Instruction text="Do not refresh the page or use the browser's back button during the test." />
        <Instruction text="All questions are mandatory. Make sure to answer every question." />
        <Instruction text="Once submitted, you will not be able to change your answers." />
      </div>

      <button type="button" onClick={onProceed} className="btn-primary w-full sm:w-auto">
        Enter Email to Proceed
        <ArrowRightIcon className="ml-2 h-5 w-5" style={{ width: 20, height: 20 }} />
      </button>
    </div>
  );
};

interface InstructionProps {
    text: string;
}

const Instruction: React.FC<InstructionProps> = ({ text }) => (
    <div className="instruction-item">
        <CheckCircleIcon className="instruction-icon" aria-hidden />
        <span>{text}</span>
    </div>
);

export default LandingPage;
