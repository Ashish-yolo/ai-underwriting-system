import { pool } from '../config/database';
import logger from '../utils/logger';

/**
 * Data types supported for connector variables
 */
export type VariableDataType = 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object' | 'null';

/**
 * Discovered variable from connector response
 */
export interface DiscoveredVariable {
  variableName: string;
  variablePath: string;
  dataType: VariableDataType;
  isArray: boolean;
  sampleValue: string;
  displayName?: string;
  description?: string;
}

/**
 * Convert JSON key to PascalCase for variable naming
 * Example: total_accounts -> TotalAccounts, credit-score -> CreditScore
 */
function toPascalCase(str: string): string {
  return str
    .replace(/[_-](\w)/g, (_, char) => char.toUpperCase())
    .replace(/^(\w)/, (_, char) => char.toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, '');
}

/**
 * Infer data type from value
 */
function inferDataType(value: any): VariableDataType {
  if (value === null || value === undefined) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'object') return 'object';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'string') {
    // Check if it's a date string
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return 'date';
    return 'string';
  }
  return 'string';
}

/**
 * Recursively parse JSON object and discover all variables
 */
function parseJsonStructure(
  obj: any,
  pathPrefix: string = '',
  namePrefix: string = '',
  variables: DiscoveredVariable[] = [],
  maxDepth: number = 5,
  currentDepth: number = 0
): DiscoveredVariable[] {
  if (currentDepth >= maxDepth) return variables;
  if (obj === null || obj === undefined) return variables;

  // Handle arrays - for now, we'll analyze the first element
  if (Array.isArray(obj)) {
    const arrayPath = pathPrefix;
    const arrayName = namePrefix;

    // Add the array itself as a variable
    variables.push({
      variableName: arrayName,
      variablePath: arrayPath,
      dataType: 'array',
      isArray: true,
      sampleValue: JSON.stringify(obj.length > 0 ? obj[0] : []),
      displayName: arrayName,
    });

    // Parse first element to discover array item structure
    if (obj.length > 0 && typeof obj[0] === 'object' && !Array.isArray(obj[0])) {
      const itemPrefix = `${pathPrefix}[0]`;
      parseJsonStructure(obj[0], itemPrefix, `${namePrefix}Item`, variables, maxDepth, currentDepth + 1);
    }

    return variables;
  }

  // Handle objects
  if (typeof obj === 'object') {
    for (const key in obj) {
      if (!obj.hasOwnProperty(key)) continue;

      const value = obj[key];
      const newPath = pathPrefix ? `${pathPrefix}.${key}` : key;
      const newName = namePrefix ? `${namePrefix}${toPascalCase(key)}` : toPascalCase(key);
      const dataType = inferDataType(value);

      // Skip nested objects and arrays - add them but don't add as individual variables
      if (dataType === 'object' || dataType === 'array') {
        parseJsonStructure(value, newPath, newName, variables, maxDepth, currentDepth + 1);
      } else {
        // Add primitive value as a variable
        variables.push({
          variableName: newName,
          variablePath: newPath,
          dataType,
          isArray: false,
          sampleValue: String(value),
          displayName: newName,
        });
      }
    }
  }

  return variables;
}

/**
 * Parse connector response and discover all available variables
 */
export async function parseConnectorResponse(
  connectorId: string,
  response: any
): Promise<DiscoveredVariable[]> {
  try {
    logger.info(`Parsing connector response for connector: ${connectorId}`);

    const variables = parseJsonStructure(response);

    logger.info(`Discovered ${variables.length} variables from connector response`);

    return variables;
  } catch (error) {
    logger.error(`Error parsing connector response: ${error.message}`);
    throw error;
  }
}

/**
 * Register discovered variables in the database
 */
export async function registerVariables(
  connectorId: string,
  variables: DiscoveredVariable[]
): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const now = new Date();

    for (const variable of variables) {
      // Upsert variable (insert or update if exists)
      await client.query(
        `INSERT INTO connector_variables (
          connector_id, variable_name, variable_path, data_type,
          display_name, is_array, sample_value, discovered_at, last_seen_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (connector_id, variable_name)
        DO UPDATE SET
          variable_path = EXCLUDED.variable_path,
          data_type = EXCLUDED.data_type,
          sample_value = EXCLUDED.sample_value,
          last_seen_at = EXCLUDED.last_seen_at,
          updated_at = EXCLUDED.updated_at
        `,
        [
          connectorId,
          variable.variableName,
          variable.variablePath,
          variable.dataType,
          variable.displayName || variable.variableName,
          variable.isArray,
          variable.sampleValue,
          now,
          now,
          now,
        ]
      );
    }

    await client.query('COMMIT');

    logger.info(`Registered ${variables.length} variables for connector ${connectorId}`);
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error(`Error registering variables: ${error.message}`);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get variable value from JSON response using variable path
 */
export function getVariableValue(response: any, variablePath: string): any {
  try {
    const parts = variablePath.split('.');
    let value = response;

    for (const part of parts) {
      // Handle array index notation like [0]
      const arrayMatch = part.match(/^(.+)\[(\d+)\]$/);
      if (arrayMatch) {
        const arrayName = arrayMatch[1];
        const index = parseInt(arrayMatch[2]);
        value = value[arrayName]?.[index];
      } else {
        value = value?.[part];
      }

      if (value === undefined) return null;
    }

    return value;
  } catch (error) {
    logger.error(`Error getting variable value for path ${variablePath}: ${error.message}`);
    return null;
  }
}

/**
 * Store flattened connector data for an application
 */
export async function storeApplicationConnectorData(
  applicationId: string,
  connectorId: string,
  executionId: string,
  response: any
): Promise<void> {
  try {
    // Get all registered variables for this connector
    const variablesResult = await pool.query(
      'SELECT variable_name, variable_path FROM connector_variables WHERE connector_id = $1 AND is_hidden = false',
      [connectorId]
    );

    // Build flattened data object
    const flattenedData: Record<string, any> = {};

    for (const row of variablesResult.rows) {
      const value = getVariableValue(response, row.variable_path);
      flattenedData[row.variable_name] = value;
    }

    // Store in application_connector_data table
    await pool.query(
      `INSERT INTO application_connector_data (application_id, connector_id, execution_id, data)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (application_id, connector_id)
       DO UPDATE SET
         execution_id = EXCLUDED.execution_id,
         data = EXCLUDED.data,
         updated_at = NOW()
      `,
      [applicationId, connectorId, executionId, JSON.stringify(flattenedData)]
    );

    logger.info(`Stored connector data for application ${applicationId}, connector ${connectorId}`);
  } catch (error) {
    logger.error(`Error storing application connector data: ${error.message}`);
    throw error;
  }
}
