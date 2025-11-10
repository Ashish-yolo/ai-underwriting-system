#!/usr/bin/env ts-node
/**
 * Test Strategy Node Validation
 *
 * Tests the new validation logic that checks for conditions instead of defaultDecision
 */

import { validatePolicy } from '../services/policy.service';

console.log('\n🧪 Testing Strategy Node Validation\n');
console.log('=' .repeat(60));

// Test 1: Valid Strategy Node with Conditions
console.log('\n✅ Test 1: Valid Strategy Node with Conditions');
const validWorkflow = {
  nodes: [
    {
      id: 'start-node',
      type: 'start',
      data: { label: 'Start' }
    },
    {
      id: 'strategy-1',
      type: 'strategy',
      data: {
        label: 'Credit Check',
        conditions: [
          {
            id: 'cond-1',
            variable: 'credit_score',
            operator: '>',
            value: 700,
            decision: 'Approved'
          },
          {
            id: 'cond-2',
            variable: 'income',
            operator: '>',
            value: 50000,
            decision: 'Approved'
          }
        ]
      }
    }
  ],
  edges: [
    {
      id: 'e1',
      source: 'start-node',
      target: 'strategy-1'
    }
  ]
};

validatePolicy(validWorkflow, true).then(result => {
  console.log('Result:', result);
  if (result.valid) {
    console.log('✅ PASSED: Valid strategy node accepted\n');
  } else {
    console.log('❌ FAILED: Valid strategy node rejected');
    console.log('Errors:', result.errors, '\n');
  }
});

// Test 2: Invalid - No Conditions
setTimeout(() => {
  console.log('\n❌ Test 2: Invalid Strategy Node - No Conditions');
  const noConditionsWorkflow = {
    nodes: [
      {
        id: 'start-node',
        type: 'start',
        data: { label: 'Start' }
      },
      {
        id: 'strategy-2',
        type: 'strategy',
        data: {
          label: 'Empty Strategy',
          conditions: []
        }
      }
    ],
    edges: [
      {
        id: 'e1',
        source: 'start-node',
        target: 'strategy-2'
      }
    ]
  };

  validatePolicy(noConditionsWorkflow, true).then(result => {
    console.log('Result:', result);
    if (!result.valid && result.errors.some(e => e.includes('at least one condition'))) {
      console.log('✅ PASSED: Empty conditions rejected correctly');
      console.log('Error Message:', result.errors.find(e => e.includes('at least one condition')), '\n');
    } else {
      console.log('❌ FAILED: Should reject empty conditions');
      console.log('Errors:', result.errors, '\n');
    }
  });
}, 100);

// Test 3: Invalid - Missing Variable in Condition
setTimeout(() => {
  console.log('\n❌ Test 3: Invalid Condition - Missing Variable');
  const missingVariableWorkflow = {
    nodes: [
      {
        id: 'start-node',
        type: 'start',
        data: { label: 'Start' }
      },
      {
        id: 'strategy-3',
        type: 'strategy',
        data: {
          label: 'Invalid Strategy',
          conditions: [
            {
              id: 'cond-1',
              // Missing variable
              operator: '>',
              value: 700,
              decision: 'Approved'
            }
          ]
        }
      }
    ],
    edges: [
      {
        id: 'e1',
        source: 'start-node',
        target: 'strategy-3'
      }
    ]
  };

  validatePolicy(missingVariableWorkflow, true).then(result => {
    console.log('Result:', result);
    if (!result.valid && result.errors.some(e => e.includes('missing a variable'))) {
      console.log('✅ PASSED: Missing variable detected correctly');
      console.log('Error Message:', result.errors.find(e => e.includes('missing a variable')), '\n');
    } else {
      console.log('❌ FAILED: Should detect missing variable');
      console.log('Errors:', result.errors, '\n');
    }
  });
}, 200);

