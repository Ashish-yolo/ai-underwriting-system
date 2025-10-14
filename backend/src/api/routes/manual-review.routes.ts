import { Router, Request, Response } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { pool } from '../../config/database';
import logger from '../../utils/logger';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/**
 * Get all manual review applications
 * GET /api/manual-review
 */
router.get('/', authenticate, requireRole(['admin', 'reviewer']), async (req: Request, res: Response) => {
  try {
    const { status, priority, page = 1, limit = 20, sortBy = 'created_at', sortOrder = 'DESC' } = req.query;

    let query = `
      SELECT
        mr.id,
        mr.application_id,
        mr.underwriting_id,
        mr.policy_id,
        mr.applicant_data,
        mr.review_reason,
        mr.status,
        mr.priority,
        mr.sla_deadline,
        mr.created_at,
        mr.assigned_to,
        mr.reviewed_by,
        mr.reviewed_at,
        mr.review_decision,
        mr.review_notes,
        p.name as policy_name,
        u.name as assigned_to_name,
        reviewer.name as reviewed_by_name
      FROM manual_reviews mr
      LEFT JOIN policies p ON mr.policy_id = p.id
      LEFT JOIN users u ON mr.assigned_to = u.id
      LEFT JOIN users reviewer ON mr.reviewed_by = reviewer.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (status) {
      params.push(status);
      query += ` AND mr.status = $${params.length}`;
    }

    if (priority) {
      params.push(priority);
      query += ` AND mr.priority = $${params.length}`;
    }

    const offset = (Number(page) - 1) * Number(limit);
    query += ` ORDER BY mr.${sortBy} ${sortOrder} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(Number(limit), offset);

    const result = await pool.query(query, params);

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM manual_reviews WHERE 1=1${status ? ' AND status = $1' : ''}${priority ? ' AND priority = $' + (status ? '2' : '1') : ''}`;
    const countParams: any[] = [];
    if (status) countParams.push(status);
    if (priority) countParams.push(priority);
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
    logger.error(`Get manual reviews error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get single manual review application
 * GET /api/manual-review/:id
 */
router.get('/:id', authenticate, requireRole(['admin', 'reviewer']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT
        mr.*,
        p.name as policy_name,
        p.workflow_json,
        u.name as assigned_to_name,
        reviewer.name as reviewed_by_name
       FROM manual_reviews mr
       LEFT JOIN policies p ON mr.policy_id = p.id
       LEFT JOIN users u ON mr.assigned_to = u.id
       LEFT JOIN users reviewer ON mr.reviewed_by = reviewer.id
       WHERE mr.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Review not found' });
    }

    // Get review activities
    const activities = await pool.query(
      `SELECT
        ra.*,
        u.name as user_name
       FROM review_activities ra
       LEFT JOIN users u ON ra.user_id = u.id
       WHERE ra.review_id = $1
       ORDER BY ra.created_at DESC`,
      [id]
    );

    const review = result.rows[0];
    review.activities = activities.rows;

    res.json({
      success: true,
      data: review,
    });
  } catch (error: any) {
    logger.error(`Get manual review error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Assign review to user
 * PUT /api/manual-review/:id/assign
 */
router.put('/:id/assign', authenticate, requireRole(['admin', 'reviewer']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    const assignedBy = req.user!.id;

    // Assign review
    await pool.query(
      `UPDATE manual_reviews SET assigned_to = $1, status = 'in_review' WHERE id = $2`,
      [userId, id]
    );

    // Log activity
    await pool.query(
      `INSERT INTO review_activities (review_id, user_id, action, details)
       VALUES ($1, $2, 'assigned', $3)`,
      [id, assignedBy, JSON.stringify({ assigned_to: userId })]
    );

    // Log audit
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details)
       VALUES ($1, 'assign_review', 'manual_review', $2, $3)`,
      [assignedBy, id, JSON.stringify({ assigned_to: userId })]
    );

    logger.info(`Review ${id} assigned to user ${userId}`);

    res.json({ success: true, message: 'Review assigned successfully' });
  } catch (error: any) {
    logger.error(`Assign review error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Complete review and submit decision
 * POST /api/manual-review/:id/complete
 */
router.post('/:id/complete', authenticate, requireRole(['admin', 'reviewer']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { decision, notes, approvedAmount, interestRate, conditions } = req.body;
    const userId = req.user!.id;

    // Validate decision
    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({ success: false, error: 'Invalid decision. Must be approved or rejected.' });
    }

    // Update review
    const result = await pool.query(
      `UPDATE manual_reviews
       SET status = $1,
           review_decision = $2,
           review_notes = $3,
           reviewed_by = $4,
           reviewed_at = NOW()
       WHERE id = $5
       RETURNING application_id, underwriting_id`,
      [decision, decision, notes, userId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Review not found' });
    }

    const { application_id, underwriting_id } = result.rows[0];

    // Log activity
    await pool.query(
      `INSERT INTO review_activities (review_id, user_id, action, details)
       VALUES ($1, $2, 'decision', $3)`,
      [
        id,
        userId,
        JSON.stringify({
          decision,
          notes,
          approved_amount: approvedAmount,
          interest_rate: interestRate,
          conditions,
        }),
      ]
    );

    // Log audit
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details)
       VALUES ($1, 'complete_review', 'manual_review', $2, $3)`,
      [userId, id, JSON.stringify({ decision, application_id })]
    );

    logger.info(`Review ${id} completed with decision: ${decision}`);

    res.json({
      success: true,
      message: 'Review completed successfully',
      data: {
        application_id,
        underwriting_id,
        decision,
        reviewed_by: userId,
      },
    });
  } catch (error: any) {
    logger.error(`Complete review error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Add comment to review
 * POST /api/manual-review/:id/comment
 */
router.post('/:id/comment', authenticate, requireRole(['admin', 'reviewer']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    const userId = req.user!.id;

    if (!comment || comment.trim() === '') {
      return res.status(400).json({ success: false, error: 'Comment cannot be empty' });
    }

    // Log activity
    await pool.query(
      `INSERT INTO review_activities (review_id, user_id, action, details)
       VALUES ($1, $2, 'comment', $3)`,
      [id, userId, JSON.stringify({ comment })]
    );

    logger.info(`Comment added to review ${id} by user ${userId}`);

    res.json({ success: true, message: 'Comment added successfully' });
  } catch (error: any) {
    logger.error(`Add comment error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get review statistics
 * GET /api/manual-review/stats
 */
router.get('/dashboard/stats', authenticate, requireRole(['admin', 'reviewer']), async (req: Request, res: Response) => {
  try {
    const { dateFrom, dateTo } = req.query;

    let query = `
      SELECT
        COUNT(*) as total_reviews,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
        SUM(CASE WHEN status = 'in_review' THEN 1 ELSE 0 END) as in_review_count,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_count,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_count,
        SUM(CASE WHEN priority = 'urgent' THEN 1 ELSE 0 END) as urgent_count,
        SUM(CASE WHEN sla_deadline < NOW() AND status = 'pending' THEN 1 ELSE 0 END) as overdue_count
      FROM manual_reviews
      WHERE 1=1
    `;

    const params: any[] = [];

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
    Object.keys(stats).forEach(key => {
      stats[key] = parseInt(stats[key]) || 0;
    });

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    logger.error(`Get review stats error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Bulk assign reviews
 * POST /api/manual-review/bulk/assign
 */
router.post('/bulk/assign', authenticate, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { reviewIds, userId } = req.body;
    const assignedBy = req.user!.id;

    if (!Array.isArray(reviewIds) || reviewIds.length === 0) {
      return res.status(400).json({ success: false, error: 'Invalid reviewIds array' });
    }

    // Bulk assign
    await pool.query(
      `UPDATE manual_reviews SET assigned_to = $1, status = 'in_review' WHERE id = ANY($2)`,
      [userId, reviewIds]
    );

    // Log activities
    for (const reviewId of reviewIds) {
      await pool.query(
        `INSERT INTO review_activities (review_id, user_id, action, details)
         VALUES ($1, $2, 'assigned', $3)`,
        [reviewId, assignedBy, JSON.stringify({ assigned_to: userId })]
      );
    }

    logger.info(`Bulk assigned ${reviewIds.length} reviews to user ${userId}`);

    res.json({ success: true, message: `${reviewIds.length} reviews assigned successfully` });
  } catch (error: any) {
    logger.error(`Bulk assign error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
