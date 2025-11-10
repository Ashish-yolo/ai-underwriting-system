# Connector Response Mapping & Policy Variable System - Implementation Guide

## Overview
This document describes the implementation of the Connector Response Mapping system that allows dynamic variable discovery from external connector responses and makes them available for policy building.

## ✅ Completed Components

### 1. Database Schema (`008_create_connector_variables_tables_v2.sql`)

**Created Tables:**
- `connector_executions` - Logs each connector API call with request/response
- `connector_variables` - Registry of discovered variables from responses
- `application_connector_data` - Stores flattened data for each application
- `policy_variable_usage` - Tracks which policies use which variables

**Key Features:**
- Proper indexing for fast lookups
- Foreign key relationships for data integrity
- Support for tracking variable usage across policies

### 2. Response Parser Service (`connector-response-parser.service.ts`)

**Implemented Functions:**
- `parseConnectorResponse(connectorId, response)` - Discovers all variables from JSON response
- `registerVariables(connectorId, variables)` - Saves discovered variables to database
- `getVariableValue(response, variablePath)` - Resolves variable value from JSON path
- `storeApplicationConnectorData(applicationId, connectorId, executionId, response)` - Flattens and stores data

**Key Features:**
- Automatic conversion of JSON keys to PascalCase (e.g., `credit_score` → `CreditScore`)
- Type inference (string, number, boolean, date, array, object)
- Recursive parsing with depth limit to handle nested structures
- Array handling with item structure analysis

## 🚧 Remaining Implementation Tasks

### 3. Connector Execution Service
**File:** `backend/src/services/connector-execution.service.ts`

**Required Functions:**
```typescript
// Execute connector and store results
async function executeConnector(
  connectorId: string,
  applicationId: string,
  requestPayload: any
): Promise<{executionId: string; response: any}>

// Get connector by ID
async function getConnectorById(connectorId: string)

// Get connector by name
async function getConnectorByName(name: string)
```

**Implementation Steps:**
1. Fetch connector config from database
2. Make HTTP request to connector API endpoint
3. Store execution record in `connector_executions`
4. Parse response and discover/register variables
5. Store flattened data in `application_connector_data`
6. Return execution ID and response

### 4. Variable Registry Service
**File:** `backend/src/services/variable-registry.service.ts`

**Required Functions:**
```typescript
// Get all variables for a connector
async function getConnectorVariables(connectorId: string)

// Get all variables available for policy building
async function getAllAvailableVariables()

// Update variable metadata (display name, description, hidden status)
async function updateVariableMetadata(variableId: string, updates: any)

// Get variable usage in policies
async function getVariableUsage(connectorId: string, variableName: string)

// Refresh variable registry from latest execution
async function refreshVariableRegistry(connectorId: string)
```

### 5. API Endpoints
**File:** `backend/src/routes/connectors.routes.ts`

**Required Endpoints:**
```typescript
// Execute a connector
POST /api/connectors/:id/execute
Body: {applicationId, requestPayload}
Response: {executionId, response, variables}

// Get connector variables
GET /api/connectors/:id/variables
Response: {variables: [{name, path, type, sample}]}

// Refresh variable registry
POST /api/connectors/:id/variables/refresh
Response: {discovered: number, updated: number}

// Get all available variables for policy builder
GET /api/policy-builder/variables
Response: {connectors: [{id, name, variables: [...]}]}

// Get connector executions history
GET /api/connectors/:id/executions
Response: {executions: [...]}

// Get application connector data
GET /api/applications/:id/connector-data
Response: {connectors: [{connectorId, data: {...}}]}
```

### 6. Policy Evaluation Integration
**File:** `backend/src/services/policy-evaluation.service.ts`

**Required Changes:**
1. Modify expression evaluator to recognize `ConnectorName.VariableName` syntax
2. When evaluating a condition like `Experian.Score > 700`:
   - Parse connector name ("Experian") and variable name ("Score")
   - Look up connector by name
   - Fetch application connector data for this application + connector
   - Resolve variable value from stored data
   - Perform comparison

**Example Implementation:**
```typescript
function resolveVariable(applicationId: string, variableRef: string): any {
  const [connectorName, variableName] = variableRef.split('.');

  // Get connector by name
  const connector = await getConnectorByName(connectorName);

  // Get application data for this connector
  const data = await getApplicationConnectorData(applicationId, connector.id);

  // Return variable value
  return data[variableName];
}
```

### 7. Frontend Components

**File:** `frontend/src/components/policy-builder/VariableSelector.tsx`

**Features Needed:**
- Dropdown/autocomplete for selecting variables
- Grouped by connector (Experian, CIBIL, BankStatement, GST)
- Show data type icon (string, number, boolean, date)
- Show sample value from recent execution
- Search/filter functionality

