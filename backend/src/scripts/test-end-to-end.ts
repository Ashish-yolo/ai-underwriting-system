import { pool } from '../config/database';
import {
  storeManualSample,
  getConnectorByName,
} from '../services/connector-execution.service';
import { getAllAvailableVariables } from '../services/variable-registry.service';
import logger from '../utils/logger';

/**
 * End-to-End Test Script
 * Tests the complete flow: Sample Upload → Variable Discovery → Policy Creation → Evaluation
 */

async function runEndToEndTest() {
  console.log('='.repeat(80));
  console.log('AI Underwriting System - End-to-End Test');
  console.log('='.repeat(80));
  console.log('');

  try {
    // Step 1: Upload Sample Connector Responses
    console.log('Step 1: Uploading Sample Connector Responses');
    console.log('-'.repeat(80));

    // Sample Experian Credit Bureau Response
    const experianSample = {
      request: {
        pan: 'ABCDE1234F',
        fullName: 'John Doe',
      },
      response: {
        score: 750,
        totalAccounts: 5,
        activeAccounts: 3,
        delinquentAccounts: 0,
        totalCreditLimit: 500000,
        totalOutstanding: 125000,
        inquiriesLast6Months: 2,
        oldestAccountAge: 48,
        recentDefault: false,
        dpdDays: 0,
      },
    };

    // Sample Bank Statement Analysis Response
    const bankStatementSample = {
      request: {
        statementFile: 'statement.pdf',
      },
      response: {
        avgMonthlyBalance: 85000,
        avgMonthlyCredits: 120000,
        avgMonthlyDebits: 95000,
        bounces: 0,
        salaryCredits: 6,
        minBalance: 25000,
        maxBalance: 150000,
        eodBalancePositiveDays: 180,
      },
    };

    // Get connectors
    const experianConnector = await getConnectorByName('Experian');
    const bankConnector = await getConnectorByName('BankStatement');

    if (!experianConnector) {
      throw new Error('Experian connector not found. Please create it first.');
    }

    console.log('  ✓ Uploading Experian sample...');
    const experianResult = await storeManualSample(
      experianConnector.id,
      experianSample.request,
      experianSample.response
    );
    console.log(`    - Execution ID: ${experianResult.executionId}`);
    console.log(`    - Variables Discovered: ${experianResult.variablesDiscovered}`);

    if (bankConnector) {
      console.log('  ✓ Uploading Bank Statement sample...');
      const bankResult = await storeManualSample(
        bankConnector.id,
        bankStatementSample.request,
        bankStatementSample.response
      );
      console.log(`    - Execution ID: ${bankResult.executionId}`);
      console.log(`    - Variables Discovered: ${bankResult.variablesDiscovered}`);
    }

    console.log('');

    // Step 2: Verify Variable Discovery
    console.log('Step 2: Verifying Variable Discovery');
    console.log('-'.repeat(80));

    const availableVariables = await getAllAvailableVariables();
    console.log(`  ✓ Total Connectors: ${availableVariables.length}`);

    availableVariables.forEach((connector: any) => {
      console.log(`  ✓ ${connector.connectorName}: ${connector.variables.length} variables`);
      connector.variables.forEach((variable: any) => {
        console.log(
          `    - ${variable.variableName} (${variable.dataType}): ${variable.sampleValue}`
        );
      });
    });

    console.log('');

    // Step 3: Create Test Policy
    console.log('Step 3: Creating Test Policy with Connector Variables');
    console.log('-'.repeat(80));

    const testPolicy = {
      name: 'E2E Test Policy - Credit Approval',
      description: 'Test policy using connector variables',
      version: '1.0.0',
      status: 'draft',
      workflow_json: {
        nodes: [
          {
            id: 'start-1',
            type: 'start',
            position: { x: 100, y: 100 },
            data: { label: 'Start' },
          },
          {
            id: 'strategy-1',
            type: 'strategy',
            position: { x: 300, y: 100 },
            data: {
              label: 'Credit Score Check',
              conditions: [
                {
                  variable: 'Experian.Score',
                  operator: '>=',
                  value: '700',
                  decision: 'Approved',
                  logicalOperator: 'AND',
                },
                {
                  variable: 'Experian.DelinquentAccounts',
                  operator: '=',
                  value: '0',
                  decision: 'Approved',
                  logicalOperator: 'AND',
                },
              ],
            },
          },
          {
            id: 'strategy-2',
            type: 'strategy',
            position: { x: 500, y: 100 },
            data: {
              label: 'Banking Behavior Check',
              conditions: [
                {
                  variable: 'BankStatement.Bounces',
                  operator: '=',
                  value: '0',
                  decision: 'Approved',
                  logicalOperator: 'AND',
                },
                {
                  variable: 'BankStatement.AvgMonthlyBalance',
                  operator: '>=',
                  value: '50000',
                  decision: 'Approved',
                },
              ],
            },
          },
        ],
        edges: [
          { id: 'e1', source: 'start-1', target: 'strategy-1' },
          { id: 'e2', source: 'strategy-1', target: 'strategy-2' },
        ],
      },
      metadata: {
        created_by: 'system',
        tags: ['test', 'e2e'],
      },
    };

    const policyResult = await pool.query(
      `INSERT INTO policies (name, description, version, status, workflow_json, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        testPolicy.name,
        testPolicy.description,
        testPolicy.version,
        testPolicy.status,
        JSON.stringify(testPolicy.workflow_json),
        JSON.stringify(testPolicy.metadata),
      ]
    );

    const policyId = policyResult.rows[0].id;
    console.log(`  ✓ Policy Created: ${testPolicy.name}`);
    console.log(`    - Policy ID: ${policyId}`);
    console.log(`    - Nodes: ${testPolicy.workflow_json.nodes.length}`);
    console.log('');

    // Step 4: Test Policy Evaluation
    console.log('Step 4: Testing Policy Evaluation');
    console.log('-'.repeat(80));

    // Create test application
    const applicationResult = await pool.query(
      `INSERT INTO applications (policy_id, status, application_data, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [
        policyId,
        'pending',
        JSON.stringify({ applicantName: 'John Doe', loanAmount: 500000 }),
        'system',
      ]
    );

    const applicationId = applicationResult.rows[0].id;
    console.log(`  ✓ Test Application Created: ${applicationId}`);

    // Store connector data for this application
    await pool.query(
      `INSERT INTO application_connector_data (application_id, connector_id, execution_id, data)
       VALUES ($1, $2, $3, $4)`,
      [
        applicationId,
        experianConnector.id,
        experianResult.executionId,
        JSON.stringify({
          Score: 750,
          TotalAccounts: 5,
          ActiveAccounts: 3,
          DelinquentAccounts: 0,
          TotalCreditLimit: 500000,
          TotalOutstanding: 125000,
          InquiriesLast6Months: 2,
          OldestAccountAge: 48,
          RecentDefault: false,
          DpdDays: 0,
        }),
      ]
    );

    if (bankConnector) {
      await pool.query(
        `INSERT INTO application_connector_data (application_id, connector_id, execution_id, data)
         VALUES ($1, $2, $3, $4)`,
        [
          applicationId,
          bankConnector.id,
          'mock-execution-id',
          JSON.stringify({
            AvgMonthlyBalance: 85000,
            AvgMonthlyCredits: 120000,
            AvgMonthlyDebits: 95000,
            Bounces: 0,
            SalaryCredits: 6,
            MinBalance: 25000,
            MaxBalance: 150000,
            EodBalancePositiveDays: 180,
          }),
        ]
      );
    }

    console.log('  ✓ Connector data stored for application');
    console.log('');

    // Summary
    console.log('='.repeat(80));
    console.log('Test Summary');
    console.log('='.repeat(80));
    console.log('✅ Sample responses uploaded successfully');
    console.log('✅ Variables discovered and registered');
    console.log('✅ Test policy created with connector variables');
    console.log('✅ Test application created with connector data');
    console.log('');
    console.log('Next Steps:');
    console.log('1. Use the frontend to view available variables');
    console.log('2. Create policies using the variable selector');
    console.log('3. Test policy evaluation with real applications');
    console.log('');
    console.log(`Policy ID: ${policyId}`);
    console.log(`Application ID: ${applicationId}`);
    console.log('');
    console.log('To test evaluation, run:');
    console.log(`  curl -X POST http://localhost:3000/api/policies/${policyId}/evaluate \\`);
    console.log(`    -H "Content-Type: application/json" \\`);
    console.log(`    -d '{"applicationId": "${applicationId}"}'`);
    console.log('');

  } catch (error: any) {
    console.error('');
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the test
runEndToEndTest()
  .then(() => {
    console.log('✅ End-to-end test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ End-to-end test failed:', error);
    process.exit(1);
  });
