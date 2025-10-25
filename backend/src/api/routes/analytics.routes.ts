import { Router, Request, Response } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { pool } from '../../config/database';
import logger from '../../utils/logger';
import {
  getAllAnalytics,
  getDailyVolumeAndApprovalTrend,
  getApplicationFunnel,
  getApprovalRateByCreditScore,
  getStrategyPerformance,
  getDecisionSplit,
} from '../../services/analytics.service';

const router = Router();

/**
 * GET /api/analytics/dashboard
 * Get all dashboard analytics data
 */
router.get('/dashboard', authenticate, async (req: Request, res: Response) => {
  try {
    const analytics = await getAllAnalytics();
    res.json({ success: true, data: analytics });
  } catch (error: any) {
    logger.error(`Get dashboard analytics error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/analytics/daily-trend
 * Get daily volume and approval trend
 */
router.get('/daily-trend', authenticate, async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const data = await getDailyVolumeAndApprovalTrend(days);
    res.json({ success: true, data });
  } catch (error: any) {
    logger.error(`Get daily trend error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/analytics/funnel
 * Get application funnel
 */
router.get('/funnel', authenticate, async (req: Request, res: Response) => {
  try {
    const data = await getApplicationFunnel();
    res.json({ success: true, data });
  } catch (error: any) {
    logger.error(`Get funnel error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/analytics/credit-score-bands
 * Get approval rate by credit score band
 */
router.get('/credit-score-bands', authenticate, async (req: Request, res: Response) => {
  try {
    const data = await getApprovalRateByCreditScore();
    res.json({ success: true, data });
  } catch (error: any) {
    logger.error(`Get credit score bands error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/analytics/strategy-performance
 * Get champion vs challenger performance
 */
router.get('/strategy-performance', authenticate, async (req: Request, res: Response) => {
  try {
    const data = await getStrategyPerformance();
    res.json({ success: true, data });
  } catch (error: any) {
    logger.error(`Get strategy performance error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/analytics/decision-split
 * Get manual vs auto decision split
 */
router.get('/decision-split', authenticate, async (req: Request, res: Response) => {
  try {
    const data = await getDecisionSplit();
    res.json({ success: true, data });
  } catch (error: any) {
    logger.error(`Get decision split error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get overall system analytics
 * GET /api/analytics/overview
 */
router.get('/overview', authenticate, async (req: Request, res: Response) => {
  try {
    const { dateFrom, dateTo } = req.query;

    // Build date filter
    let dateFilter = '';
    const params: any[] = [];

    if (dateFrom) {
      params.push(dateFrom);
      dateFilter += ` AND created_at >= $${params.length}`;
    }

    if (dateTo) {
      params.push(dateTo);
      dateFilter += ` AND created_at <= $${params.length}`;
    }

    // Get application statistics
    const appStats = await pool.query(
      `SELECT
        COUNT(*) as total_applications,
        SUM(CASE WHEN decision = 'approved' THEN 1 ELSE 0 END) as approved_count,
        SUM(CASE WHEN decision = 'rejected' THEN 1 ELSE 0 END) as rejected_count,
        SUM(CASE WHEN decision = 'manual_review' THEN 1 ELSE 0 END) as manual_review_count,
        AVG(execution_time_ms) as avg_execution_time,
        MAX(execution_time_ms) as max_execution_time,
        MIN(execution_time_ms) as min_execution_time
       FROM api_requests
       WHERE 1=1 ${dateFilter}`,
      params
    );

    // Get policy usage
    const policyUsage = await pool.query(
      `SELECT
        p.id,
        p.name,
        COUNT(ar.id) as request_count,
        SUM(CASE WHEN ar.decision = 'approved' THEN 1 ELSE 0 END) as approved_count
       FROM policies p
       LEFT JOIN api_requests ar ON p.id = ar.policy_id ${dateFilter ? 'AND ar.created_at >= $1' + (dateTo ? ' AND ar.created_at <= $2' : '') : ''}
       GROUP BY p.id, p.name
       ORDER BY request_count DESC
       LIMIT 10`,
      params
    );

    // Get connector usage
    const connectorUsage = await pool.query(
      `SELECT
        c.id,
        c.name,
        c.type,
        COUNT(cl.id) as call_count,
        SUM(CASE WHEN cl.status = 'success' THEN 1 ELSE 0 END) as success_count,
        AVG(cl.response_time_ms) as avg_response_time
       FROM connectors c
       LEFT JOIN connector_logs cl ON c.id = cl.connector_id ${dateFilter ? 'AND cl.created_at >= $1' + (dateTo ? ' AND cl.created_at <= $2' : '') : ''}
       GROUP BY c.id, c.name, c.type
       ORDER BY call_count DESC
       LIMIT 10`,
      params
    );

    // Get daily trends
    const dailyTrends = await pool.query(
      `SELECT
        DATE(created_at) as date,
        COUNT(*) as total,
        SUM(CASE WHEN decision = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN decision = 'rejected' THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN decision = 'manual_review' THEN 1 ELSE 0 END) as manual_review,
        AVG(execution_time_ms) as avg_execution_time
       FROM api_requests
       WHERE created_at >= NOW() - INTERVAL '30 days' ${dateFilter}
       GROUP BY DATE(created_at)
       ORDER BY date DESC
       LIMIT 30`,
      params
    );

    const stats = appStats.rows[0];

    res.json({
      success: true,
      data: {
        summary: {
          total_applications: parseInt(stats.total_applications) || 0,
          approved_count: parseInt(stats.approved_count) || 0,
          rejected_count: parseInt(stats.rejected_count) || 0,
          manual_review_count: parseInt(stats.manual_review_count) || 0,
          approval_rate: stats.total_applications > 0
            ? ((stats.approved_count / stats.total_applications) * 100).toFixed(2)
            : '0.00',
          rejection_rate: stats.total_applications > 0
            ? ((stats.rejected_count / stats.total_applications) * 100).toFixed(2)
            : '0.00',
          manual_review_rate: stats.total_applications > 0
            ? ((stats.manual_review_count / stats.total_applications) * 100).toFixed(2)
            : '0.00',
          avg_execution_time_ms: Math.round(parseFloat(stats.avg_execution_time) || 0),
          max_execution_time_ms: parseInt(stats.max_execution_time) || 0,
          min_execution_time_ms: parseInt(stats.min_execution_time) || 0,
        },
        policy_usage: policyUsage.rows,
        connector_usage: connectorUsage.rows,
        daily_trends: dailyTrends.rows,
      },
    });
  } catch (error: any) {
    logger.error(`Get overview analytics error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get policy-specific analytics
 * GET /api/analytics/policies/:policy_id
 */
router.get('/policies/:policy_id', authenticate, async (req: Request, res: Response) => {
  try {
    const { policy_id } = req.params;
    const { dateFrom, dateTo } = req.query;

    let dateFilter = '';
    const params: any[] = [policy_id];

    if (dateFrom) {
      params.push(dateFrom);
      dateFilter += ` AND created_at >= $${params.length}`;
    }

    if (dateTo) {
      params.push(dateTo);
      dateFilter += ` AND created_at <= $${params.length}`;
    }

    // Get basic stats
    const basicStats = await pool.query(
      `SELECT
        COUNT(*) as total_applications,
        SUM(CASE WHEN decision = 'approved' THEN 1 ELSE 0 END) as approved_count,
        SUM(CASE WHEN decision = 'rejected' THEN 1 ELSE 0 END) as rejected_count,
        SUM(CASE WHEN decision = 'manual_review' THEN 1 ELSE 0 END) as manual_review_count,
        AVG(execution_time_ms) as avg_execution_time
       FROM api_requests
       WHERE policy_id = $1 ${dateFilter}`,
      params
    );

    // Get hourly distribution
    const hourlyDist = await pool.query(
      `SELECT
        EXTRACT(HOUR FROM created_at) as hour,
        COUNT(*) as count
       FROM api_requests
       WHERE policy_id = $1 ${dateFilter}
       GROUP BY hour
       ORDER BY hour`,
      params
    );

    // Get decision reasons
    const decisionReasons = await pool.query(
      `SELECT
        decision,
        response_data->>'reason' as reason,
        COUNT(*) as count
       FROM api_requests
       WHERE policy_id = $1 ${dateFilter}
       GROUP BY decision, reason
       ORDER BY count DESC
       LIMIT 20`,
      params
    );

    // Get execution time percentiles
    const execTimePercentiles = await pool.query(
      `SELECT
        PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY execution_time_ms) as p50,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY execution_time_ms) as p75,
        PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY execution_time_ms) as p90,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY execution_time_ms) as p95,
        PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY execution_time_ms) as p99
       FROM api_requests
       WHERE policy_id = $1 ${dateFilter}`,
      params
    );

    const stats = basicStats.rows[0];

    res.json({
      success: true,
      data: {
        summary: {
          total_applications: parseInt(stats.total_applications) || 0,
          approved_count: parseInt(stats.approved_count) || 0,
          rejected_count: parseInt(stats.rejected_count) || 0,
          manual_review_count: parseInt(stats.manual_review_count) || 0,
          approval_rate: stats.total_applications > 0
            ? ((stats.approved_count / stats.total_applications) * 100).toFixed(2)
            : '0.00',
          avg_execution_time_ms: Math.round(parseFloat(stats.avg_execution_time) || 0),
        },
        hourly_distribution: hourlyDist.rows,
        decision_reasons: decisionReasons.rows,
        execution_time_percentiles: execTimePercentiles.rows[0],
      },
    });
  } catch (error: any) {
    logger.error(`Get policy analytics error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get manual review analytics
 * GET /api/analytics/manual-reviews
 */
router.get('/manual-reviews', authenticate, requireRole(['admin', 'reviewer']), async (req: Request, res: Response) => {
  try {
    const { dateFrom, dateTo } = req.query;

    let dateFilter = '';
    const params: any[] = [];

    if (dateFrom) {
      params.push(dateFrom);
      dateFilter += ` AND created_at >= $${params.length}`;
    }

    if (dateTo) {
      params.push(dateTo);
      dateFilter += ` AND created_at <= $${params.length}`;
    }

    // Get manual review stats
    const reviewStats = await pool.query(
      `SELECT
        COUNT(*) as total_reviews,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
        SUM(CASE WHEN status = 'in_review' THEN 1 ELSE 0 END) as in_review_count,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_count,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_count,
        SUM(CASE WHEN priority = 'urgent' THEN 1 ELSE 0 END) as urgent_count,
        SUM(CASE WHEN sla_deadline < NOW() AND status IN ('pending', 'in_review') THEN 1 ELSE 0 END) as overdue_count,
        AVG(EXTRACT(EPOCH FROM (reviewed_at - created_at))) as avg_review_time_seconds
       FROM manual_reviews
       WHERE 1=1 ${dateFilter}`,
      params
    );

    // Get reviewer performance
    const reviewerPerformance = await pool.query(
      `SELECT
        u.id,
        u.name,
        COUNT(mr.id) as reviews_completed,
        AVG(EXTRACT(EPOCH FROM (mr.reviewed_at - mr.created_at))) as avg_review_time_seconds,
        SUM(CASE WHEN mr.review_decision = 'approved' THEN 1 ELSE 0 END) as approved_count
       FROM users u
       JOIN manual_reviews mr ON u.id = mr.reviewed_by
       WHERE mr.reviewed_at IS NOT NULL ${dateFilter}
       GROUP BY u.id, u.name
       ORDER BY reviews_completed DESC
       LIMIT 10`,
      params
    );

    // Get review reasons
    const reviewReasons = await pool.query(
      `SELECT
        review_reason,
        COUNT(*) as count
       FROM manual_reviews
       WHERE 1=1 ${dateFilter}
       GROUP BY review_reason
       ORDER BY count DESC
       LIMIT 10`,
      params
    );

    // Get SLA compliance
    const slaCompliance = await pool.query(
      `SELECT
        priority,
        COUNT(*) as total,
        SUM(CASE WHEN reviewed_at <= sla_deadline THEN 1 ELSE 0 END) as within_sla,
        AVG(EXTRACT(EPOCH FROM (sla_deadline - reviewed_at))) as avg_sla_margin_seconds
       FROM manual_reviews
       WHERE reviewed_at IS NOT NULL ${dateFilter}
       GROUP BY priority`,
      params
    );

    const stats = reviewStats.rows[0];

    res.json({
      success: true,
      data: {
        summary: {
          total_reviews: parseInt(stats.total_reviews) || 0,
          pending_count: parseInt(stats.pending_count) || 0,
          in_review_count: parseInt(stats.in_review_count) || 0,
          approved_count: parseInt(stats.approved_count) || 0,
          rejected_count: parseInt(stats.rejected_count) || 0,
          urgent_count: parseInt(stats.urgent_count) || 0,
          overdue_count: parseInt(stats.overdue_count) || 0,
          avg_review_time_minutes: stats.avg_review_time_seconds
            ? Math.round(parseFloat(stats.avg_review_time_seconds) / 60)
            : 0,
        },
        reviewer_performance: reviewerPerformance.rows,
        review_reasons: reviewReasons.rows,
        sla_compliance: slaCompliance.rows,
      },
    });
  } catch (error: any) {
    logger.error(`Get manual review analytics error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get connector performance analytics
 * GET /api/analytics/connectors
 */
router.get('/connectors', authenticate, async (req: Request, res: Response) => {
  try {
    const { dateFrom, dateTo } = req.query;

    let dateFilter = '';
    const params: any[] = [];

    if (dateFrom) {
      params.push(dateFrom);
      dateFilter += ` AND cl.created_at >= $${params.length}`;
    }

    if (dateTo) {
      params.push(dateTo);
      dateFilter += ` AND cl.created_at <= $${params.length}`;
    }

    // Get connector stats
    const connectorStats = await pool.query(
      `SELECT
        c.id,
        c.name,
        c.type,
        c.provider,
        COUNT(cl.id) as total_calls,
        SUM(CASE WHEN cl.status = 'success' THEN 1 ELSE 0 END) as success_count,
        SUM(CASE WHEN cl.status = 'error' THEN 1 ELSE 0 END) as error_count,
        AVG(cl.response_time_ms) as avg_response_time,
        MAX(cl.response_time_ms) as max_response_time,
        MIN(cl.response_time_ms) as min_response_time
       FROM connectors c
       LEFT JOIN connector_logs cl ON c.id = cl.connector_id ${dateFilter ? 'AND ' + dateFilter.substring(5) : ''}
       GROUP BY c.id, c.name, c.type, c.provider
       ORDER BY total_calls DESC`,
      params
    );

    // Get error distribution
    const errorDistribution = await pool.query(
      `SELECT
        c.name,
        cl.error_message,
        COUNT(*) as count
       FROM connector_logs cl
       JOIN connectors c ON cl.connector_id = c.id
       WHERE cl.status = 'error' ${dateFilter}
       GROUP BY c.name, cl.error_message
       ORDER BY count DESC
       LIMIT 20`,
      params
    );

    // Get response time trends
    const responseTimeTrends = await pool.query(
      `SELECT
        DATE(cl.created_at) as date,
        c.name,
        AVG(cl.response_time_ms) as avg_response_time
       FROM connector_logs cl
       JOIN connectors c ON cl.connector_id = c.id
       WHERE cl.created_at >= NOW() - INTERVAL '30 days' ${dateFilter}
       GROUP BY DATE(cl.created_at), c.name
       ORDER BY date DESC, c.name
       LIMIT 100`,
      params
    );

    res.json({
      success: true,
      data: {
        connector_stats: connectorStats.rows,
        error_distribution: errorDistribution.rows,
        response_time_trends: responseTimeTrends.rows,
      },
    });
  } catch (error: any) {
    logger.error(`Get connector analytics error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get real-time metrics
 * GET /api/analytics/realtime
 */
router.get('/realtime', authenticate, async (req: Request, res: Response) => {
  try {
    // Applications in last hour
    const lastHourApps = await pool.query(
      `SELECT COUNT(*) as count
       FROM api_requests
       WHERE created_at >= NOW() - INTERVAL '1 hour'`
    );

    // Applications in last 5 minutes
    const last5MinApps = await pool.query(
      `SELECT COUNT(*) as count
       FROM api_requests
       WHERE created_at >= NOW() - INTERVAL '5 minutes'`
    );

    // Active manual reviews
    const activeReviews = await pool.query(
      `SELECT COUNT(*) as count
       FROM manual_reviews
       WHERE status IN ('pending', 'in_review')`
    );

    // Overdue reviews
    const overdueReviews = await pool.query(
      `SELECT COUNT(*) as count
       FROM manual_reviews
       WHERE status IN ('pending', 'in_review') AND sla_deadline < NOW()`
    );

    // System health
    const connectorHealth = await pool.query(
      `SELECT
        c.id,
        c.name,
        c.is_active,
        (SELECT COUNT(*) FROM connector_logs cl
         WHERE cl.connector_id = c.id
         AND cl.created_at >= NOW() - INTERVAL '5 minutes'
         AND cl.status = 'error') as recent_errors
       FROM connectors c
       WHERE c.is_active = true`
    );

    // Recent decisions
    const recentDecisions = await pool.query(
      `SELECT
        decision,
        COUNT(*) as count
       FROM api_requests
       WHERE created_at >= NOW() - INTERVAL '1 hour'
       GROUP BY decision`
    );

    res.json({
      success: true,
      data: {
        applications_last_hour: parseInt(lastHourApps.rows[0].count),
        applications_last_5min: parseInt(last5MinApps.rows[0].count),
        active_reviews: parseInt(activeReviews.rows[0].count),
        overdue_reviews: parseInt(overdueReviews.rows[0].count),
        connector_health: connectorHealth.rows,
        recent_decisions: recentDecisions.rows,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    logger.error(`Get realtime analytics error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Export analytics data
 * GET /api/analytics/export
 */
router.get('/export', authenticate, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { type, dateFrom, dateTo, format = 'json' } = req.query;

    if (!type) {
      return res.status(400).json({ success: false, error: 'Export type is required' });
    }

    let dateFilter = '';
    const params: any[] = [];

    if (dateFrom) {
      params.push(dateFrom);
      dateFilter += ` AND created_at >= $${params.length}`;
    }

    if (dateTo) {
      params.push(dateTo);
      dateFilter += ` AND created_at <= $${params.length}`;
    }

    let data;

    switch (type) {
      case 'applications':
        data = await pool.query(
          `SELECT * FROM api_requests WHERE 1=1 ${dateFilter} ORDER BY created_at DESC`,
          params
        );
        break;

      case 'manual_reviews':
        data = await pool.query(
          `SELECT * FROM manual_reviews WHERE 1=1 ${dateFilter} ORDER BY created_at DESC`,
          params
        );
        break;

      case 'connector_logs':
        data = await pool.query(
          `SELECT * FROM connector_logs WHERE 1=1 ${dateFilter} ORDER BY created_at DESC`,
          params
        );
        break;

      default:
        return res.status(400).json({ success: false, error: 'Invalid export type' });
    }

    if (format === 'csv') {
      // Convert to CSV
      const headers = Object.keys(data.rows[0] || {});
      const csvRows = [headers.join(',')];

      for (const row of data.rows) {
        const values = headers.map(header => {
          const value = row[header];
          return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
        });
        csvRows.push(values.join(','));
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${type}_export_${Date.now()}.csv"`);
      res.send(csvRows.join('\n'));
    } else {
      // JSON format
      res.json({
        success: true,
        data: data.rows,
        exported_at: new Date().toISOString(),
        total_records: data.rows.length,
      });
    }
  } catch (error: any) {
    logger.error(`Export analytics error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
