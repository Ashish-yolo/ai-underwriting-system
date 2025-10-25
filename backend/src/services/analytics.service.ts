import { pool } from '../config/database';
import logger from '../utils/logger';

/**
 * Get daily application volume and approval trend
 * Graph 1: Dual-axis Line + Bar Chart
 */
export const getDailyVolumeAndApprovalTrend = async (days: number = 30): Promise<any[]> => {
  try {
    const result = await pool.query(
      `
      SELECT
        DATE(created_at) as date,
        COUNT(*) as total_applications,
        SUM(CASE WHEN decision = 'approved' THEN 1 ELSE 0 END) as approved_count,
        ROUND(
          (SUM(CASE WHEN decision = 'approved' THEN 1 ELSE 0 END)::NUMERIC /
          NULLIF(COUNT(*), 0)) * 100,
          2
        ) as approval_rate
      FROM api_requests
      WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
      `
    );

    return result.rows.map(row => ({
      date: row.date,
      totalApplications: parseInt(row.total_applications),
      approvedCount: parseInt(row.approved_count),
      approvalRate: parseFloat(row.approval_rate) || 0,
    }));
  } catch (error) {
    logger.error(`Get daily volume error: ${error.message}`);
    throw error;
  }
};

/**
 * Get application funnel data
 * Graph 2: Funnel Chart
 */
export const getApplicationFunnel = async (): Promise<any> => {
  try {
    const result = await pool.query(
      `
      SELECT
        COUNT(*) as received,
        SUM(CASE WHEN decision IN ('approved', 'rejected') THEN 1 ELSE 0 END) as auto_decisioned,
        SUM(CASE WHEN decision = 'manual_review' THEN 1 ELSE 0 END) as manual_review,
        SUM(CASE WHEN decision = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN decision = 'rejected' THEN 1 ELSE 0 END) as rejected
      FROM api_requests
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      `
    );

    const row = result.rows[0];

    return [
      { stage: 'Received', value: parseInt(row.received), percentage: 100 },
      {
        stage: 'Auto Decisioned',
        value: parseInt(row.auto_decisioned),
        percentage: Math.round((row.auto_decisioned / row.received) * 100),
      },
      {
        stage: 'Manual Review',
        value: parseInt(row.manual_review),
        percentage: Math.round((row.manual_review / row.received) * 100),
      },
      {
        stage: 'Approved',
        value: parseInt(row.approved),
        percentage: Math.round((row.approved / row.received) * 100),
      },
      {
        stage: 'Rejected',
        value: parseInt(row.rejected),
        percentage: Math.round((row.rejected / row.received) * 100),
      },
    ];
  } catch (error) {
    logger.error(`Get application funnel error: ${error.message}`);
    throw error;
  }
};

/**
 * Get approval rate by credit score band
 * Graph 3: Bar Chart
 */
export const getApprovalRateByCreditScore = async (): Promise<any[]> => {
  try {
    const result = await pool.query(
      `
      SELECT
        CASE
          WHEN (request_data->'applicant'->>'credit_score')::INT < 650 THEN '<650'
          WHEN (request_data->'applicant'->>'credit_score')::INT BETWEEN 650 AND 700 THEN '650-700'
          WHEN (request_data->'applicant'->>'credit_score')::INT BETWEEN 701 AND 750 THEN '701-750'
          WHEN (request_data->'applicant'->>'credit_score')::INT BETWEEN 751 AND 800 THEN '751-800'
          ELSE '>800'
        END as score_band,
        COUNT(*) as total_applications,
        SUM(CASE WHEN decision = 'approved' THEN 1 ELSE 0 END) as approved_count,
        ROUND(
          (SUM(CASE WHEN decision = 'approved' THEN 1 ELSE 0 END)::NUMERIC /
          NULLIF(COUNT(*), 0)) * 100,
          2
        ) as approval_rate
      FROM api_requests
      WHERE
        request_data->'applicant'->>'credit_score' IS NOT NULL
        AND created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY score_band
      ORDER BY
        CASE score_band
          WHEN '<650' THEN 1
          WHEN '650-700' THEN 2
          WHEN '701-750' THEN 3
          WHEN '751-800' THEN 4
          ELSE 5
        END
      `
    );

    return result.rows.map(row => ({
      scoreBand: row.score_band,
      totalApplications: parseInt(row.total_applications),
      approvedCount: parseInt(row.approved_count),
      approvalRate: parseFloat(row.approval_rate) || 0,
    }));
  } catch (error) {
    logger.error(`Get approval rate by credit score error: ${error.message}`);
    throw error;
  }
};

/**
 * Get champion vs challenger strategy performance
 * Graph 4: Comparison Cards
 */
