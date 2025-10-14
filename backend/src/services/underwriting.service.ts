import { pool } from '../config/database';
import logger from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { getPolicyById } from './policy.service';
import { executeWorkflow } from '../engine/workflow-executor';
import axios from 'axios';
import { config } from '../config/env';
import { generateHMACSignature } from '../utils/encryption';

export interface UnderwritingRequest {
  application_id: string;
  applicant: Record<string, any>;
  metadata?: Record<string, any>;
  async?: boolean;
  callback_url?: string;
}

export interface UnderwritingResponse {
  success: boolean;
  application_id: string;
  underwriting_id: string;
  decision: 'approved' | 'rejected' | 'manual_review';
  reason: string;
  details: Record<string, any>;
  timestamp: string;
  execution_time_ms: number;
}

/**
 * Main underwriting function
 */
export const processUnderwriting = async (
  policyId: string,
  request: UnderwritingRequest,
  apiKeyId?: string
): Promise<UnderwritingResponse> => {
  const startTime = Date.now();

  try {
    // Get policy
    const policy = await getPolicyById(policyId);

    if (!policy) {
      throw new Error('Policy not found');
    }

    if (policy.status !== 'active') {
      throw new Error('Policy is not active');
    }

    // Execute workflow
    const result = await executeWorkflow(
      policy.workflow_json,
      request.applicant,
      policyId,
      request.application_id
    );

    const executionTime = Date.now() - startTime;

    // Log API request
    await logAPIRequest(
      apiKeyId,
      policyId,
      request.application_id,
      request,
      result,
      result.decision,
      executionTime
    );

    // Handle based on decision
    if (result.decision === 'manual_review') {
      // Add to manual review queue
      await addToManualReviewQueue(
        request.application_id,
        result.underwriting_id,
        policyId,
        request.applicant,
        result,
        result.reason
      );
    }

    // Send webhook if callback URL provided
    if (request.callback_url) {
      await sendWebhook(request.callback_url, {
        underwriting_id: result.underwriting_id,
        application_id: request.application_id,
        decision: result.decision,
        reason: result.reason,
        details: result.details,
        timestamp: new Date().toISOString(),
      });
    }

    // Return response
    return {
      success: true,
      application_id: request.application_id,
      underwriting_id: result.underwriting_id,
      decision: result.decision,
      reason: result.reason,
      details: result.details,
      timestamp: new Date().toISOString(),
      execution_time_ms: executionTime,
    };

  } catch (error) {
    const executionTime = Date.now() - startTime;

    logger.error(`Underwriting error: ${error.message}`);

    // Log failed request
    await logAPIRequest(
      apiKeyId,
      policyId,
      request.application_id,
      request,
      { error: error.message },
      'error',
      executionTime
    );

    // Return as manual review on error
    const underwritingId = uuidv4();

    await addToManualReviewQueue(
      request.application_id,
      underwritingId,
      policyId,
      request.applicant,
      { error: error.message },
      `System error: ${error.message}`
    );

    return {
      success: false,
      application_id: request.application_id,
      underwriting_id: underwritingId,
      decision: 'manual_review',
      reason: `System error occurred. Application sent for manual review.`,
      details: { error: error.message },
      timestamp: new Date().toISOString(),
      execution_time_ms: executionTime,
    };
  }
};

/**
 * Log API request
 */
