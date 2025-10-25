import React, { useState } from 'react';
import { XMarkIcon, PlayIcon } from '@heroicons/react/24/outline';

interface TestPanelProps {
  onClose: () => void;
  onRunTest: (jsonData: any) => Promise<void>;
  isRunning: boolean;
}

export const TestPanel: React.FC<TestPanelProps> = ({
  onClose,
  onRunTest,
  isRunning,
}) => {
  const [jsonInput, setJsonInput] = useState('');
  const [jsonError, setJsonError] = useState('');

  const handleJsonChange = (value: string) => {
    setJsonInput(value);
    setJsonError('');
  };

  const handleRunTest = async () => {
    try {
      const parsedJson = JSON.parse(jsonInput);
      await onRunTest(parsedJson);
    } catch (error: any) {
      if (error instanceof SyntaxError) {
        setJsonError('Invalid JSON format');
      } else {
        setJsonError(error.message || 'Failed to run test');
      }
    }
  };

  const exampleJson = {
    applicant: {
      name: "John Doe",
      age: 35,
      income: 75000,
      credit_score: 720,
      employment_status: "employed"
    },
    loan: {
      amount: 250000,
      term_months: 360,
      purpose: "home_purchase"
    },
    property: {
      value: 320000,
      type: "single_family"
    }
  };

  return (
    <div className="h-full flex flex-col bg-white border-r border-gray-300 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-900">Test Application</h3>
        <button
          onClick={onClose}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
          title="Close test panel"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Application Data (JSON)
          </label>
          <textarea
            value={jsonInput}
            onChange={(e) => handleJsonChange(e.target.value)}
            placeholder={JSON.stringify(exampleJson, null, 2)}
            className="w-full h-96 px-3 py-2 border border-gray-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
          {jsonError && (
            <p className="mt-2 text-sm text-red-600">{jsonError}</p>
          )}
        </div>

        <button
          onClick={handleRunTest}
          disabled={!jsonInput || isRunning}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          <PlayIcon className="w-5 h-5" />
          {isRunning ? 'Running Test...' : 'Run Test'}
        </button>
      </div>
    </div>
  );
};