**File:** `frontend/src/stores/variablesStore.ts`

**State Management:**
```typescript
interface VariablesStore {
  connectors: Connector[];
  variables: Record<string, Variable[]>; // keyed by connectorId
  loadVariables: () => Promise<void>;
  getVariablesByConnector: (connectorId: string) => Variable[];
  searchVariables: (query: string) => Variable[];
}
```

### 8. Example Connector Mock Implementations
**File:** `backend/src/connectors/`

Create mock connectors for testing:
- `experian.mock.ts` - Returns sample Experian response
- `bank-statement.mock.ts` - Returns sample bank statement analysis
- `gst.mock.ts` - Returns sample GST verification

## 📝 Usage Examples

### Example 1: Execute Experian Connector

```typescript
// 1. Execute connector
const {executionId, response} = await executeConnector(
  'connector-uuid-experian',
  'app-12345',
  {pan: 'ABCDE1234F'}
);

// 2. Variables are automatically discovered and registered:
// - Experian.Score (number)
// - Experian.TotalAccounts (number)
// - Experian.ActiveAccounts (number)
// - Experian.OverdueAccounts (number)
// etc.

// 3. Flattened data stored:
{
  "Score": 750,
  "TotalAccounts": 5,
  "ActiveAccounts": 3,
  "OverdueAccounts": 0,
  "CreditUtilization": 35.5
}

// 4. Use in policy:
"IF Experian.Score > 700 AND Experian.OverdueAccounts == 0 THEN APPROVE"
```

### Example 2: Policy Builder Integration

```tsx
// In policy condition builder
<VariableSelector
  onSelect={(variable) => {
    // variable = {connector: "Experian", name: "Score", type: "number"}
    setCondition({
      left: `${variable.connector}.${variable.name}`,
      operator: '>',
      right: '700'
    });
  }}
/>

// Renders as:
<select>
  <optgroup label="Experian">
    <option value="Experian.Score">Score (number) - e.g., 750</option>
    <option value="Experian.TotalAccounts">Total Accounts (number) - e.g., 5</option>
  </optgroup>
  <optgroup label="BankStatement">
    <option value="BankStatement.AvgMonthlyBalance">Avg Monthly Balance (number)</option>
  </optgroup>
</select>
```

## 🔄 Complete Flow

1. **Connector Execution**
   ```
   POST /api/connectors/experian/execute
   → Call Experian API
   → Store execution record
   → Parse response structure
   → Discover variables
   → Register in variable registry
   → Store flattened data
   ```

2. **Policy Creation**
   ```
   User creates policy in UI
   → Selects variables from dropdown (Experian.Score, etc.)
   → Builds conditions using variables
   → Saves policy with variable references
   → Track variable usage in policy_variable_usage table
   ```

3. **Policy Evaluation**
   ```
   Application submitted
   → Execute required connectors
   → Store connector responses
   → Evaluate policy
   → Resolve variable references (Experian.Score → 750)
   → Compare and make decision
   ```

## 🧪 Testing Checklist

- [ ] Database migration runs successfully
- [ ] Response parser correctly discovers variables from JSON
- [ ] PascalCase conversion works (credit_score → CreditScore)
- [ ] Type inference works for string, number, boolean, date
- [ ] Nested objects are flattened correctly
- [ ] Arrays are handled properly
- [ ] Variables are registered in database
- [ ] Duplicate variables are updated (upsert)
- [ ] Flattened data is stored correctly
- [ ] Variable resolution works in policy evaluation
- [ ] API endpoints return correct data
- [ ] Frontend variable selector displays variables grouped by connector
- [ ] Policy builder can reference variables
- [ ] Variable usage tracking works

## 📚 Reference: Sample Connector Responses

### Experian Response
```json
{
  "status": "success",
  "data": {
    "score": 750,
    "creditProfile": {
      "totalAccounts": 5,
      "activeAccounts": 3,
      "overdueAccounts": 0
    }
  }
}
```

**Discovered Variables:**
- `Status` (string) → "status"
- `Score` (number) → "data.score"
- `TotalAccounts` (number) → "data.creditProfile.totalAccounts"
- `ActiveAccounts` (number) → "data.creditProfile.activeAccounts"
- `OverdueAccounts` (number) → "data.creditProfile.overdueAccounts"

## 🚀 Next Steps

1. Complete connector execution service
2. Create variable registry management service
3. Build API endpoints
4. Integrate with policy evaluation engine
5. Create frontend variable selector component
6. Test end-to-end with mock connectors
7. Deploy and document API usage

## 📖 Documentation

API documentation should be added to Swagger/OpenAPI spec for all new endpoints.

---

**Status:** Database schema and response parser completed. Remaining: Services, API endpoints, frontend integration.