export const getStrategyPerformance = async (): Promise<any> => {
  try {
    // Get all active policies
    const policiesResult = await pool.query(
      `
      SELECT id, name, status
      FROM policies
      WHERE status = 'active'
      ORDER BY created_at DESC
      LIMIT 2
      `
    );

    if (policiesResult.rows.length < 2) {
      // Return default structure if we don't have 2 policies
      return {
        champion: null,
        challenger: null,
      };
    }

    const champion = policiesResult.rows[0];
    const challenger = policiesResult.rows[1];

    // Get stats for champion
    const championStats = await pool.query(
      `
      SELECT
        COUNT(*) as applications_processed,
        ROUND(
          (SUM(CASE WHEN decision = 'approved' THEN 1 ELSE 0 END)::NUMERIC /
          NULLIF(COUNT(*), 0)) * 100,
          2
        ) as approval_rate,
        ROUND(AVG((request_data->'applicant'->>'credit_score')::INT)) as avg_credit_score,
        ROUND(AVG(execution_time_ms)) as avg_tat_ms
      FROM api_requests
      WHERE
        policy_id = $1
        AND created_at >= CURRENT_DATE - INTERVAL '30 days'
        AND decision = 'approved'
      `,
      [champion.id]
    );

    // Get stats for challenger
    const challengerStats = await pool.query(
      `
      SELECT
        COUNT(*) as applications_processed,
        ROUND(
          (SUM(CASE WHEN decision = 'approved' THEN 1 ELSE 0 END)::NUMERIC /
          NULLIF(COUNT(*), 0)) * 100,
          2
        ) as approval_rate,
        ROUND(AVG((request_data->'applicant'->>'credit_score')::INT)) as avg_credit_score,
        ROUND(AVG(execution_time_ms)) as avg_tat_ms
      FROM api_requests
      WHERE
        policy_id = $1
        AND created_at >= CURRENT_DATE - INTERVAL '30 days'
        AND decision = 'approved'
      `,
      [challenger.id]
    );

    return {
      champion: {
        name: champion.name,
        applicationsProcessed: parseInt(championStats.rows[0]?.applications_processed) || 0,
        approvalRate: parseFloat(championStats.rows[0]?.approval_rate) || 0,
        avgCreditScore: parseInt(championStats.rows[0]?.avg_credit_score) || 0,
        avgTatMs: parseInt(championStats.rows[0]?.avg_tat_ms) || 0,
      },
      challenger: {
        name: challenger.name,
        applicationsProcessed: parseInt(challengerStats.rows[0]?.applications_processed) || 0,
        approvalRate: parseFloat(challengerStats.rows[0]?.approval_rate) || 0,
        avgCreditScore: parseInt(challengerStats.rows[0]?.avg_credit_score) || 0,
        avgTatMs: parseInt(challengerStats.rows[0]?.avg_tat_ms) || 0,
      },
    };
  } catch (error) {
    logger.error(`Get strategy performance error: ${error.message}`);
    throw error;
  }
};

/**
 * Get manual vs auto decision split
 * Graph 5: Stacked Bar / Pie Chart
 */
export const getDecisionSplit = async (): Promise<any> => {
  try {
    const result = await pool.query(
      `
      SELECT
        decision,
        COUNT(*) as count,
        ROUND(
          (COUNT(*)::NUMERIC / (SELECT COUNT(*) FROM api_requests WHERE created_at >= CURRENT_DATE - INTERVAL '30 days')) * 100,
          2
        ) as percentage
      FROM api_requests
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY decision
      `
    );

    const decisions = {
      auto_approve: 0,
      auto_reject: 0,
      manual_approve: 0,
      manual_reject: 0,
    };

    // Get manual review decisions
    const manualResult = await pool.query(
      `
      SELECT
        final_decision,
        COUNT(*) as count
      FROM manual_reviews
      WHERE
        status IN ('approved', 'rejected')
        AND reviewed_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY final_decision
      `
    );

    // Process auto decisions
    result.rows.forEach(row => {
      if (row.decision === 'approved') {
        decisions.auto_approve = parseInt(row.count);
      } else if (row.decision === 'rejected') {
        decisions.auto_reject = parseInt(row.count);
      }
    });

    // Process manual decisions
    manualResult.rows.forEach(row => {
      if (row.final_decision === 'approved') {
        decisions.manual_approve = parseInt(row.count);
      } else if (row.final_decision === 'rejected') {
        decisions.manual_reject = parseInt(row.count);
      }
    });

    const total = Object.values(decisions).reduce((a, b) => a + b, 0);

    return [
      {
        name: 'Auto Approve',
        value: decisions.auto_approve,
        percentage: total > 0 ? Math.round((decisions.auto_approve / total) * 100) : 0,
      },
      {
        name: 'Auto Reject',
        value: decisions.auto_reject,
        percentage: total > 0 ? Math.round((decisions.auto_reject / total) * 100) : 0,
      },
      {
        name: 'Manual Approve',
        value: decisions.manual_approve,
        percentage: total > 0 ? Math.round((decisions.manual_approve / total) * 100) : 0,
      },
      {
        name: 'Manual Reject',
        value: decisions.manual_reject,
        percentage: total > 0 ? Math.round((decisions.manual_reject / total) * 100) : 0,
      },
    ];
  } catch (error) {
    logger.error(`Get decision split error: ${error.message}`);
    throw error;
  }
};

/**
 * Get all analytics data at once
 */
export const getAllAnalytics = async (): Promise<any> => {
  try {
    const [
      dailyTrend,
      funnel,
      creditScoreBands,
      strategyPerformance,
      decisionSplit,
    ] = await Promise.all([
      getDailyVolumeAndApprovalTrend(30),
      getApplicationFunnel(),
      getApprovalRateByCreditScore(),
      getStrategyPerformance(),
      getDecisionSplit(),
    ]);

    return {
      dailyTrend,
      funnel,
      creditScoreBands,
      strategyPerformance,
      decisionSplit,
    };
  } catch (error) {
    logger.error(`Get all analytics error: ${error.message}`);
    throw error;
  }
};
