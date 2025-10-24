import React, { useState, useEffect } from 'react';
import { XMarkIcon, PlusIcon } from '@heroicons/react/24/outline';
import { ConditionBuilder } from './ConditionBuilder';

export interface Condition {
  id: string;
  variable: string;
  operator: string;
  value: string | number;
  decision: 'Approved' | 'Reject' | 'Manual Check';
  logicalOperator?: 'AND' | 'OR';
}

interface StrategyConfigModalProps {
  isOpen: boolean;
  nodeName: string;
  conditions: Condition[];
  defaultDecision: 'Approved' | 'Reject' | 'Manual Check';
  onClose: () => void;
  onSave: (nodeName: string, conditions: Condition[], defaultDecision: 'Approved' | 'Reject' | 'Manual Check') => void;
}

export const StrategyConfigModal: React.FC<StrategyConfigModalProps> = ({
  isOpen,
  nodeName,
  conditions: initialConditions,
  defaultDecision: initialDefaultDecision,
  onClose,
  onSave,
}) => {
  const [conditions, setConditions] = useState<Condition[]>(initialConditions);
  const [defaultDecision, setDefaultDecision] = useState<'Approved' | 'Reject' | 'Manual Check'>(
    initialDefaultDecision
  );
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState(nodeName);

  useEffect(() => {
    setConditions(initialConditions);
    setDefaultDecision(initialDefaultDecision);
    setTempName(nodeName);
  }, [initialConditions, initialDefaultDecision, nodeName, isOpen]);

  if (!isOpen) return null;

  const addCondition = () => {
    const newCondition: Condition = {
      id: `cond-${Date.now()}`,
      variable: '',
      operator: '>=',
      value: '',
      decision: 'Approved',
      logicalOperator: 'AND',
    };
    setConditions([...conditions, newCondition]);
  };

  const updateCondition = (index: number, updates: Partial<Condition>) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], ...updates };
    setConditions(newConditions);
  };

  const deleteCondition = (index: number) => {
    const newConditions = conditions.filter((_, i) => i !== index);
    setConditions(newConditions);
  };

  const handleSave = () => {
    // Validate: At least one condition required
    if (conditions.length === 0) {
      alert('Please add at least one condition');
      return;
    }

    // Validate: All conditions must have required fields
    const invalidConditions = conditions.filter(
      (c) => !c.variable || !c.operator || (c.value === '' && c.operator !== 'IS_NULL' && c.operator !== 'IS_NOT_NULL')
    );

    if (invalidConditions.length > 0) {
      alert('Please fill in all required fields for each condition');
      return;
    }

    // Save with node name
    onSave(tempName, conditions, defaultDecision);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />

      {/* Modal */}
      <div className="flex min-h-screen items-center justify-center p-4">
        <div
          className="relative bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[85vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-gray-50 border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              {editingName ? (
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  onBlur={() => setEditingName(false)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') setEditingName(false);
                  }}
                  className="text-lg font-bold text-gray-900 border-b-2 border-blue-500 focus:outline-none px-2"
                  autoFocus
                  maxLength={50}
                />
              ) : (
                <h2
                  className="text-lg font-bold text-gray-900 cursor-pointer hover:text-blue-600"
                  onClick={() => setEditingName(true)}
                >
                  {tempName}
                </h2>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Conditions:</h3>

              {/* Conditions List */}
              <div className="space-y-4">
                {conditions.map((condition, index) => (
                  <div key={condition.id} className="space-y-3">
                    {/* Condition Builder */}
                    <ConditionBuilder
                      condition={condition}
                      onChange={(updates) => updateCondition(index, updates)}
                      onDelete={() => deleteCondition(index)}
                    />

                    {/* AND/OR selector (if not last condition) */}
                    {index < conditions.length - 1 && (
                      <div className="flex items-center gap-4 ml-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`logic-${index}`}
                            checked={condition.logicalOperator === 'AND'}
                            onChange={() => updateCondition(index, { logicalOperator: 'AND' })}
                            className="w-4 h-4 text-blue-600"
                          />
                          <span className="text-sm font-medium text-gray-700">AND</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`logic-${index}`}
                            checked={condition.logicalOperator === 'OR'}
                            onChange={() => updateCondition(index, { logicalOperator: 'OR' })}
                            className="w-4 h-4 text-blue-600"
                          />
                          <span className="text-sm font-medium text-gray-700">OR</span>
                        </label>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Add Condition Button */}
              <button
                onClick={addCondition}
                className="mt-4 w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg
                         text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-all
                         flex items-center justify-center gap-2"
              >
                <PlusIcon className="w-5 h-5" />
                <span className="font-medium">Add Condition</span>
              </button>
            </div>

            {/* Default Decision */}
            <div className="border-t border-gray-200 pt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                If no conditions match:
              </label>
              <select
                value={defaultDecision}
                onChange={(e) =>
                  setDefaultDecision(e.target.value as 'Approved' | 'Reject' | 'Manual Check')
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Approved">✓ Approved</option>
                <option value="Reject">✗ Reject</option>
                <option value="Manual Check">⚠ Manual Check</option>
              </select>
              <p className="mt-2 text-xs text-gray-500">
                This decision will be used when none of the conditions above match the application data.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Save & Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
