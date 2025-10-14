import { Router, Request, Response } from 'express';
import {
  createConnector,
  getConnectorById,
  getAllConnectors,
  updateConnector,
  deleteConnector,
  testConnector,
  getConnectorLogs,
  getConnectorHealth,
} from '../../services/connector.service';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import logger from '../../utils/logger';

const router = Router();

// All connector routes require authentication
router.use(authenticate);

/**
 * Create new connector
 */
router.post('/', requireRole(['admin', 'policy_creator']), async (req: Request, res: Response) => {
  try {
    const { name, type, provider, config } = req.body;

    if (!name || !type || !config) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Name, type, and config are required',
        },
      });
      return;
    }

    const connector = await createConnector(name, type, provider, config, req.user!.id);

    res.status(201).json({
      success: true,
      data: { connector },
    });
  } catch (error) {
    logger.error(`Create connector error: ${error.message}`);
    res.status(400).json({
      success: false,
      error: {
        code: 'CREATE_CONNECTOR_ERROR',
        message: error.message,
      },
    });
  }
});

/**
 * Get all connectors
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { type, is_active } = req.query;

    const filters: any = {};
    if (type) filters.type = type;
    if (is_active !== undefined) filters.is_active = is_active === 'true';

    const connectors = await getAllConnectors(filters);

    res.json({
      success: true,
      data: { connectors },
    });
  } catch (error) {
    logger.error(`Get connectors error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_CONNECTORS_ERROR',
        message: error.message,
      },
    });
  }
});

/**
 * Get connector by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const connector = await getConnectorById(id);

    if (!connector) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Connector not found',
        },
      });
      return;
    }

    res.json({
      success: true,
      data: { connector },
    });
  } catch (error) {
    logger.error(`Get connector error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_CONNECTOR_ERROR',
        message: error.message,
      },
    });
  }
});

/**
 * Update connector
 */
router.put('/:id', requireRole(['admin', 'policy_creator']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    await updateConnector(id, updates);

    res.json({
      success: true,
      message: 'Connector updated successfully',
    });
  } catch (error) {
    logger.error(`Update connector error: ${error.message}`);
    res.status(400).json({
      success: false,
      error: {
        code: 'UPDATE_CONNECTOR_ERROR',
        message: error.message,
      },
    });
  }
});

/**
 * Delete connector
 */
router.delete('/:id', requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await deleteConnector(id);

    res.json({
      success: true,
      message: 'Connector deleted successfully',
    });
  } catch (error) {
    logger.error(`Delete connector error: ${error.message}`);
    res.status(400).json({
      success: false,
      error: {
        code: 'DELETE_CONNECTOR_ERROR',
        message: error.message,
      },
    });
  }
});

/**
 * Test connector
 */
router.post('/:id/test', requireRole(['admin', 'policy_creator']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await testConnector(id);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error(`Test connector error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: {
        code: 'TEST_CONNECTOR_ERROR',
        message: error.message,
      },
    });
  }
});

/**
 * Get connector logs
 */
router.get('/:id/logs', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;

    const logs = await getConnectorLogs(id, limit);

    res.json({
      success: true,
      data: { logs },
    });
  } catch (error) {
    logger.error(`Get connector logs error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_LOGS_ERROR',
        message: error.message,
      },
    });
  }
});

/**
 * Get connector health metrics
 */
router.get('/:id/health', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const health = await getConnectorHealth(id);

    res.json({
      success: true,
      data: health,
    });
  } catch (error) {
    logger.error(`Get connector health error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_HEALTH_ERROR',
        message: error.message,
      },
    });
  }
});

export default router;
