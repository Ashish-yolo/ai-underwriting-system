import React, { useState, useRef } from 'react';
import {
  XMarkIcon,
  DocumentTextIcon,
  DocumentArrowUpIcon,
  PlayIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { usePolicyBuilderStore } from '../../../stores/policyBuilderStore';

interface TestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRunSingleTest: (jsonData: any) => Promise<void>;
  onRunBulkTest: (file: File) => Promise<void>;
}

export const TestModal: React.FC<TestModalProps> = ({
  isOpen,
  onClose,
  onRunSingleTest,
  onRunBulkTest,
}) => {
  const [testMode, setTestMode] = useState<'single' | 'bulk'>('single');
  const [jsonInput, setJsonInput] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { testResults } = usePolicyBuilderStore();

  if (!isOpen) return null;

  const handleJsonChange = (value: string) => {
    setJsonInput(value);
    setJsonError('');
  };

  const handleRunSingleTest = async () => {
    try {
      const parsedJson = JSON.parse(jsonInput);
      setIsRunning(true);
      await onRunSingleTest(parsedJson);
    } catch (error: any) {
      if (error instanceof SyntaxError) {
        setJsonError('Invalid JSON format');
      } else {
        setJsonError(error.message || 'Failed to run test');
      }
    } finally {
      setIsRunning(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/)) {
      setJsonError('Please upload a valid Excel file (.xlsx or .xls)');
      return;
    }

    try {
      setIsRunning(true);
      await onRunBulkTest(file);
    } catch (error: any) {
      setJsonError(error.message || 'Failed to process bulk test');
    } finally {
      setIsRunning(false);
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Test Policy Workflow</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex gap-2">
            <button
              onClick={() => setTestMode('single')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                testMode === 'single'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <DocumentTextIcon className="w-5 h-5" />
              Single Application (JSON)
            </button>
            <button
              onClick={() => setTestMode('bulk')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                testMode === 'bulk'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <DocumentArrowUpIcon className="w-5 h-5" />
              Bulk Test (Excel)
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {testMode === 'single' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Application Data (JSON)
                </label>
                <textarea
                  value={jsonInput}
                  onChange={(e) => handleJsonChange(e.target.value)}
                  placeholder={JSON.stringify(exampleJson, null, 2)}
                  className="w-full h-64 px-4 py-3 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
                {jsonError && (
                  <p className="mt-2 text-sm text-red-600">{jsonError}</p>
                )}
              </div>

              {!testResults && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-blue-900 mb-2">
                    How Single Test Works:
                  </h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Paste your application JSON data above</li>
                    <li>• Click "Run Test" to execute the workflow</li>
                    <li>• Watch the flow visualization as each node processes</li>
                    <li>• Nodes will turn <span className="text-green-600 font-semibold">GREEN</span> (approved), <span className="text-yellow-600 font-semibold">YELLOW</span> (manual check), or <span className="text-red-600 font-semibold">RED</span> (rejected)</li>
                    <li>• See the final decision and execution trace</li>
                  </ul>
                </div>
              )}

              {/* Test Results */}
              {testResults && (
                <div className="space-y-4">
                  {/* Final Decision Banner */}
                  <div className={`rounded-lg p-6 ${
                    testResults.finalDecision === 'Approved'
                      ? 'bg-green-50 border-2 border-green-500'
                      : testResults.finalDecision === 'Rejected'
                      ? 'bg-red-50 border-2 border-red-500'
                      : 'bg-yellow-50 border-2 border-yellow-500'
                  }`}>
                    <div className="flex items-center gap-3 mb-2">
                      {testResults.finalDecision === 'Approved' && (
                        <CheckCircleIcon className="w-8 h-8 text-green-600" />
                      )}
                      {testResults.finalDecision === 'Rejected' && (
                        <XCircleIcon className="w-8 h-8 text-red-600" />
                      )}
                      {testResults.finalDecision === 'Manual Review' && (
                        <ExclamationTriangleIcon className="w-8 h-8 text-yellow-600" />
                      )}
                      <div>
                        <h3 className={`text-2xl font-bold ${
                          testResults.finalDecision === 'Approved'
                            ? 'text-green-900'
                            : testResults.finalDecision === 'Rejected'
                            ? 'text-red-900'
                            : 'text-yellow-900'
                        }`}>
                          {testResults.finalDecision}
                        </h3>
                        <p className={`text-sm ${
                          testResults.finalDecision === 'Approved'
                            ? 'text-green-700'
                            : testResults.finalDecision === 'Rejected'
                            ? 'text-red-700'
                            : 'text-yellow-700'
                        }`}>
                          Final decision based on {testResults.executionTrace.length} strategy block(s)
                        </p>
                      </div>
                    </div>

                    {/* Summary Stats */}
                    <div className="grid grid-cols-4 gap-4 mt-4">
                      <div className="bg-white rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-gray-900">{testResults.summary.totalConditions}</div>
                        <div className="text-xs text-gray-600">Total Conditions</div>
                      </div>
                      <div className="bg-green-100 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-green-900">{testResults.summary.passedConditions}</div>
                        <div className="text-xs text-green-700">Passed</div>
                      </div>
                      <div className="bg-red-100 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-red-900">{testResults.summary.failedConditions}</div>
                        <div className="text-xs text-red-700">Failed</div>
                      </div>
                      <div className="bg-yellow-100 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-yellow-900">{testResults.summary.manualCheckConditions}</div>
                        <div className="text-xs text-yellow-700">Manual Check</div>
                      </div>
                    </div>
                  </div>

                  {/* Execution Trace */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-900">Block Execution Results:</h4>
                    {testResults.executionTrace.map((trace, index) => (
                      <div key={trace.nodeId} className="border border-gray-200 rounded-lg p-4 bg-white">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-mono text-gray-500">Block {index + 1}</span>
                            <span className="font-semibold text-gray-900">{trace.nodeName}</span>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            trace.nodeDecision === 'Approved'
                              ? 'bg-green-100 text-green-800'
                              : trace.nodeDecision === 'Rejected'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {trace.nodeDecision}
                          </span>
                        </div>

                        {/* Failed Conditions */}
                        {trace.failedConditions.length > 0 && (
                          <div className="mb-2 bg-red-50 border border-red-200 rounded p-2">
                            <p className="text-xs font-semibold text-red-900 mb-1">Failed Conditions:</p>
                            <ul className="text-xs text-red-800 space-y-1">
                              {trace.failedConditions.map((cond, i) => (
                                <li key={i}>✗ {cond}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Manual Check Reasons */}
                        {trace.manualCheckReasons.length > 0 && (
                          <div className="mb-2 bg-yellow-50 border border-yellow-200 rounded p-2">
                            <p className="text-xs font-semibold text-yellow-900 mb-1">Manual Review Required:</p>
                            <ul className="text-xs text-yellow-800 space-y-1">
                              {trace.manualCheckReasons.map((reason, i) => (
                                <li key={i}>⚠ {reason}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* All Conditions */}
                        <div className="text-xs">
                          <p className="font-semibold text-gray-700 mb-1">All Conditions:</p>
                          <div className="space-y-1">
                            {trace.conditionsEvaluated.map((cond, i) => (
                              <div key={i} className="flex items-center gap-2">
                                <span className={cond.result ? 'text-green-600' : 'text-red-600'}>
                                  {cond.result ? '✓' : '✗'}
                                </span>
                                <span className="text-gray-700">{cond.condition}</span>
                                <span className={`ml-auto px-2 py-0.5 rounded text-xs ${
                                  cond.decision === 'Approved'
                                    ? 'bg-green-100 text-green-800'
                                    : cond.decision === 'Rejected'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {cond.decision}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Excel File
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isRunning}
                  className="w-full flex items-center justify-center gap-3 px-6 py-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <DocumentArrowUpIcon className="w-8 h-8 text-gray-400" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">
                      Excel files (.xlsx, .xls) up to 10MB
                    </p>
                  </div>
                </button>
                {jsonError && (
                  <p className="mt-2 text-sm text-red-600">{jsonError}</p>
                )}
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-green-900 mb-2">
                  How Bulk Test Works:
                </h4>
                <ul className="text-sm text-green-800 space-y-1">
                  <li>• Upload an Excel file with multiple applications</li>
                  <li>• Each row should represent one application</li>
                  <li>• Progress bar shows processing status</li>
                  <li>• Results Excel automatically downloads when complete</li>
                  <li>• Results include decision, execution time, and trace for each application</li>
                </ul>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <ArrowDownTrayIcon className="w-4 h-4" />
                  Expected Excel Format:
                </h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-200">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold">name</th>
                        <th className="px-3 py-2 text-left font-semibold">age</th>
                        <th className="px-3 py-2 text-left font-semibold">income</th>
                        <th className="px-3 py-2 text-left font-semibold">credit_score</th>
                        <th className="px-3 py-2 text-left font-semibold">loan_amount</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      <tr className="border-t border-gray-200">
                        <td className="px-3 py-2">John Doe</td>
                        <td className="px-3 py-2">35</td>
                        <td className="px-3 py-2">75000</td>
                        <td className="px-3 py-2">720</td>
                        <td className="px-3 py-2">250000</td>
                      </tr>
                      <tr className="border-t border-gray-200">
                        <td className="px-3 py-2">Jane Smith</td>
                        <td className="px-3 py-2">42</td>
                        <td className="px-3 py-2">95000</td>
                        <td className="px-3 py-2">780</td>
                        <td className="px-3 py-2">180000</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isRunning}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          {testMode === 'single' && (
            <button
              onClick={handleRunSingleTest}
              disabled={!jsonInput || isRunning}
              className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PlayIcon className="w-5 h-5" />
              {isRunning ? 'Running...' : 'Run Test'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
