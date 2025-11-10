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
import {
  executeConnector,
  storeManualSample,
  getExecutionHistory,
  getApplicationConnectorData,
} from '../../services/connector-execution.service';
import {
  getConnectorVariables,
  getAllAvailableVariables,
  updateVariableMetadata,
  refreshVariableRegistry,
} from '../../services/variable-registry.service';
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

/**
 * Execute connector
 */
router.post('/:id/execute', requireRole(['admin', 'policy_creator']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { applicationId, requestPayload, executionType = 'live' } = req.body;

    if (!requestPayload) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'requestPayload is required',
        },
      });
      return;
    }

    const result = await executeConnector(id, applicationId, requestPayload, executionType);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error(`Execute connector error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: {
        code: 'EXECUTE_CONNECTOR_ERROR',
        message: error.message,
      },
    });
  }
});

/**
 * Store manual sample response
 */
router.post('/:id/sample', requireRole(['admin', 'policy_creator']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { requestPayload, responsePayload } = req.body;

    if (!requestPayload || !responsePayload) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Both requestPayload and responsePayload are required',
        },
      });
      return;
    }

    const result = await storeManualSample(id, requestPayload, responsePayload);

    res.json({
      success: true,
      data: result,
      message: `Discovered ${result.variablesDiscovered} variables from sample`,
    });
  } catch (error) {
    logger.error(`Store manual sample error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: {
        code: 'STORE_SAMPLE_ERROR',
        message: error.message,
      },
    });
  }
});

/**
 * Get connector variables
 */
router.get('/:id/variables', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const includeHidden = req.query.includeHidden === 'true';

    const variables = await getConnectorVariables(id, includeHidden);

    res.json({
      success: true,
      data: { variables },
    });
  } catch (error) {
    logger.error(`Get connector variables error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_VARIABLES_ERROR',
        message: error.message,
      },
    });
  }
});

/**
 * Refresh variable registry from latest execution
 */
router.post('/:id/variables/refresh', requireRole(['admin', 'policy_creator']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await refreshVariableRegistry(id);

    res.json({
      success: true,
      data: result,
      message: `Refreshed: ${result.discovered} new, ${result.updated} updated`,
    });
  } catch (error) {
    logger.error(`Refresh variable registry error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: {
        code: 'REFRESH_VARIABLES_ERROR',
        message: error.message,
      },
    });
  }
});

/**
 * Get connector execution history
 */
router.get('/:id/executions', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

    const executions = await getExecutionHistory(id, limit);

    res.json({
      success: true,
      data: { executions },
    });
  } catch (error) {
    logger.error(`Get execution history error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_EXECUTIONS_ERROR',
        message: error.message,
      },
    });
  }
});

/**
 * Update variable metadata
 */
router.patch('/variables/:variableId', requireRole(['admin', 'policy_creator']), async (req: Request, res: Response) => {
  try {
    const { variableId } = req.params;
    const { displayName, description, isHidden } = req.body;

    await updateVariableMetadata(variableId, { displayName, description, isHidden });

    res.json({
      success: true,
      message: 'Variable metadata updated successfully',
    });
  } catch (error) {
    logger.error(`Update variable metadata error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_VARIABLE_ERROR',
        message: error.message,
      },
    });
  }
});

export default router;