const logAPIRequest = async (
  apiKeyId: string | undefined,
  policyId: string,
  applicationId: string,
  requestData: any,
  responseData: any,
  decision: string,
  executionTimeMs: number
): Promise<void> => {
  try {
    await pool.query(
      `INSERT INTO api_requests (api_key_id, policy_id, application_id, request_data, response_data, decision, execution_time_ms)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        apiKeyId || null,
        policyId,
        applicationId,
        JSON.stringify(requestData),
        JSON.stringify(responseData),
        decision,
        executionTimeMs,
      ]
    );
  } catch (error) {
    logger.error(`Log API request error: ${error.message}`);
  }
};

/**
 * Add application to manual review queue
 */
const addToManualReviewQueue = async (
  applicationId: string,
  underwritingId: string,
  policyId: string,
  applicantData: any,
  executionContext: any,
  reviewReason: string
): Promise<void> => {
  try {
    // Calculate priority
    const priority = calculatePriority(applicantData, reviewReason);

    // Calculate SLA deadline
    const slaDeadline = calculateSLADeadline(priority);

    await pool.query(
      `INSERT INTO manual_reviews (application_id, underwriting_id, policy_id, applicant_data, execution_context, review_reason, priority, sla_deadline)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (application_id) DO UPDATE SET
         underwriting_id = EXCLUDED.underwriting_id,
         execution_context = EXCLUDED.execution_context,
         review_reason = EXCLUDED.review_reason,
         priority = EXCLUDED.priority`,
      [
        applicationId,
        underwritingId,
        policyId,
        JSON.stringify(applicantData),
        JSON.stringify(executionContext),
        reviewReason,
        priority,
        slaDeadline,
      ]
    );

    logger.info(`Added to manual review queue: ${applicationId}`);
  } catch (error) {
    logger.error(`Add to manual review error: ${error.message}`);
  }
};

/**
 * Calculate review priority
 */
const calculatePriority = (applicantData: any, reviewReason: string): string => {
  // High loan amount = higher priority
  const loanAmount = applicantData.requested_loan_amount || 0;

  if (loanAmount > 1000000) {
    return 'high';
  }

  // Urgent if borderline or close to threshold
  if (reviewReason.includes('borderline') || reviewReason.includes('close to threshold')) {
    return 'urgent';
  }

  // High if discrepancy
  if (reviewReason.includes('discrepancy') || reviewReason.includes('mismatch')) {
    return 'high';
  }

  return 'medium';
};

/**
 * Calculate SLA deadline based on priority
 */
const calculateSLADeadline = (priority: string): Date => {
  const now = new Date();
  const slaHours = {
    urgent: 2,
    high: 4,
    medium: 24,
    low: 48,
  };

  const hours = slaHours[priority as keyof typeof slaHours] || 24;
  now.setHours(now.getHours() + hours);

  return now;
};

/**
 * Send webhook to LOS
 */
const sendWebhook = async (url: string, payload: any): Promise<void> => {
  try {
    // Generate signature
    const signature = generateHMACSignature(payload);

    await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Source': 'underwriting-system',
      },
      timeout: 10000,
    });

    logger.info(`Webhook sent successfully to ${url}`);

    // Log webhook delivery
    await pool.query(
      `INSERT INTO webhook_deliveries (webhook_id, application_id, payload, response_code, status, delivered_at)
       VALUES (NULL, $1, $2, 200, 'success', NOW())`,
      [payload.application_id, JSON.stringify(payload)]
    );

  } catch (error) {
    logger.error(`Webhook delivery failed: ${error.message}`);

    // Log failed delivery
    await pool.query(
      `INSERT INTO webhook_deliveries (webhook_id, application_id, payload, status, attempt)
       VALUES (NULL, $1, $2, 'failed', 1)`,
      [payload.application_id, JSON.stringify(payload)]
    );

    // Queue for retry
    // (In production, use Bull queue for retry with exponential backoff)
  }
};

/**
 * Get underwriting status
 */
export const getUnderwritingStatus = async (underwritingId: string): Promise<any> => {
  try {
    // Check API requests
    const apiResult = await pool.query(
      `SELECT application_id, decision, created_at
       FROM api_requests
       WHERE id = $1`,
      [underwritingId]
    );

    if (apiResult.rows.length > 0) {
      const request = apiResult.rows[0];
      return {
        underwriting_id: underwritingId,
        application_id: request.application_id,
        status: 'completed',
        decision: request.decision,
        created_at: request.created_at,
      };
    }

    // Check manual review queue
    const reviewResult = await pool.query(
      `SELECT application_id, status, priority
       FROM manual_reviews
       WHERE underwriting_id = $1`,
      [underwritingId]
    );

    if (reviewResult.rows.length > 0) {
      const review = reviewResult.rows[0];
      return {
        underwriting_id: underwritingId,
        application_id: review.application_id,
        status: review.status,
        decision: review.status === 'approved' ? 'approved' : review.status === 'rejected' ? 'rejected' : 'manual_review',
        priority: review.priority,
      };
    }

    return null;
  } catch (error) {
    logger.error(`Get underwriting status error: ${error.message}`);
    throw error;
  }
};

/**
 * Get underwriting analytics
 */
export const getUnderwritingAnalytics = async (
  policyId?: string,
  dateFrom?: Date,
  dateTo?: Date
): Promise<any> => {
  try {
    let query = `
      SELECT
        COUNT(*) as total_applications,
        SUM(CASE WHEN decision = 'approved' THEN 1 ELSE 0 END) as approved_count,
        SUM(CASE WHEN decision = 'rejected' THEN 1 ELSE 0 END) as rejected_count,
        SUM(CASE WHEN decision = 'manual_review' THEN 1 ELSE 0 END) as manual_review_count,
        AVG(execution_time_ms) as avg_execution_time_ms
      FROM api_requests
      WHERE 1=1
    `;

    const params: any[] = [];

    if (policyId) {
      params.push(policyId);
      query += ` AND policy_id = $${params.length}`;
    }

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

    return {
      total_applications: parseInt(stats.total_applications),
      approved_count: parseInt(stats.approved_count),
      rejected_count: parseInt(stats.rejected_count),
      manual_review_count: parseInt(stats.manual_review_count),
      approval_rate: stats.total_applications > 0
        ? ((stats.approved_count / stats.total_applications) * 100).toFixed(2)
        : 0,
      avg_execution_time_ms: Math.round(parseFloat(stats.avg_execution_time_ms) || 0),
    };
  } catch (error) {
    logger.error(`Get underwriting analytics error: ${error.message}`);
    throw error;
  }
};
