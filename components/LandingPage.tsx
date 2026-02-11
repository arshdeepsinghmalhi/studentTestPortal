
import React from 'react';
import { ArrowRightIcon, CheckCircleIcon } from './icons';

interface LandingPageProps {
  onProceed: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onProceed }) => {
  return (
    <div className="bg-white p-8 sm:p-12 rounded-2xl shadow-lg border border-slate-200 text-center animate-fade-in">
      <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-4">Welcome to Your Test</h2>
      <p className="text-slate-600 mb-8 max-w-lg mx-auto">
        Please read the instructions below carefully before you begin.
      </p>

      <div className="text-left bg-slate-50 border border-slate-200 rounded-lg p-6 mb-8 space-y-4">
        <h3 className="text-xl font-bold text-slate-800 mb-3">Test Instructions</h3>
        <Instruction text="Ensure you have a stable internet connection." />
        <Instruction text="This is a timed test. The timer will start as soon as you open the test link." />
        <Instruction text="Do not refresh the page or use the browser's back button during the test." />
        <Instruction text="All questions are mandatory. Make sure to answer every question." />
        <Instruction text="Once submitted, you will not be able to change your answers." />
      </div>

      <button
        onClick={onProceed}
        className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition-all duration-300 transform hover:scale-105"
      >
        Enter Email to Proceed
        <ArrowRightIcon className="ml-2 h-5 w-5" />
      </button>
    </div>
  );
};

interface InstructionProps {
    text: string;
}

const Instruction: React.FC<InstructionProps> = ({ text }) => (
    <div className="flex items-start">
        <CheckCircleIcon className="h-6 w-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
        <span className="text-slate-700">{text}</span>
    </div>
);

export default LandingPage;
