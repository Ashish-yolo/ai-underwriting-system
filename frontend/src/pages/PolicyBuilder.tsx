import React from 'react';
import { useParams } from 'react-router-dom';

const PolicyBuilder: React.FC = () => {
  const { id } = useParams();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">
        {id ? 'Edit Policy' : 'Create New Policy'}
      </h1>

      <div className="card">
        <p className="text-gray-600">
          Visual Policy Builder with React Flow will be implemented here.
        </p>
        <p className="text-sm text-gray-500 mt-4">
          This will allow drag-and-drop workflow creation with nodes for:
          Start, Data Source, Condition, Calculation, Score, Decision, API Call, DB Query, and End nodes.
        </p>
      </div>
    </div>
  );
};

export default PolicyBuilder;