// Test 4: Invalid - Missing Decision in Condition
setTimeout(() => {
  console.log('\n❌ Test 4: Invalid Condition - Missing Decision');
  const missingDecisionWorkflow = {
    nodes: [
      {
        id: 'start-node',
        type: 'start',
        data: { label: 'Start' }
      },
      {
        id: 'strategy-4',
        type: 'strategy',
        data: {
          label: 'Missing Decision',
          conditions: [
            {
              id: 'cond-1',
              variable: 'credit_score',
              operator: '>',
              value: 700
              // Missing decision
            }
          ]
        }
      }
    ],
    edges: [
      {
        id: 'e1',
        source: 'start-node',
        target: 'strategy-4'
      }
    ]
  };

  validatePolicy(missingDecisionWorkflow, true).then(result => {
    console.log('Result:', result);
    if (!result.valid && result.errors.some(e => e.includes('missing a decision'))) {
      console.log('✅ PASSED: Missing decision detected correctly');
      console.log('Error Message:', result.errors.find(e => e.includes('missing a decision')), '\n');
    } else {
      console.log('❌ FAILED: Should detect missing decision');
      console.log('Errors:', result.errors, '\n');
    }
  });
}, 300);

// Test 5: Old Architecture - defaultDecision (Should NOT Be Required)
setTimeout(() => {
  console.log('\n✅ Test 5: Old defaultDecision Field - Should Be Ignored');
  const oldArchitectureWorkflow = {
    nodes: [
      {
        id: 'start-node',
        type: 'start',
        data: { label: 'Start' }
      },
      {
        id: 'strategy-5',
        type: 'strategy',
        data: {
          label: 'Has Conditions',
          defaultDecision: 'Approved', // Old field - should be ignored
          conditions: [
            {
              id: 'cond-1',
              variable: 'credit_score',
              operator: '>',
              value: 700,
              decision: 'Approved'
            }
          ]
        }
      }
    ],
    edges: [
      {
        id: 'e1',
        source: 'start-node',
        target: 'strategy-5'
      }
    ]
  };

  validatePolicy(oldArchitectureWorkflow, true).then(result => {
    console.log('Result:', result);
    if (result.valid) {
      console.log('✅ PASSED: defaultDecision field ignored (new validation working)');
      console.log('Note: Validation focuses on conditions, not defaultDecision\n');
    } else {
      console.log('❌ FAILED: Should pass with conditions present');
      console.log('Errors:', result.errors, '\n');
    }
  });
}, 400);

// Test 6: Multiple Strategy Nodes
setTimeout(() => {
  console.log('\n✅ Test 6: Multiple Strategy Nodes');
  const multipleStrategiesWorkflow = {
    nodes: [
      {
        id: 'start-node',
        type: 'start',
        data: { label: 'Start' }
      },
      {
        id: 'strategy-1',
        type: 'strategy',
        data: {
          label: 'Credit Check',
          conditions: [
            {
              id: 'cond-1',
              variable: 'credit_score',
              operator: '>',
              value: 700,
              decision: 'Approved'
            }
          ]
        }
      },
      {
        id: 'strategy-2',
        type: 'strategy',
        data: {
          label: 'Income Check',
          conditions: [
            {
              id: 'cond-2',
              variable: 'income',
              operator: '>',
              value: 50000,
              decision: 'Approved'
            }
          ]
        }
      }
    ],
    edges: [
      {
        id: 'e1',
        source: 'start-node',
        target: 'strategy-1'
      },
      {
        id: 'e2',
        source: 'strategy-1',
        target: 'strategy-2'
      }
    ]
  };

  validatePolicy(multipleStrategiesWorkflow, true).then(result => {
    console.log('Result:', result);
    if (result.valid) {
      console.log('✅ PASSED: Multiple strategy nodes validated correctly\n');
    } else {
      console.log('❌ FAILED: Multiple valid strategy nodes should pass');
      console.log('Errors:', result.errors, '\n');
    }
  });
}, 500);

// Summary
setTimeout(() => {
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary\n');
  console.log('✅ Valid strategy with conditions → Should Pass');
  console.log('❌ Empty conditions array → Should Fail');
  console.log('❌ Missing variable in condition → Should Fail');
  console.log('❌ Missing decision in condition → Should Fail');
  console.log('✅ Old defaultDecision field → Should Be Ignored');
  console.log('✅ Multiple strategy nodes → Should Pass');
  console.log('\n' + '='.repeat(60));
  console.log('\n✅ Validation tests complete!\n');
}, 1000);
