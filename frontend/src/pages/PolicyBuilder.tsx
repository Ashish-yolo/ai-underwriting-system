import React, { useEffect, useCallback, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  DocumentCheckIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  BeakerIcon,
} from '@heroicons/react/24/outline';

import { usePolicyBuilderStore } from '../stores/policyBuilderStore';
import { NodePalette } from '../components/policy-builder/NodePalette';
import { CanvasWithProvider } from '../components/policy-builder/Canvas';
import { PropertyPanel } from '../components/policy-builder/PropertyPanel';
import { StrategyConfigModal } from '../components/policy-builder/modals/StrategyConfigModal';
import { TestModal } from '../components/policy-builder/modals/TestModal';
import { BulkTestProgressModal } from '../components/policy-builder/modals/BulkTestProgressModal';
import { policyApi } from '../services/policyApi';

const PolicyBuilder: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [bulkTestProgress, setBulkTestProgress] = useState({
    isRunning: false,
    progress: 0,
    total: 0,
    processed: 0,
    successCount: 0,
    failureCount: 0,
    currentApplication: '',
  });

  const {
    policyName,
    policyDescription,
    nodes,
    edges,
    validationErrors,
    selectedNode,
    isConfigModalOpen,
    isTestModalOpen,
    setPolicyMetadata,
    loadPolicy,
    clearPolicy,
    validateWorkflow,
    closeConfigModal,
    updateNodeData,
    openTestModal,
    closeTestModal,
    clearTestResults,
    testPolicy,
  } = usePolicyBuilderStore();

  // Load policy if editing
  useEffect(() => {
    const loadPolicyData = async () => {
      if (id) {
        try {
          const policy = await policyApi.getPolicyById(id);
          loadPolicy(policy);
        } catch (error) {
          console.warn('Failed to load policy (offline mode):', error);
          // Don't show error in offline mode - just start with empty policy
        }
      } else {
        clearPolicy();
      }
    };

    loadPolicyData();
  }, [id, loadPolicy, clearPolicy]);

  const handleDragStart = useCallback((event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleValidate = async () => {
    const isValid = await validateWorkflow();
    if (isValid) {
      setSaveMessage({ type: 'success', text: 'Workflow is valid!' });
    } else {
      setSaveMessage({ type: 'error', text: `Found ${validationErrors.length} validation errors` });
    }
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      // First validate
      const isValid = await validateWorkflow();
      if (!isValid) {
        setSaveMessage({ type: 'error', text: 'Please fix validation errors before saving' });
        setIsSaving(false);
        setTimeout(() => setSaveMessage(null), 3000);
        return;
      }

      // Build the policy object
      const policyData = {
        name: policyName || 'Untitled Policy', // Ensure name is never empty
        description: policyDescription || '',
        product_type: 'loan', // Default product type
        workflow_json: {
          nodes,
          edges,
        },
      };

      console.log('Saving policy with data:', policyData);

      // Call API to save policy
      if (id) {
        await policyApi.updatePolicy(id, policyData);
        setSaveMessage({ type: 'success', text: 'Policy updated successfully!' });
      } else {
        const newPolicy = await policyApi.createPolicy(policyData);
        setSaveMessage({ type: 'success', text: 'Policy created successfully!' });
        // Navigate to edit mode with the new ID
        navigate(`/policy-builder/${newPolicy.id}`, { replace: true });
      }

      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error: any) {
      console.error('Error saving policy:', error);
      console.error('Error details:', error.response, error.message);
      const errorMessage = error.message || 'Failed to save policy - backend may be offline';
      setSaveMessage({ type: 'error', text: errorMessage });
      setTimeout(() => setSaveMessage(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!id) {
      setSaveMessage({ type: 'error', text: 'Please save the policy first' });
      setTimeout(() => setSaveMessage(null), 3000);
      return;
    }

    try {
      await policyApi.publishPolicy(id);
      setSaveMessage({ type: 'success', text: 'Policy published successfully!' });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error: any) {
      console.error('Error publishing policy:', error);
      let errorMessage = error.message || 'Failed to publish policy';

      // Check for specific JSON parse errors (usually means 404)
      if (errorMessage.includes('Unexpected token') || errorMessage.includes('JSON')) {
        errorMessage = 'Backend is still deploying. Please wait 1-2 minutes and try again.';
      }

      setSaveMessage({ type: 'error', text: errorMessage });
      setTimeout(() => setSaveMessage(null), 8000);
    }
  };

  const handleSaveStrategy = (nodeName: string, conditions: any[], defaultDecision: 'Approved' | 'Reject' | 'Manual Check') => {
    if (selectedNode) {
      updateNodeData(selectedNode.id, {
        label: nodeName,
        conditions,
        defaultDecision,
      });
      closeConfigModal();
    }
  };

  const handleRunSingleTest = async (jsonData: any) => {
    clearTestResults();
    await testPolicy(jsonData);
    // Keep modal open to show results
  };

  const handleRunBulkTest = async (file: File) => {
    // For now, close the test modal and show progress
    closeTestModal();

    // Parse Excel file (simplified - would use a library like xlsx in production)
    // This is a placeholder - actual implementation would parse the Excel file
    console.log('Bulk test file:', file.name);
    const applications = [
      { name: 'App1', data: { credit_score: 720 } },
      { name: 'App2', data: { credit_score: 650 } },
      // ... more applications from Excel
    ];

    setBulkTestProgress({
      isRunning: true,
      progress: 0,
      total: applications.length,
      processed: 0,
      successCount: 0,
      failureCount: 0,
      currentApplication: '',
    });

    const results = [];

    for (let i = 0; i < applications.length; i++) {
      const app = applications[i];

      setBulkTestProgress(prev => ({
        ...prev,
        currentApplication: app.name,
        processed: i,
        progress: (i / applications.length) * 100,
      }));

      try {
        await testPolicy(app.data);
        results.push({ ...app, success: true });

        setBulkTestProgress(prev => ({
          ...prev,
          successCount: prev.successCount + 1,
        }));
      } catch (error) {
        results.push({ ...app, success: false, error });

        setBulkTestProgress(prev => ({
          ...prev,
          failureCount: prev.failureCount + 1,
        }));
      }
    }

    // Final update
    setBulkTestProgress(prev => ({
      ...prev,
      processed: applications.length,
      progress: 100,
    }));

    // Auto-download results Excel
    downloadBulkTestResults(results);

    // Close progress modal after 2 seconds
    setTimeout(() => {
      setBulkTestProgress({
        isRunning: false,
        progress: 0,
        total: 0,
        processed: 0,
        successCount: 0,
        failureCount: 0,
        currentApplication: '',
      });
    }, 2000);
  };

  const downloadBulkTestResults = (results: any[]) => {
    // Create CSV content (simplified - would use xlsx library in production)
    const csvContent = 'data:text/csv;charset=utf-8,' +
      'Application,Success,Decision,Error\n' +
      results.map(r => `${r.name},${r.success},${r.decision || 'N/A'},${r.error || ''}`).join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `bulk_test_results_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/policies')}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </button>

            <div>
              <input
                type="text"
                value={policyName}
                onChange={(e) => setPolicyMetadata({ name: e.target.value })}
                className="text-2xl font-bold text-gray-900 bg-transparent border-0 border-b-2 border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none px-2 py-1"
              />
              <input
                type="text"
                value={policyDescription}
                onChange={(e) => setPolicyMetadata({ description: e.target.value })}
                placeholder="Add description..."
                className="block text-sm text-gray-600 bg-transparent border-0 border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none px-2 py-1 mt-1 placeholder:text-gray-400"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {saveMessage && (
              <div
                className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                  saveMessage.type === 'success'
                    ? 'bg-green-50 text-green-800'
                    : 'bg-red-50 text-red-800'
                }`}
              >
                {saveMessage.type === 'success' ? (
                  <CheckCircleIcon className="w-5 h-5" />
                ) : (
                  <ExclamationTriangleIcon className="w-5 h-5" />
                )}
                <span className="text-sm font-medium">{saveMessage.text}</span>
              </div>
            )}

            <button
              onClick={handleValidate}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <DocumentCheckIcon className="w-5 h-5" />
              Validate
            </button>

            <button
              onClick={openTestModal}
              className="flex items-center gap-2 px-4 py-2 border border-purple-300 text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <BeakerIcon className="w-5 h-5" />
              Test
            </button>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>

            <button
              onClick={handlePublish}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Publish
            </button>
          </div>
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
              <h3 className="text-sm font-semibold text-red-900">
                Validation Issues ({validationErrors.length})
              </h3>
            </div>
            <ul className="space-y-1">
              {validationErrors.slice(0, 5).map((error, index) => (
                <li key={index} className="text-sm text-red-800">
                  • {error.message}
                </li>
              ))}
              {validationErrors.length > 5 && (
                <li className="text-sm text-red-600 font-medium">
                  + {validationErrors.length - 5} more issues
                </li>
              )}
            </ul>
          </div>
        )}
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        <NodePalette onDragStart={handleDragStart} />
        <CanvasWithProvider />
        <PropertyPanel />
      </div>

      {/* Footer Stats */}
      <div className="bg-white border-t border-gray-200 px-6 py-2">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-6">
            <span>{nodes.length} nodes</span>
            <span>{edges.length} connections</span>
            <span>
              {nodes.filter(n => n.type === 'start' || n.id === 'start-node').length > 0 ? (
                <span className="text-green-600">✓ Has START node</span>
              ) : (
                <span className="text-red-600">✗ Missing START node</span>
              )}
            </span>
            <span className="text-gray-500 text-xs">
              Last node determines final decision
            </span>
          </div>
          <div className="text-xs text-gray-500">
            {id ? `Editing Policy ${id}` : 'New Policy'}
          </div>
        </div>
      </div>

      {/* Strategy Configuration Modal */}
      {selectedNode && selectedNode.type === 'strategy' && (
        <StrategyConfigModal
          isOpen={isConfigModalOpen}
          nodeName={selectedNode.data?.label || 'Strategy'}
          conditions={selectedNode.data?.conditions || []}
          defaultDecision={selectedNode.data?.defaultDecision || 'Manual Check'}
          onClose={closeConfigModal}
          onSave={handleSaveStrategy}
        />
      )}

      {/* Test Modal */}
      <TestModal
        isOpen={isTestModalOpen}
        onClose={closeTestModal}
        onRunSingleTest={handleRunSingleTest}
        onRunBulkTest={handleRunBulkTest}
      />

      {/* Bulk Test Progress Modal */}
      <BulkTestProgressModal
        isOpen={bulkTestProgress.isRunning}
        progress={bulkTestProgress.progress}
        total={bulkTestProgress.total}
        processed={bulkTestProgress.processed}
        successCount={bulkTestProgress.successCount}
        failureCount={bulkTestProgress.failureCount}
        currentApplication={bulkTestProgress.currentApplication}
      />
    </div>
  );
};

export default PolicyBuilder;
