import axios, { AxiosRequestConfig, Method } from 'axios';
import logger from '../utils/logger';

export type ProtocolType = 'rest' | 'soap' | 'graphql' | 'grpc' | 'websocket';

export interface RequestOptions {
  method?: Method;
  url: string;
  headers?: Record<string, string>;
  data?: any;
  params?: Record<string, any>;
  timeout?: number;
}

export interface SOAPOptions extends RequestOptions {
  soapAction?: string;
  envelope?: string;
}

export interface GraphQLOptions extends RequestOptions {
  query: string;
  variables?: Record<string, any>;
  operationName?: string;
}

export interface ProtocolResponse {
  data: any;
  status: number;
  headers: Record<string, string>;
  executionTimeMs: number;
}

/**
 * Protocol Handler Service
 * Handles multiple protocols: REST, SOAP, GraphQL, gRPC, WebSocket
 */
export class ProtocolHandlerService {
  /**
   * Execute REST request
   */
  static async executeREST(options: RequestOptions): Promise<ProtocolResponse> {
    const startTime = Date.now();

    try {
      const axiosConfig: AxiosRequestConfig = {
        method: options.method || 'GET',
        url: options.url,
        headers: options.headers || {},
        data: options.data,
        params: options.params,
        timeout: options.timeout || 30000,
        validateStatus: () => true, // Don't throw on any status code
      };

      const response = await axios(axiosConfig);
      const executionTimeMs = Date.now() - startTime;

      logger.debug(`REST request completed: ${options.method} ${options.url} - ${response.status}`);

      return {
        data: response.data,
        status: response.status,
        headers: response.headers as Record<string, string>,
        executionTimeMs,
      };
    } catch (error) {
      const executionTimeMs = Date.now() - startTime;

      logger.error(`REST request failed: ${error.message}`);

      throw {
        message: error.message,
        code: error.code,
        executionTimeMs,
      };
    }
  }

  /**
   * Execute SOAP request
   */
  static async executeSOAP(options: SOAPOptions): Promise<ProtocolResponse> {
    const startTime = Date.now();

    try {
      // Build SOAP envelope if not provided
      const envelope = options.envelope || this.buildSOAPEnvelope(options.data);

      const axiosConfig: AxiosRequestConfig = {
        method: 'POST',
        url: options.url,
        headers: {
          'Content-Type': 'text/xml;charset=UTF-8',
          SOAPAction: options.soapAction || '',
          ...options.headers,
        },
        data: envelope,
        timeout: options.timeout || 30000,
        validateStatus: () => true,
      };

      const response = await axios(axiosConfig);
      const executionTimeMs = Date.now() - startTime;

      // Parse SOAP response
      const parsedData = this.parseSOAPResponse(response.data);

      logger.debug(`SOAP request completed: ${options.url} - ${response.status}`);

      return {
        data: parsedData,
        status: response.status,
        headers: response.headers as Record<string, string>,
        executionTimeMs,
      };
    } catch (error) {
      const executionTimeMs = Date.now() - startTime;

      logger.error(`SOAP request failed: ${error.message}`);

      throw {
        message: error.message,
        code: error.code,
        executionTimeMs,
      };
    }
  }

  /**
   * Execute GraphQL request
   */
  static async executeGraphQL(options: GraphQLOptions): Promise<ProtocolResponse> {
    const startTime = Date.now();

    try {
      const axiosConfig: AxiosRequestConfig = {
        method: 'POST',
        url: options.url,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        data: {
          query: options.query,
          variables: options.variables || {},
          operationName: options.operationName || null,
        },
        timeout: options.timeout || 30000,
        validateStatus: () => true,
      };

      const response = await axios(axiosConfig);
      const executionTimeMs = Date.now() - startTime;

      // Check for GraphQL errors
      if (response.data.errors && response.data.errors.length > 0) {
        logger.warn(`GraphQL query returned errors: ${JSON.stringify(response.data.errors)}`);
      }

      logger.debug(`GraphQL request completed: ${options.url} - ${response.status}`);

      return {
        data: response.data,
        status: response.status,
        headers: response.headers as Record<string, string>,
        executionTimeMs,
      };
    } catch (error) {
      const executionTimeMs = Date.now() - startTime;

      logger.error(`GraphQL request failed: ${error.message}`);

      throw {
        message: error.message,
        code: error.code,
        executionTimeMs,
      };
    }
  }

  /**
   * Execute gRPC request (placeholder - requires @grpc/grpc-js)
   */
  static async executeGRPC(options: RequestOptions): Promise<ProtocolResponse> {
    // NOTE: Full gRPC implementation requires @grpc/grpc-js and .proto files
    // This is a placeholder that shows the structure

    throw new Error(
      'gRPC protocol not fully implemented. Requires @grpc/grpc-js package and protocol buffer definitions.'
    );

    // Example structure for future implementation:
    // const startTime = Date.now();
    //
    // const client = new YourGRPCClient(options.url, grpc.credentials.createInsecure());
    //
    // return new Promise((resolve, reject) => {
    //   client.yourMethod(options.data, (error: any, response: any) => {
    //     const executionTimeMs = Date.now() - startTime;
    //
    //     if (error) {
    //       reject({ message: error.message, executionTimeMs });
    //     } else {
    //       resolve({
    //         data: response,
    //         status: 0, // gRPC status code
    //         headers: {},
    //         executionTimeMs,
    //       });
    //     }
    //   });
    // });
  }

