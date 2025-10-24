import React, { useState, useEffect, useRef } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

interface Variable {
  name: string;
  type: string;
  connector: string;
  description?: string;
}

interface VariableAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
}

// Mock data - in real app, fetch from GET /api/connectors/variables
const MOCK_VARIABLES: Variable[] = [
  { name: 'bureau.score', type: 'number', connector: 'Bureau Data (Experian)', description: 'CIBIL/Experian credit score' },
  { name: 'bureau.accounts.total', type: 'number', connector: 'Bureau Data (Experian)', description: 'Total number of credit accounts' },
  { name: 'bureau.delinquencies.dpd30', type: 'number', connector: 'Bureau Data (Experian)', description: 'Days past due 30+' },
  { name: 'applicant.income', type: 'number', connector: 'Applicant Data', description: 'Monthly income' },
  { name: 'applicant.age', type: 'number', connector: 'Applicant Data', description: 'Age in years' },
  { name: 'applicant.employment', type: 'string', connector: 'Applicant Data', description: 'Employment type (SALARIED/SELF_EMPLOYED)' },
  { name: 'applicant.city', type: 'string', connector: 'Applicant Data', description: 'City of residence' },
  { name: 'bank.avgBalance', type: 'number', connector: 'Bank Statement (Perfios)', description: 'Average monthly balance' },
  { name: 'bank.bounces', type: 'number', connector: 'Bank Statement (Perfios)', description: 'Number of bounced transactions' },
  { name: 'bank.salary_credits', type: 'number', connector: 'Bank Statement (Perfios)', description: 'Number of salary credits' },
];

export const VariableAutocomplete: React.FC<VariableAutocompleteProps> = ({
  value,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredVariables, setFilteredVariables] = useState<Variable[]>(MOCK_VARIABLES);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Filter variables based on search term
    if (searchTerm.trim() === '') {
      setFilteredVariables(MOCK_VARIABLES);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = MOCK_VARIABLES.filter(
        (v) =>
          v.name.toLowerCase().includes(term) ||
          v.description?.toLowerCase().includes(term) ||
          v.connector.toLowerCase().includes(term)
      );
      setFilteredVariables(filtered);
    }
  }, [searchTerm]);

  useEffect(() => {
    // Close dropdown on outside click
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (variable: Variable) => {
    onChange(variable.name);
    setSearchTerm('');
    setIsOpen(false);
  };

  // Group variables by connector
  const groupedVariables = filteredVariables.reduce((acc, variable) => {
    if (!acc[variable.connector]) {
      acc[variable.connector] = [];
    }
    acc[variable.connector].push(variable);
    return acc;
  }, {} as Record<string, Variable[]>);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? searchTerm : value}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Select variable..."
          className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md text-sm
                   focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <ChevronDownIcon
          className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
        />
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full max-h-64 overflow-y-auto bg-white border border-gray-300 rounded-md shadow-lg">
          {Object.keys(groupedVariables).length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">
              No variables found
            </div>
          ) : (
            Object.entries(groupedVariables).map(([connector, variables]) => (
              <div key={connector}>
                {/* Group Header */}
                <div className="px-3 py-2 bg-gray-50 text-xs font-semibold text-gray-700 border-b border-gray-200">
                  {connector}
                </div>

                {/* Variables in group */}
                {variables.map((variable) => (
                  <div
                    key={variable.name}
                    onClick={() => handleSelect(variable)}
                    className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                  >
                    <div className="text-sm font-medium text-gray-900">
                      {variable.name}
                    </div>
                    {variable.description && (
                      <div className="text-xs text-gray-500 mt-0.5">
                        {variable.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
