import React from 'react';
import { TrashIcon } from '@heroicons/react/24/outline';
import { VariableAutocomplete } from './VariableAutocomplete';
import { Condition } from './StrategyConfigModal';

interface ConditionBuilderProps {
  condition: Condition;
  onChange: (updates: Partial<Condition>) => void;
  onDelete: () => void;
}

const DECISIONS = [
  { value: 'Approved', label: '✓ Approved', color: 'text-green-600' },
  { value: 'Manual Check', label: '⚠ Manual Check', color: 'text-yellow-600' },
];

export const ConditionBuilder: React.FC<ConditionBuilderProps> = ({
  condition,
  onChange,
  onDelete,
}) => {
  const isNullOperator = condition.operator === 'IS_NULL' || condition.operator === 'IS_NOT_NULL';
  const isListOperator = condition.operator === 'IN' || condition.operator === 'NOT IN';

  return (
    <div className="border-2 border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
      <div className="grid grid-cols-4 gap-3 mb-3">
        {/* Box 1: Variable (Autocomplete) */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Variable *
          </label>
          <VariableAutocomplete
            value={condition.variable}
            onChange={(value) => onChange({ variable: value })}
          />
        </div>

        {/* Box 2: Operator (Dropdown) */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Operator *
          </label>
          <select
            value={condition.operator}
            onChange={(e) => onChange({ operator: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <optgroup label="Comparison">
              <option value="=">=  (equals)</option>
              <option value="!=">!=  (not equals)</option>
              <option value="<">&lt;  (less than)</option>
              <option value=">">&gt;  (greater than)</option>
              <option value="<=">&lt;=  (less than or equal)</option>
              <option value=">=">&gt;=  (greater than or equal)</option>
            </optgroup>
            <optgroup label="List Operations">
              <option value="IN">IN (value in list)</option>
              <option value="NOT IN">NOT IN (not in list)</option>
            </optgroup>
            <optgroup label="String Operations">
              <option value="CONTAINS">CONTAINS (contains text)</option>
              <option value="STARTS_WITH">STARTS_WITH (starts with)</option>
            </optgroup>
            <optgroup label="Null Checks">
              <option value="IS_NULL">IS_NULL (is empty)</option>
              <option value="IS_NOT_NULL">IS_NOT_NULL (has value)</option>
            </optgroup>
          </select>
        </div>

        {/* Box 3: Value (Text Input) */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Value {!isNullOperator && '*'}
          </label>
          <input
            type="text"
            value={condition.value}
            onChange={(e) => onChange({ value: e.target.value })}
            disabled={isNullOperator}
            placeholder={
              isListOperator
                ? 'Mumbai, Delhi, Bangalore'
                : isNullOperator
                ? '(not needed)'
                : 'e.g., 750'
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500
                     disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          {isListOperator && (
            <p className="text-xs text-gray-500 mt-1">Comma-separated values</p>
          )}
        </div>

        {/* Box 4: Decision (Dropdown) */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Decision *
          </label>
          <select
            value={condition.decision}
            onChange={(e) =>
              onChange({ decision: e.target.value as 'Approved' | 'Manual Check' })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {DECISIONS.map((dec) => (
              <option key={dec.value} value={dec.value}>
                {dec.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Delete Button */}
      <div className="flex justify-end">
        <button
          onClick={onDelete}
          className="flex items-center gap-1 px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
        >
          <TrashIcon className="w-4 h-4" />
          <span>Delete</span>
        </button>
      </div>
    </div>
  );
};