  /**
   * Execute WebSocket connection (placeholder)
   */
  static async executeWebSocket(options: RequestOptions): Promise<ProtocolResponse> {
    // NOTE: Full WebSocket implementation requires 'ws' package
    // This is a placeholder that shows the structure

    throw new Error(
      'WebSocket protocol not fully implemented. Requires ws package and persistent connection management.'
    );

    // Example structure for future implementation:
    // const startTime = Date.now();
    // const ws = new WebSocket(options.url);
    //
    // return new Promise((resolve, reject) => {
    //   ws.on('open', () => {
    //     ws.send(JSON.stringify(options.data));
    //   });
    //
    //   ws.on('message', (data: any) => {
    //     const executionTimeMs = Date.now() - startTime;
    //     ws.close();
    //
    //     resolve({
    //       data: JSON.parse(data),
    //       status: 200,
    //       headers: {},
    //       executionTimeMs,
    //     });
    //   });
    //
    //   ws.on('error', (error: any) => {
    //     const executionTimeMs = Date.now() - startTime;
    //     reject({ message: error.message, executionTimeMs });
    //   });
    // });
  }

  /**
   * Execute request based on protocol type
   */
  static async execute(
    protocol: ProtocolType,
    options: RequestOptions | SOAPOptions | GraphQLOptions
  ): Promise<ProtocolResponse> {
    switch (protocol) {
      case 'rest':
        return this.executeREST(options as RequestOptions);

      case 'soap':
        return this.executeSOAP(options as SOAPOptions);

      case 'graphql':
        return this.executeGraphQL(options as GraphQLOptions);

      case 'grpc':
        return this.executeGRPC(options as RequestOptions);

      case 'websocket':
        return this.executeWebSocket(options as RequestOptions);

      default:
        throw new Error(`Unsupported protocol: ${protocol}`);
    }
  }

  /**
   * Build SOAP envelope from data
   */
  private static buildSOAPEnvelope(data: any): string {
    const bodyContent = this.objectToXML(data);

    return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <soap:Body>
    ${bodyContent}
  </soap:Body>
</soap:Envelope>`;
  }

  /**
   * Convert object to XML
   */
  private static objectToXML(obj: any, rootName: string = 'Request'): string {
    if (typeof obj !== 'object' || obj === null) {
      return String(obj);
    }

    let xml = `<${rootName}>`;

    for (const key in obj) {
      const value = obj[key];

      if (Array.isArray(value)) {
        for (const item of value) {
          xml += this.objectToXML(item, key);
        }
      } else if (typeof value === 'object' && value !== null) {
        xml += this.objectToXML(value, key);
      } else {
        xml += `<${key}>${this.escapeXML(String(value))}</${key}>`;
      }
    }

    xml += `</${rootName}>`;
    return xml;
  }

  /**
   * Escape XML special characters
   */
  private static escapeXML(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Parse SOAP response to JSON
   */
  private static parseSOAPResponse(xml: string): any {
    try {
      // Simple XML to JSON parser (for production, use a library like 'fast-xml-parser')
      // This is a basic implementation for demonstration

      // Extract SOAP body
      const bodyMatch = xml.match(/<soap:Body[^>]*>([\s\S]*)<\/soap:Body>/i);
      if (!bodyMatch) {
        return { raw: xml };
      }

      const bodyContent = bodyMatch[1];

      // Basic XML to object conversion (simplified)
      // In production, use a proper XML parser library
      return {
        body: bodyContent.trim(),
        raw: xml,
      };
    } catch (error) {
      logger.warn(`Failed to parse SOAP response: ${error.message}`);
      return { raw: xml };
    }
  }

  /**
   * Build authentication headers based on auth type
   */
  static buildAuthHeaders(
    authType: string,
    credentials: any
  ): Record<string, string> {
    const headers: Record<string, string> = {};

    switch (authType) {
      case 'api_key':
        if (credentials.headerName) {
          headers[credentials.headerName] = credentials.apiKey;
        } else {
          headers['X-API-Key'] = credentials.apiKey;
        }
        break;

      case 'bearer':
        headers['Authorization'] = `Bearer ${credentials.token}`;
        break;

      case 'basic':
        const basicAuth = Buffer.from(
          `${credentials.username}:${credentials.password}`
        ).toString('base64');
        headers['Authorization'] = `Basic ${basicAuth}`;
        break;

      case 'oauth2':
        headers['Authorization'] = `Bearer ${credentials.accessToken}`;
        break;

      case 'jwt':
        headers['Authorization'] = `Bearer ${credentials.token}`;
        break;

      case 'custom':
        if (credentials.headers) {
          Object.assign(headers, credentials.headers);
        }
        break;
    }

    return headers;
  }

  /**
   * Parse response based on content type
   */
  static parseResponse(data: any, contentType: string): any {
    if (!contentType) {
      return data;
    }

    const lowerContentType = contentType.toLowerCase();

    try {
      if (lowerContentType.includes('application/json')) {
        return typeof data === 'string' ? JSON.parse(data) : data;
      }

      if (lowerContentType.includes('application/xml') || lowerContentType.includes('text/xml')) {
        return this.parseSOAPResponse(data);
      }

      if (lowerContentType.includes('text/csv')) {
        return this.parseCSV(data);
      }

      // Default: return as is
      return data;
    } catch (error) {
      logger.warn(`Failed to parse response with content-type ${contentType}: ${error.message}`);
      return data;
    }
  }

  /**
   * Parse CSV to JSON
   */
  private static parseCSV(csv: string): any[] {
    const lines = csv.trim().split('\n');
    if (lines.length === 0) {
      return [];
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const result: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const obj: any = {};

      for (let j = 0; j < headers.length; j++) {
        obj[headers[j]] = values[j];
      }

      result.push(obj);
    }

    return result;
  }
}
