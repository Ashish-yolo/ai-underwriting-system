import express from 'express';
import { metricsService } from '../services/metrics.service';
import logger from '../utils/logger';

const router = express.Router();

/**
 * POST /api/metrics/test-execution
 * Record a test execution
 */
router.post('/test-execution', async (req, res) => {
  try {
    const { policyId, finalDecision, executionTimeMs } = req.body;

    if (!finalDecision || !['Approved', 'Rejected', 'Manual Review'].includes(finalDecision)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid finalDecision. Must be Approved, Rejected, or Manual Review',
      });
    }

    metricsService.recordTestExecution({
      policyId: policyId || 'unknown',
      finalDecision,
      timestamp: new Date(),
      executionTimeMs: executionTimeMs || 0,
    });

    res.json({
      success: true,
      message: 'Test execution recorded',
    });
  } catch (error: any) {
    logger.error(`Record test execution error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/metrics/realtime
 * Get realtime metrics for dashboard
 */
router.get('/realtime', async (req, res) => {
  try {
    const metrics = metricsService.getRealtimeMetrics();

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error: any) {
    logger.error(`Get realtime metrics error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/metrics/period/:minutes
 * Get statistics for a specific time period
 */
router.get('/period/:minutes', async (req, res) => {
  try {
    const minutes = parseInt(req.params.minutes);

    if (isNaN(minutes) || minutes <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid minutes parameter',
      });
    }

    const stats = metricsService.getStatsByPeriod(minutes);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    logger.error(`Get period metrics error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
