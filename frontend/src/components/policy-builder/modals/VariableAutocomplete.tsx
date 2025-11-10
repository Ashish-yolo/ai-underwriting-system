import React, { useState, useEffect, useRef } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import apiService from '../../../services/api';

interface Variable {
  name: string;
  type: string;
  connector: string;
  description?: string;
  sampleValue?: any;
}

interface VariableAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
}

export const VariableAutocomplete: React.FC<VariableAutocompleteProps> = ({
  value,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [allVariables, setAllVariables] = useState<Variable[]>([]);
  const [filteredVariables, setFilteredVariables] = useState<Variable[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch variables from API on mount
  useEffect(() => {
    const fetchVariables = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiService.getAllConnectorVariables();

        // Transform API response to Variable format
        const variables: Variable[] = [];
        if (response && response.length > 0) {
          response.forEach((connector: any) => {
            const connectorName = connector.connectorName;
            connector.variables.forEach((variable: any) => {
              variables.push({
                name: `${connectorName}.${variable.variableName}`,
                type: variable.dataType,
                connector: connectorName,
                description: variable.description || undefined,
                sampleValue: variable.sampleValue,
              });
            });
          });
        }

        setAllVariables(variables);
        setFilteredVariables(variables);
      } catch (err: any) {
        console.error('Error fetching connector variables:', err);
        setError('Failed to load variables');
        setAllVariables([]);
        setFilteredVariables([]);
      } finally {
        setLoading(false);
      }
    };

    fetchVariables();
  }, []);

  useEffect(() => {
    // Filter variables based on search term
    if (searchTerm.trim() === '') {
      setFilteredVariables(allVariables);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = allVariables.filter(
        (v) =>
          v.name.toLowerCase().includes(term) ||
          v.description?.toLowerCase().includes(term) ||
          v.connector.toLowerCase().includes(term)
      );
      setFilteredVariables(filtered);
    }
  }, [searchTerm, allVariables]);

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
          {loading ? (
            <div className="px-3 py-2 text-sm text-gray-500 text-center">
              Loading variables...
            </div>
          ) : error ? (
            <div className="px-3 py-2 text-sm text-red-500 text-center">
              {error}
            </div>
          ) : Object.keys(groupedVariables).length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">
              No variables found
              <div className="text-xs mt-1">
                Try uploading sample responses for your connectors
              </div>
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
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-gray-900">
                        {variable.name}
                      </div>
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                        {variable.type}
                      </span>
                    </div>
                    {variable.description && (
                      <div className="text-xs text-gray-500 mt-0.5">
                        {variable.description}
                      </div>
                    )}
                    {variable.sampleValue !== undefined && (
                      <div className="text-xs text-blue-600 mt-0.5">
                        Example: {JSON.stringify(variable.sampleValue)}
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
