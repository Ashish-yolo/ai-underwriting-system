import { Router, Request, Response } from 'express';
import { processUnderwriting, getUnderwritingStatus, getUnderwritingAnalytics } from '../../services/underwriting.service';
import logger from '../../utils/logger';
import { pool } from '../../config/database';
import { hashApiKey } from '../../utils/encryption';

const router = Router();

/**
 * Middleware to verify API key for underwriting requests
 */
const verifyAPIKey = async (req: Request, res: Response, next: Function) => {
  try {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'API key is required',
        },
      });
      return;
    }

    // Hash and verify API key
    const keyHash = hashApiKey(apiKey);

    const result = await pool.query(
      `SELECT id, policy_id, is_active, rate_limit, expires_at
       FROM api_keys
       WHERE key_hash = $1`,
      [keyHash]
    );

    if (result.rows.length === 0) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid API key',
        },
      });
      return;
    }

    const apiKeyData = result.rows[0];

    // Check if active
    if (!apiKeyData.is_active) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'API key is inactive',
        },
      });
      return;
    }

    // Check expiration
    if (apiKeyData.expires_at && new Date(apiKeyData.expires_at) < new Date()) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'API key has expired',
        },
      });
      return;
    }

    // Update last used
    await pool.query(
      'UPDATE api_keys SET last_used_at = NOW() WHERE id = $1',
      [apiKeyData.id]
    );

    // Attach to request
    (req as any).apiKeyId = apiKeyData.id;
    (req as any).policyId = apiKeyData.policy_id;

    next();
  } catch (error) {
    logger.error(`API key verification error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Authentication error',
      },
    });
  }
};

/**
 * @swagger
 * /api/v1/underwrite/{policy_id}:
 *   post:
 *     summary: Submit application for underwriting
 *     description: Process a loan application through the underwriting workflow
 *     tags: [Underwriting]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: policy_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Policy ID to use for underwriting
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - application_id
 *               - applicant
 *             properties:
 *               application_id:
 *                 type: string
 *               applicant:
 *                 type: object
 *               metadata:
 *                 type: object
 *               async:
 *                 type: boolean
 *               callback_url:
 *                 type: string
 *     responses:
 *       200:
 *         description: Underwriting decision returned
 *       401:
 *         description: Invalid API key
 *       400:
 *         description: Validation error
 */
router.post('/:policy_id', verifyAPIKey, async (req: Request, res: Response) => {
  try {
    const { policy_id } = req.params;
    const requestData = req.body;

    // Validation
    if (!requestData.application_id || !requestData.applicant) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'application_id and applicant data are required',
        },
      });
      return;
    }

    // Process underwriting
    const result = await processUnderwriting(
      policy_id,
      requestData,
      (req as any).apiKeyId
    );

    res.json(result);

  } catch (error) {
    logger.error(`Underwriting request error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: {
        code: 'UNDERWRITING_ERROR',
        message: error.message,
      },
    });
  }
});

/**
 * @swagger
 * /api/v1/underwrite/status/{underwriting_id}:
 *   get:
 *     summary: Get underwriting status
 *     description: Check the status of an underwriting request
 *     tags: [Underwriting]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: underwriting_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Underwriting status
 *       404:
 *         description: Underwriting request not found
 */
router.get('/status/:underwriting_id', verifyAPIKey, async (req: Request, res: Response) => {
  try {
    const { underwriting_id } = req.params;

    const status = await getUnderwritingStatus(underwriting_id);

    if (!status) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Underwriting request not found',
        },
      });
      return;
    }

    res.json({
      success: true,
      data: status,
    });

  } catch (error) {
    logger.error(`Get status error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: {
        code: 'STATUS_ERROR',
        message: error.message,
      },
    });
  }
});

/**
 * @swagger
 * /api/v1/underwrite/analytics:
 *   get:
 *     summary: Get underwriting analytics
 *     description: Get analytics and metrics for underwriting decisions
 *     tags: [Underwriting]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Analytics data
 */
router.get('/analytics', verifyAPIKey, async (req: Request, res: Response) => {
  try {
    const { date_from, date_to } = req.query;

    const dateFrom = date_from ? new Date(date_from as string) : undefined;
    const dateTo = date_to ? new Date(date_to as string) : undefined;

    const analytics = await getUnderwritingAnalytics(
      (req as any).policyId,
      dateFrom,
      dateTo
    );

    res.json({
      success: true,
      data: analytics,
    });

  } catch (error) {
    logger.error(`Get analytics error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: {
        code: 'ANALYTICS_ERROR',
        message: error.message,
      },
    });
  }
});

export default router;
