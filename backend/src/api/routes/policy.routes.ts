import { Router, Request, Response } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import {
  createPolicy,
  getPolicyById,
  getAllPolicies,
  updatePolicy,
  deletePolicy,
  activatePolicy,
  clonePolicy,
  validatePolicy,
} from '../../services/policy.service';
import logger from '../../utils/logger';
import { pool } from '../../config/database';

const router = Router();

/**
 * Create new policy
 * POST /api/policies
 */
router.post('/', authenticate, requireRole(['admin', 'policy_creator']), async (req: Request, res: Response) => {
  try {
    const { name, description, product_type, workflow_json, rules_summary } = req.body;
    const userId = req.user!.id;

    // Validate required fields
    if (!name || !product_type || !workflow_json) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, product_type, workflow_json',
      });
    }

    // Validate workflow structure (non-strict for drafts)
    const validation = await validatePolicy(workflow_json, false);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid workflow structure',
        details: validation.errors,
      });
    }

    // Create policy
    const policy = await createPolicy(
      name,
      description,
      product_type,
      workflow_json,
      rules_summary,
      userId
    );

    // Log audit (optional - skip if table doesn't exist)
    try {
      await pool.query(
        `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details)
         VALUES ($1, 'create_policy', 'policy', $2, $3)`,
        [userId, policy.id, JSON.stringify({ name, product_type })]
      );
    } catch (auditError) {
      logger.warn(`Audit logging failed: ${auditError.message}`);
    }

    logger.info(`Policy created: ${policy.id} by user ${userId}`);

    res.status(201).json({
      success: true,
      message: 'Policy created successfully',
      data: policy,
    });
  } catch (error: any) {
    logger.error(`Create policy error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get all policies
 * GET /api/policies
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { status, product_type, page = 1, limit = 20 } = req.query;

    const filters: any = {};
    if (status) filters.status = status;
    if (product_type) filters.product_type = product_type;

    const policies = await getAllPolicies(filters);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM policies WHERE 1=1';
    const countParams: any[] = [];

    if (status) {
      countParams.push(status);
      countQuery += ` AND status = $${countParams.length}`;
    }

    if (product_type) {
      countParams.push(product_type);
      countQuery += ` AND product_type = $${countParams.length}`;
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: policies,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    logger.error(`Get policies error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get policy by ID
 * GET /api/policies/:id
 */
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const policy = await getPolicyById(id);

    if (!policy) {
      return res.status(404).json({
        success: false,
        error: 'Policy not found',
      });
    }

    // Get policy versions
    const versions = await pool.query(
      `SELECT id, version, created_at, created_by, change_notes
       FROM policy_versions
       WHERE policy_id = $1
       ORDER BY version DESC`,
      [id]
    );

    // Add versions to response (not modifying policy object directly)
    const policyWithVersions = { ...policy, versions: versions.rows };

    res.json({
      success: true,
      data: policyWithVersions,
    });
  } catch (error: any) {
    logger.error(`Get policy error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Update policy
 * PUT /api/policies/:id
 */
router.put('/:id', authenticate, requireRole(['admin', 'policy_creator']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const userId = req.user!.id;

    // If workflow_json is being updated, validate it (non-strict for drafts)
    if (updates.workflow_json) {
      const validation = await validatePolicy(updates.workflow_json, false);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: 'Invalid workflow structure',
          details: validation.errors,
        });
      }
    }

    await updatePolicy(id, updates);

    // Get updated policy
    const updatedPolicy = await getPolicyById(id);

    if (!updatedPolicy) {
      return res.status(404).json({
        success: false,
        error: 'Policy not found',
      });
    }

    // Log audit (optional - skip if table doesn't exist)
    try {
      await pool.query(
        `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details)
         VALUES ($1, 'update_policy', 'policy', $2, $3)`,
        [userId, id, JSON.stringify({ updates: Object.keys(updates) })]
      );
    } catch (auditError) {
      logger.warn(`Audit logging failed: ${auditError.message}`);
    }

    logger.info(`Policy updated: ${id} by user ${userId}`);

    res.json({
      success: true,
      message: 'Policy updated successfully',
      data: updatedPolicy,
    });
  } catch (error: any) {
    logger.error(`Update policy error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Delete policy
 * DELETE /api/policies/:id
 */
router.delete('/:id', authenticate, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    await deletePolicy(id);

    // Log audit (optional - skip if table doesn't exist)
    try {
      await pool.query(
        `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details)
         VALUES ($1, 'delete_policy', 'policy', $2, $3)`,
        [userId, id, JSON.stringify({ deleted: true })]
      );
    } catch (auditError: any) {
      logger.warn(`Audit logging failed: ${auditError.message}`);
    }

    logger.info(`Policy deleted: ${id} by user ${userId}`);

    res.json({
      success: true,
      message: 'Policy deleted successfully',
    });
  } catch (error: any) {
    logger.error(`Delete policy error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Publish policy (validate with strict mode, then activate)
 * POST /api/policies/:id/publish
 */
router.post('/:id/publish', authenticate, requireRole(['admin', 'policy_creator']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Get policy first
    const policy = await getPolicyById(id);

    if (!policy) {
      return res.status(404).json({
        success: false,
        error: 'Policy not found',
      });
    }

    // Validate with STRICT mode (requires decision nodes, etc.)
    const validation = await validatePolicy(policy.workflow_json, true);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Policy cannot be published. Please fix validation errors.',
        details: validation.errors,
      });
    }

    // Activate the policy
    await activatePolicy(id);

    // Get the activated policy
    const activatedPolicy = await getPolicyById(id);

    // Log audit (optional - skip if table doesn't exist)
    try {
      await pool.query(
        `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details)
         VALUES ($1, 'publish_policy', 'policy', $2, $3)`,
        [userId, id, JSON.stringify({ published: true })]
      );
    } catch (auditError: any) {
      logger.warn(`Audit logging failed: ${auditError.message}`);
    }

    logger.info(`Policy published: ${id} by user ${userId}`);

    res.json({
      success: true,
      message: 'Policy published successfully',
      data: activatedPolicy,
    });
  } catch (error: any) {
    logger.error(`Publish policy error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Activate policy
 * POST /api/policies/:id/activate
 */
router.post('/:id/activate', authenticate, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    await activatePolicy(id);

    // Get the activated policy
    const policy = await getPolicyById(id);

    if (!policy) {
      return res.status(404).json({
        success: false,
        error: 'Policy not found',
      });
    }

    // Log audit (optional - skip if table doesn't exist)
    try {
      await pool.query(
        `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details)
         VALUES ($1, 'activate_policy', 'policy', $2, $3)`,
        [userId, id, JSON.stringify({ activated: true })]
      );
    } catch (auditError: any) {
      logger.warn(`Audit logging failed: ${auditError.message}`);
    }

    logger.info(`Policy activated: ${id} by user ${userId}`);

    res.json({
      success: true,
      message: 'Policy activated successfully',
      data: policy,
    });
  } catch (error: any) {
    logger.error(`Activate policy error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Clone policy
 * POST /api/policies/:id/clone
 */
router.post('/:id/clone', authenticate, requireRole(['admin', 'policy_creator']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const userId = req.user!.id;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Name is required for cloned policy',
      });
    }

    const clonedPolicy = await clonePolicy(id, name, userId);

    if (!clonedPolicy) {
      return res.status(404).json({
        success: false,
        error: 'Policy not found',
      });
    }

    // Log audit (optional - skip if table doesn't exist)
    try {
      await pool.query(
        `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details)
         VALUES ($1, 'clone_policy', 'policy', $2, $3)`,
        [userId, clonedPolicy.id, JSON.stringify({ cloned_from: id, name })]
      );
    } catch (auditError: any) {
      logger.warn(`Audit logging failed: ${auditError.message}`);
    }

    logger.info(`Policy cloned: ${id} -> ${clonedPolicy.id} by user ${userId}`);

    res.status(201).json({
      success: true,
      message: 'Policy cloned successfully',
      data: clonedPolicy,
    });
  } catch (error: any) {
    logger.error(`Clone policy error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Validate policy workflow
 * POST /api/policies/validate
 */
router.post('/validate/workflow', authenticate, requireRole(['admin', 'policy_creator']), async (req: Request, res: Response) => {
  try {
    const { workflow_json } = req.body;

    if (!workflow_json) {
      return res.status(400).json({
        success: false,
        error: 'workflow_json is required',
      });
    }

    const validation = await validatePolicy(workflow_json);

    res.json({
      success: true,
      valid: validation.valid,
      errors: validation.errors,
    });
  } catch (error: any) {
    logger.error(`Validate policy error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get policy statistics
 * GET /api/policies/:id/stats
 */
router.get('/:id/stats', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { dateFrom, dateTo } = req.query;

    let query = `
      SELECT
        COUNT(*) as total_applications,
        SUM(CASE WHEN decision = 'approved' THEN 1 ELSE 0 END) as approved_count,
        SUM(CASE WHEN decision = 'rejected' THEN 1 ELSE 0 END) as rejected_count,
        SUM(CASE WHEN decision = 'manual_review' THEN 1 ELSE 0 END) as manual_review_count,
        AVG(execution_time_ms) as avg_execution_time_ms
      FROM api_requests
      WHERE policy_id = $1
    `;

    const params: any[] = [id];

    if (dateFrom) {
      params.push(dateFrom);
      query += ` AND created_at >= $${params.length}`;
    }

    if (dateTo) {
      params.push(dateTo);
      query += ` AND created_at <= $${params.length}`;
    }

    const result = await pool.query(query, params);
    const stats = result.rows[0];

    // Convert to numbers
    const data = {
      total_applications: parseInt(stats.total_applications) || 0,
      approved_count: parseInt(stats.approved_count) || 0,
      rejected_count: parseInt(stats.rejected_count) || 0,
      manual_review_count: parseInt(stats.manual_review_count) || 0,
      avg_execution_time_ms: Math.round(parseFloat(stats.avg_execution_time_ms) || 0),
    };

    // Calculate rates
    const total = data.total_applications;
    const rates = {
      approval_rate: total > 0 ? ((data.approved_count / total) * 100).toFixed(2) : '0.00',
      rejection_rate: total > 0 ? ((data.rejected_count / total) * 100).toFixed(2) : '0.00',
      manual_review_rate: total > 0 ? ((data.manual_review_count / total) * 100).toFixed(2) : '0.00',
    };

    res.json({
      success: true,
      data: {
        ...data,
        ...rates,
      },
    });
  } catch (error: any) {
    logger.error(`Get policy stats error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Test policy with sample data
 * POST /api/policies/:id/test
 */
router.post('/:id/test', authenticate, requireRole(['admin', 'policy_creator']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { test_data } = req.body;

    if (!test_data) {
      return res.status(400).json({
        success: false,
        error: 'test_data is required',
      });
    }

    const policy = await getPolicyById(id);

    if (!policy) {
      return res.status(404).json({
        success: false,
        error: 'Policy not found',
      });
    }

    // Execute workflow with test data
    const { executeWorkflow } = require('../../engine/workflow-executor');

    const result = await executeWorkflow(
      policy.workflow_json,
      test_data,
      id,
      'TEST_' + Date.now()
    );

    res.json({
      success: true,
      message: 'Policy test executed successfully',
      data: {
        decision: result.decision,
        reason: result.reason,
        details: result.details,
        execution_trace: result.trace,
        execution_time_ms: result.execution_time_ms,
      },
    });
  } catch (error: any) {
    logger.error(`Test policy error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
