import { Router, Request, Response } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { pool } from '../../config/database';
import logger from '../../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { getPolicyById } from '../../services/policy.service';
import { executeWorkflow } from '../../engine/workflow-executor';

const router = Router();

/**
 * Create test case
 * POST /api/testing/cases
 */
router.post('/cases', authenticate, requireRole(['admin', 'policy_creator']), async (req: Request, res: Response) => {
  try {
    const { policy_id, name, description, test_data, expected_decision, expected_reason, tags } = req.body;
    const userId = req.user!.id;

    // Validate required fields
    if (!policy_id || !name || !test_data || !expected_decision) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: policy_id, name, test_data, expected_decision',
      });
    }

    // Verify policy exists
    const policy = await getPolicyById(policy_id);
    if (!policy) {
      return res.status(404).json({ success: false, error: 'Policy not found' });
    }

    // Insert test case
    const result = await pool.query(
      `INSERT INTO test_cases (policy_id, name, description, test_data, expected_decision, expected_reason, tags, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        policy_id,
        name,
        description,
        JSON.stringify(test_data),
        expected_decision,
        expected_reason,
        tags ? JSON.stringify(tags) : null,
        userId,
      ]
    );

    logger.info(`Test case created: ${result.rows[0].id} for policy ${policy_id}`);

    res.status(201).json({
      success: true,
      message: 'Test case created successfully',
      data: result.rows[0],
    });
  } catch (error: any) {
    logger.error(`Create test case error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get all test cases for a policy
 * GET /api/testing/cases
 */
router.get('/cases', authenticate, async (req: Request, res: Response) => {
  try {
    const { policy_id, page = 1, limit = 20 } = req.query;

    if (!policy_id) {
      return res.status(400).json({ success: false, error: 'policy_id is required' });
    }

    const offset = (Number(page) - 1) * Number(limit);

    const result = await pool.query(
      `SELECT
        tc.*,
        u.name as created_by_name,
        (SELECT COUNT(*) FROM test_results WHERE test_case_id = tc.id) as total_runs,
        (SELECT COUNT(*) FROM test_results WHERE test_case_id = tc.id AND passed = true) as passed_runs
       FROM test_cases tc
       LEFT JOIN users u ON tc.created_by = u.id
       WHERE tc.policy_id = $1
       ORDER BY tc.created_at DESC
       LIMIT $2 OFFSET $3`,
      [policy_id, Number(limit), offset]
    );

    // Get total count
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM test_cases WHERE policy_id = $1',
      [policy_id]
    );

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(parseInt(countResult.rows[0].count) / Number(limit)),
      },
    });
  } catch (error: any) {
    logger.error(`Get test cases error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get single test case
 * GET /api/testing/cases/:id
 */
router.get('/cases/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT tc.*, u.name as created_by_name
       FROM test_cases tc
       LEFT JOIN users u ON tc.created_by = u.id
       WHERE tc.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Test case not found' });
    }

    // Get recent test results
    const resultsQuery = await pool.query(
      `SELECT * FROM test_results
       WHERE test_case_id = $1
       ORDER BY executed_at DESC
       LIMIT 10`,
      [id]
    );

    const testCase = result.rows[0];
    testCase.recent_results = resultsQuery.rows;

    res.json({
      success: true,
      data: testCase,
    });
  } catch (error: any) {
    logger.error(`Get test case error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Update test case
 * PUT /api/testing/cases/:id
 */
router.put('/cases/:id', authenticate, requireRole(['admin', 'policy_creator']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, test_data, expected_decision, expected_reason, tags } = req.body;

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (name) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }

    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }

    if (test_data) {
      updates.push(`test_data = $${paramCount++}`);
      values.push(JSON.stringify(test_data));
    }

    if (expected_decision) {
      updates.push(`expected_decision = $${paramCount++}`);
      values.push(expected_decision);
    }

    if (expected_reason !== undefined) {
      updates.push(`expected_reason = $${paramCount++}`);
      values.push(expected_reason);
    }

    if (tags !== undefined) {
      updates.push(`tags = $${paramCount++}`);
      values.push(tags ? JSON.stringify(tags) : null);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    values.push(id);

    const result = await pool.query(
      `UPDATE test_cases SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Test case not found' });
    }

    logger.info(`Test case updated: ${id}`);

    res.json({
      success: true,
      message: 'Test case updated successfully',
      data: result.rows[0],
    });
  } catch (error: any) {
    logger.error(`Update test case error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Delete test case
 * DELETE /api/testing/cases/:id
 */
router.delete('/cases/:id', authenticate, requireRole(['admin', 'policy_creator']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Delete test results first (cascade)
    await pool.query('DELETE FROM test_results WHERE test_case_id = $1', [id]);

    // Delete test case
    const result = await pool.query('DELETE FROM test_cases WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Test case not found' });
    }

    logger.info(`Test case deleted: ${id}`);

    res.json({
      success: true,
      message: 'Test case deleted successfully',
    });
  } catch (error: any) {
    logger.error(`Delete test case error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Run single test case
 * POST /api/testing/cases/:id/run
 */
router.post('/cases/:id/run', authenticate, requireRole(['admin', 'policy_creator']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Get test case
    const testCaseResult = await pool.query(
      'SELECT * FROM test_cases WHERE id = $1',
      [id]
    );

    if (testCaseResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Test case not found' });
    }

    const testCase = testCaseResult.rows[0];

    // Get policy
    const policy = await getPolicyById(testCase.policy_id);

    if (!policy) {
      return res.status(404).json({ success: false, error: 'Policy not found' });
    }

    // Execute workflow
    const startTime = Date.now();
    let executionResult;
    let executionError = null;

    try {
      executionResult = await executeWorkflow(
        policy.workflow_json,
        JSON.parse(testCase.test_data),
        testCase.policy_id,
        'TEST_' + id
      );
    } catch (error: any) {
      executionError = error.message;
      executionResult = { decision: 'error', reason: error.message };
    }

    const executionTime = Date.now() - startTime;

    // Check if test passed
    const passed = executionResult.decision === testCase.expected_decision &&
                   (!testCase.expected_reason || executionResult.reason === testCase.expected_reason);

    // Save test result
    const resultId = uuidv4();
    await pool.query(
      `INSERT INTO test_results (id, test_case_id, passed, actual_decision, actual_reason, execution_trace, execution_time_ms, executed_by, error_message)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        resultId,
        id,
        passed,
        executionResult.decision,
        executionResult.reason,
        JSON.stringify(executionResult.trace || {}),
        executionTime,
        userId,
        executionError,
      ]
    );

    logger.info(`Test case executed: ${id}, passed: ${passed}`);

    res.json({
      success: true,
      message: 'Test executed successfully',
      data: {
        test_result_id: resultId,
        passed,
        expected: {
          decision: testCase.expected_decision,
          reason: testCase.expected_reason,
        },
        actual: {
          decision: executionResult.decision,
          reason: executionResult.reason,
          details: executionResult.details,
        },
        execution_time_ms: executionTime,
        execution_trace: executionResult.trace,
      },
    });
  } catch (error: any) {
    logger.error(`Run test case error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Run all test cases for a policy
 * POST /api/testing/policies/:policy_id/run-all
 */
router.post('/policies/:policy_id/run-all', authenticate, requireRole(['admin', 'policy_creator']), async (req: Request, res: Response) => {
  try {
    const { policy_id } = req.params;
    const userId = req.user!.id;

    // Get all test cases
    const testCasesResult = await pool.query(
      'SELECT * FROM test_cases WHERE policy_id = $1',
      [policy_id]
    );

    if (testCasesResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'No test cases found for this policy' });
    }

    // Get policy
    const policy = await getPolicyById(policy_id);

    if (!policy) {
      return res.status(404).json({ success: false, error: 'Policy not found' });
    }

    const results = [];
    let passedCount = 0;
    let failedCount = 0;

    // Run all test cases
    for (const testCase of testCasesResult.rows) {
      const startTime = Date.now();
      let executionResult;
      let executionError = null;

      try {
        executionResult = await executeWorkflow(
          policy.workflow_json,
          JSON.parse(testCase.test_data),
          policy_id,
          'TEST_' + testCase.id
        );
      } catch (error: any) {
        executionError = error.message;
        executionResult = { decision: 'error', reason: error.message };
      }

      const executionTime = Date.now() - startTime;

      // Check if test passed
      const passed = executionResult.decision === testCase.expected_decision &&
                     (!testCase.expected_reason || executionResult.reason === testCase.expected_reason);

      if (passed) {
        passedCount++;
      } else {
        failedCount++;
      }

      // Save test result
      const resultId = uuidv4();
      await pool.query(
        `INSERT INTO test_results (id, test_case_id, passed, actual_decision, actual_reason, execution_trace, execution_time_ms, executed_by, error_message)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          resultId,
          testCase.id,
          passed,
          executionResult.decision,
          executionResult.reason,
          JSON.stringify(executionResult.trace || {}),
          executionTime,
          userId,
          executionError,
        ]
      );

      results.push({
        test_case_id: testCase.id,
        test_case_name: testCase.name,
        passed,
        execution_time_ms: executionTime,
      });
    }

    logger.info(`All test cases executed for policy ${policy_id}: ${passedCount} passed, ${failedCount} failed`);

    res.json({
      success: true,
      message: 'All tests executed successfully',
      data: {
        total_tests: testCasesResult.rows.length,
        passed: passedCount,
        failed: failedCount,
        pass_rate: ((passedCount / testCasesResult.rows.length) * 100).toFixed(2),
        results,
      },
    });
  } catch (error: any) {
    logger.error(`Run all tests error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get test results
 * GET /api/testing/results
 */
router.get('/results', authenticate, async (req: Request, res: Response) => {
  try {
    const { test_case_id, policy_id, passed, page = 1, limit = 20 } = req.query;

    let query = `
      SELECT
        tr.*,
        tc.name as test_case_name,
        tc.policy_id,
        u.name as executed_by_name
      FROM test_results tr
      JOIN test_cases tc ON tr.test_case_id = tc.id
      LEFT JOIN users u ON tr.executed_by = u.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (test_case_id) {
      params.push(test_case_id);
      query += ` AND tr.test_case_id = $${params.length}`;
    }

    if (policy_id) {
      params.push(policy_id);
      query += ` AND tc.policy_id = $${params.length}`;
    }

    if (passed !== undefined) {
      params.push(passed === 'true');
      query += ` AND tr.passed = $${params.length}`;
    }

    const offset = (Number(page) - 1) * Number(limit);
    query += ` ORDER BY tr.executed_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(Number(limit), offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = `SELECT COUNT(*) FROM test_results tr JOIN test_cases tc ON tr.test_case_id = tc.id WHERE 1=1`;
    const countParams: any[] = [];

    if (test_case_id) {
      countParams.push(test_case_id);
      countQuery += ` AND tr.test_case_id = $${countParams.length}`;
    }

    if (policy_id) {
      countParams.push(policy_id);
      countQuery += ` AND tc.policy_id = $${countParams.length}`;
    }

    if (passed !== undefined) {
      countParams.push(passed === 'true');
      countQuery += ` AND tr.passed = $${countParams.length}`;
    }

    const countResult = await pool.query(countQuery, countParams);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(parseInt(countResult.rows[0].count) / Number(limit)),
      },
    });
  } catch (error: any) {
    logger.error(`Get test results error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get test statistics for a policy
 * GET /api/testing/policies/:policy_id/stats
 */
router.get('/policies/:policy_id/stats', authenticate, async (req: Request, res: Response) => {
  try {
    const { policy_id } = req.params;

    // Get test case stats
    const testCaseStats = await pool.query(
      `SELECT
        COUNT(*) as total_test_cases
       FROM test_cases
       WHERE policy_id = $1`,
      [policy_id]
    );

    // Get test result stats
    const testResultStats = await pool.query(
      `SELECT
        COUNT(*) as total_runs,
        SUM(CASE WHEN passed = true THEN 1 ELSE 0 END) as passed_runs,
        SUM(CASE WHEN passed = false THEN 1 ELSE 0 END) as failed_runs,
        AVG(execution_time_ms) as avg_execution_time
       FROM test_results tr
       JOIN test_cases tc ON tr.test_case_id = tc.id
       WHERE tc.policy_id = $1`,
      [policy_id]
    );

    // Get recent test runs
    const recentRuns = await pool.query(
      `SELECT
        tr.executed_at,
        SUM(CASE WHEN tr.passed = true THEN 1 ELSE 0 END) as passed,
        SUM(CASE WHEN tr.passed = false THEN 1 ELSE 0 END) as failed
       FROM test_results tr
       JOIN test_cases tc ON tr.test_case_id = tc.id
       WHERE tc.policy_id = $1
       AND tr.executed_at > NOW() - INTERVAL '7 days'
       GROUP BY DATE(tr.executed_at), tr.executed_at
       ORDER BY tr.executed_at DESC
       LIMIT 10`,
      [policy_id]
    );

    const stats = testResultStats.rows[0];

    res.json({
      success: true,
      data: {
        total_test_cases: parseInt(testCaseStats.rows[0].total_test_cases) || 0,
        total_runs: parseInt(stats.total_runs) || 0,
        passed_runs: parseInt(stats.passed_runs) || 0,
        failed_runs: parseInt(stats.failed_runs) || 0,
        pass_rate: stats.total_runs > 0
          ? ((stats.passed_runs / stats.total_runs) * 100).toFixed(2)
          : '0.00',
        avg_execution_time_ms: Math.round(parseFloat(stats.avg_execution_time) || 0),
        recent_runs: recentRuns.rows,
      },
    });
  } catch (error: any) {
    logger.error(`Get test stats error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
