import { pool } from '../config/database';
import logger from '../utils/logger';

export interface TransformationRule {
  id: string;
  name: string;
  description?: string;
  transformationType: 'request' | 'response';
  rules: {
    mappings?: FieldMapping[];
    filters?: string[];
    validators?: ValidationRule[];
  };
  executionOrder: number;
  isActive: boolean;
}

export interface FieldMapping {
  source: string; // JSONPath or XPath
  target: string;
  transform?: TransformFunction;
  defaultValue?: any;
  required?: boolean;
}

export type TransformFunction =
  | 'uppercase'
  | 'lowercase'
  | 'trim'
  | 'parseInt'
  | 'parseFloat'
  | 'toBoolean'
  | 'toDate'
  | 'formatDate'
  | 'formatCurrency'
  | 'mask'
  | 'hash'
  | 'encrypt'
  | 'decrypt';

export interface ValidationRule {
  field: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'email' | 'phone' | 'custom';
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: string;
  customValidator?: string; // Function name
}

/**
 * Data Transformation Service
 * Handles data mapping, transformation, and validation
 */
export class TransformationService {
  /**
   * Create transformation rule
   */
  static async createRule(
    connectorId: string,
    rule: Omit<TransformationRule, 'id'>
  ): Promise<string> {
    try {
      const result = await pool.query(
        `INSERT INTO connector_transformations
         (connector_id, name, description, transformation_type, rules, execution_order, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [
          connectorId,
          rule.name,
          rule.description || null,
          rule.transformationType,
          JSON.stringify(rule.rules),
          rule.executionOrder || 1,
          rule.isActive !== false,
        ]
      );

      const ruleId = result.rows[0].id;
      logger.info(`Transformation rule created: ${rule.name} for connector ${connectorId}`);

      return ruleId;
    } catch (error) {
      logger.error(`Create transformation rule error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get transformation rules for a connector
   */
  static async getRules(
    connectorId: string,
    type?: 'request' | 'response'
  ): Promise<TransformationRule[]> {
    try {
      let query = `
        SELECT id, name, description, transformation_type, rules, execution_order, is_active
        FROM connector_transformations
        WHERE connector_id = $1 AND is_active = true
      `;

      const params: any[] = [connectorId];

      if (type) {
        params.push(type);
        query += ` AND transformation_type = $${params.length}`;
      }

      query += ' ORDER BY execution_order ASC';

      const result = await pool.query(query, params);

      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        transformationType: row.transformation_type,
        rules: row.rules,
        executionOrder: row.execution_order,
        isActive: row.is_active,
      }));
    } catch (error) {
      logger.error(`Get transformation rules error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Apply transformations to request data
   */
  static async transformRequest(connectorId: string, data: any): Promise<any> {
    try {
      const rules = await this.getRules(connectorId, 'request');

      let transformed = data;

      for (const rule of rules) {
        transformed = await this.applyTransformation(transformed, rule);
      }

      logger.debug(`Request transformation applied for connector: ${connectorId}`);
      return transformed;
    } catch (error) {
      logger.error(`Transform request error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Apply transformations to response data
   */
  static async transformResponse(connectorId: string, data: any): Promise<any> {
    try {
      const rules = await this.getRules(connectorId, 'response');

      let transformed = data;

      for (const rule of rules) {
        transformed = await this.applyTransformation(transformed, rule);
      }

      logger.debug(`Response transformation applied for connector: ${connectorId}`);
      return transformed;
    } catch (error) {
      logger.error(`Transform response error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Apply a single transformation rule
   */
  private static async applyTransformation(
    data: any,
    rule: TransformationRule
  ): Promise<any> {
    let result = { ...data };

    // Apply field mappings
    if (rule.rules.mappings) {
      for (const mapping of rule.rules.mappings) {
        const value = this.getValueByPath(data, mapping.source);

        if (value !== undefined) {
          let transformedValue = value;

          // Apply transformation function
          if (mapping.transform) {
            transformedValue = this.applyTransformFunction(value, mapping.transform);
          }

          this.setValueByPath(result, mapping.target, transformedValue);
        } else if (mapping.defaultValue !== undefined) {
          this.setValueByPath(result, mapping.target, mapping.defaultValue);
        } else if (mapping.required) {
          throw new Error(`Required field missing: ${mapping.source}`);
        }
      }
    }

    // Apply filters
    if (rule.rules.filters) {
      for (const filter of rule.rules.filters) {
        result = this.applyFilter(result, filter);
      }
    }

    // Apply validators
    if (rule.rules.validators) {
      for (const validator of rule.rules.validators) {
        this.validateField(result, validator);
      }
    }

    return result;
  }

  /**
   * Get value from object using dot notation path
   */
  private static getValueByPath(obj: any, path: string): any {
    const keys = path.split('.');
    let value = obj;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Set value in object using dot notation path
   */
  private static setValueByPath(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
  }

  /**
   * Apply transformation function to a value
   */
  private static applyTransformFunction(value: any, func: TransformFunction): any {
    try {
      switch (func) {
        case 'uppercase':
          return String(value).toUpperCase();

        case 'lowercase':
          return String(value).toLowerCase();

        case 'trim':
          return String(value).trim();

        case 'parseInt':
          return parseInt(String(value), 10);

        case 'parseFloat':
          return parseFloat(String(value));

        case 'toBoolean':
          return Boolean(value);

        case 'toDate':
          return new Date(value);

        case 'formatDate':
          return new Date(value).toISOString();

        case 'formatCurrency':
          return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
          }).format(value);

        case 'mask':
          // Mask sensitive data (e.g., credit card, SSN)
          return this.maskValue(String(value));

        case 'hash':
          // Simple hash (use crypto for production)
          return String(value).split('').reduce((a, b) => {
            a = (a << 5) - a + b.charCodeAt(0);
            return a & a;
          }, 0);

        default:
          return value;
      }
    } catch (error) {
      logger.warn(`Transform function ${func} failed: ${error.message}`);
      return value;
    }
  }

  /**
   * Mask sensitive value
   */
  private static maskValue(value: string): string {
    if (value.length <= 4) {
      return '****';
    }
    return '*'.repeat(value.length - 4) + value.slice(-4);
  }

  /**
   * Apply filter to data
   */
  private static applyFilter(data: any, filter: string): any {
    switch (filter) {
      case 'remove_pii':
        return this.removePII(data);

      case 'remove_null':
        return this.removeNullValues(data);

      case 'sanitize_html':
        return this.sanitizeHTML(data);

      case 'flatten':
        return this.flattenObject(data);

      default:
        return data;
    }
  }

  /**
   * Remove PII (Personally Identifiable Information)
   */
  private static removePII(obj: any): any {
    const piiFields = [
      'ssn',
      'social_security_number',
      'password',
      'credit_card',
      'card_number',
      'cvv',
      'pin',
      'secret',
    ];

    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    const result = Array.isArray(obj) ? [] : {};

    for (const key in obj) {
      if (piiFields.some(field => key.toLowerCase().includes(field))) {
        result[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object') {
        result[key] = this.removePII(obj[key]);
      } else {
        result[key] = obj[key];
      }
    }

    return result;
  }

  /**
   * Remove null and undefined values
   */
  private static removeNullValues(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    const result = Array.isArray(obj) ? [] : {};

    for (const key in obj) {
      if (obj[key] !== null && obj[key] !== undefined) {
        if (typeof obj[key] === 'object') {
          result[key] = this.removeNullValues(obj[key]);
        } else {
          result[key] = obj[key];
        }
      }
    }

    return result;
  }

  /**
   * Sanitize HTML content
   */
  private static sanitizeHTML(obj: any): any {
    if (typeof obj === 'string') {
      return obj.replace(/<[^>]*>/g, '');
    }

    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    const result = Array.isArray(obj) ? [] : {};

    for (const key in obj) {
      result[key] = this.sanitizeHTML(obj[key]);
    }

    return result;
  }

  /**
   * Flatten nested object
   */
  private static flattenObject(obj: any, prefix: string = ''): any {
    const result: any = {};

    for (const key in obj) {
      const newKey = prefix ? `${prefix}.${key}` : key;

      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        Object.assign(result, this.flattenObject(obj[key], newKey));
      } else {
        result[newKey] = obj[key];
      }
    }

    return result;
  }

  /**
   * Validate field against rules
   */
  private static validateField(data: any, rule: ValidationRule): void {
    const value = this.getValueByPath(data, rule.field);

    // Check required
    if (rule.required && (value === undefined || value === null || value === '')) {
      throw new Error(`Validation failed: ${rule.field} is required`);
    }

    if (value === undefined || value === null) {
      return;
    }

    // Type validation
    switch (rule.type) {
      case 'string':
        if (typeof value !== 'string') {
          throw new Error(`Validation failed: ${rule.field} must be a string`);
        }
        if (rule.min && value.length < rule.min) {
          throw new Error(`Validation failed: ${rule.field} must be at least ${rule.min} characters`);
        }
        if (rule.max && value.length > rule.max) {
          throw new Error(`Validation failed: ${rule.field} must be at most ${rule.max} characters`);
        }
        if (rule.pattern && !new RegExp(rule.pattern).test(value)) {
          throw new Error(`Validation failed: ${rule.field} does not match pattern`);
        }
        break;

      case 'number':
        if (typeof value !== 'number' && isNaN(Number(value))) {
          throw new Error(`Validation failed: ${rule.field} must be a number`);
        }
        const numValue = Number(value);
        if (rule.min !== undefined && numValue < rule.min) {
          throw new Error(`Validation failed: ${rule.field} must be at least ${rule.min}`);
        }
        if (rule.max !== undefined && numValue > rule.max) {
          throw new Error(`Validation failed: ${rule.field} must be at most ${rule.max}`);
        }
        break;

      case 'email':
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(String(value))) {
          throw new Error(`Validation failed: ${rule.field} must be a valid email`);
        }
        break;

      case 'phone':
        const phonePattern = /^[\d\s\-\(\)]+$/;
        if (!phonePattern.test(String(value))) {
          throw new Error(`Validation failed: ${rule.field} must be a valid phone number`);
        }
        break;
    }
  }

  /**
   * Delete transformation rule
   */
  static async deleteRule(ruleId: string): Promise<void> {
    try {
      await pool.query(
        'DELETE FROM connector_transformations WHERE id = $1',
        [ruleId]
      );

      logger.info(`Transformation rule deleted: ${ruleId}`);
    } catch (error) {
      logger.error(`Delete transformation rule error: ${error.message}`);
      throw error;
    }
  }
}
