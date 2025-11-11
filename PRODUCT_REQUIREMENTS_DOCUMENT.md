# AI Underwriting System - Product Requirements Document (PRD)

## Document Information
- **Product Name**: AI-Powered Underwriting System
- **Version**: 1.0.0
- **Last Updated**: November 11, 2025
- **Status**: Production Ready

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [System Overview](#system-overview)
3. [Core Components](#core-components)
4. [Feature Specifications](#feature-specifications)
5. [Technical Architecture](#technical-architecture)
6. [API Documentation](#api-documentation)
7. [User Workflows](#user-workflows)
8. [Database Schema](#database-schema)
9. [Security & Compliance](#security--compliance)
10. [Deployment & Infrastructure](#deployment--infrastructure)

---

## 1. Executive Summary

### 1.1 Product Vision
The AI Underwriting System is a comprehensive, no-code platform that enables financial institutions to design, deploy, and manage automated underwriting policies for loan applications. The system provides a visual workflow builder, real-time decision engine, API integration capabilities, and comprehensive analytics.

### 1.2 Key Value Propositions
- **Visual No-Code Policy Builder**: Drag-and-drop interface for creating complex underwriting logic without writing code
- **Real-Time Decision Engine**: Sub-second underwriting decisions via REST API
- **Flexible Connector System**: Integrate with any third-party data provider (credit bureaus, banking APIs, KYC services)
- **Manual Review Workflow**: Seamless human oversight for edge cases
- **Comprehensive Analytics**: Real-time dashboards and reporting on underwriting performance

### 1.3 Target Users
- **Underwriting Managers**: Design and configure underwriting policies
- **Risk Analysts**: Monitor performance, analyze trends, manage manual reviews
- **System Administrators**: Manage users, API keys, connectors
- **Developers**: Integrate underwriting decisions into loan origination systems (LOS)

---

## 2. System Overview

### 2.1 High-Level Architecture
```
┌─────────────────┐
│  Loan System    │
│  (External)     │
└────────┬────────┘
         │ REST API
         │ (with API Key)
         ▼
┌─────────────────────────────────────┐
│     AI Underwriting System          │
│  ┌───────────────────────────────┐  │
│  │   Frontend (React + Vite)     │  │
│  │   - Policy Builder            │  │
│  │   - Dashboard & Analytics     │  │
│  │   - Manual Review Queue       │  │
│  │   - Connector Management      │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │   Backend (Node.js/Express)   │  │
│  │   - Workflow Engine           │  │
│  │   - API Gateway               │  │
│  │   - Connector Executor        │  │
│  │   - Analytics Engine          │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │   Databases                   │  │
│  │   - PostgreSQL (Primary)      │  │
│  │   - Redis (Caching)           │  │
│  │   - MongoDB (Optional)        │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

### 2.2 Technology Stack

#### Frontend
- **Framework**: React 18.x + TypeScript
- **Build Tool**: Vite
- **State Management**: Zustand (policyBuilderStore)
- **UI Framework**: Tailwind CSS + Heroicons
- **Workflow Visualization**: React Flow
- **HTTP Client**: Axios
- **Routing**: React Router v6

#### Backend
- **Runtime**: Node.js
- **Framework**: Express.js + TypeScript
- **Primary Database**: PostgreSQL (Supabase) - Port 5432
- **Cache Layer**: Redis (ioredis)
- **Document Store**: MongoDB (optional)
- **Authentication**: JWT + bcrypt
- **Validation**: Joi
- **File Processing**: Multer, XLSX, Mammoth
- **Expression Engine**: mathjs
- **Logging**: Winston
- **API Documentation**: Swagger/OpenAPI
- **Job Queue**: Bull
- **Scheduling**: node-cron

---

## 3. Core Components

### 3.1 Visual Policy Builder

#### 3.1.1 Purpose
A drag-and-drop interface for creating underwriting workflows without writing code.

#### 3.1.2 Node Types

##### START Node
- **Purpose**: Entry point for every workflow
- **Configuration**: None
- **Constraints**: Exactly 1 per workflow (required)
- **File**: `frontend/src/components/policy-builder/nodes/StartNode.tsx`

##### STRATEGY Node
- **Purpose**: Contains decision logic with multiple conditions
- **Configuration**:
  - Node name
  - Multiple conditions (each condition has):
    - Left operand (variable from connector)
    - Operator (equals, not_equals, greater_than, less_than, greater_than_or_equal, less_than_or_equal, contains, not_contains, matches, not_matches)
    - Right operand (value or another variable)
    - Logical connector (AND/OR)
    - Decision (Approved/Manual Check)
- **Decision Logic**:
  - If ALL conditions in a group are valid → Apply the decision
  - If ANY condition is invalid → Output "Reject"
  - Block-level priority: Rejected > Manual Review > Approved
- **Visual Feedback**:
  - Green border: All conditions passed
  - Yellow border: Manual check required
  - Red border: Rejected
- **File**: `frontend/src/components/policy-builder/nodes/StrategyNode.tsx`

##### Edges (Connections)
- **Visual**: Animated lines connecting nodes
- **Logic**: Sequential execution flow
- **Validation**: No circular dependencies

#### 3.1.3 Key Features

##### Condition Builder
- **Location**: `frontend/src/components/policy-builder/modals/ConditionBuilder.tsx`
- **Features**:
  - Variable autocomplete with live search
  - Nested condition groups
  - AND/OR logical operators
  - Type-safe comparisons
  - Real-time validation

##### Variable Autocomplete
- **Location**: `frontend/src/components/policy-builder/modals/VariableAutocomplete.tsx`
- **Features**:
  - Search across all connector variables
  - Hierarchical display (connector.field.subfield)
  - Type indicators
  - Recently used variables
  - Click or keyboard navigation

##### Testing Interface
- **Location**: `frontend/src/components/policy-builder/modals/TestModal.tsx`
- **Features**:
  - Single test: JSON input for one application
  - Bulk test: Upload XLSX/CSV file
  - Split-view mode: Test panel + workflow visualization
  - Real-time execution feedback
  - Color-coded node states during testing

##### Test Results Overlay
- **Location**: `frontend/src/components/policy-builder/TestResultsOverlay.tsx`
- **Display**:
  - Final decision (Approved/Rejected/Manual Review)
  - Execution summary
  - Failed conditions (if rejected)
  - Manual check reasons (if manual review)
  - Block-by-block results

#### 3.1.4 Canvas Features
- **Location**: `frontend/src/components/policy-builder/Canvas.tsx`
- **Capabilities**:
  - Drag & drop node placement
  - Zoom in/out
  - Pan navigation
  - Auto-layout suggestions
  - Minimap
  - Snap-to-grid (via `useProximitySnapping` hook)
  - Undo/redo
  - Copy/paste nodes

#### 3.1.5 Property Panel
- **Location**: `frontend/src/components/policy-builder/PropertyPanel.tsx`
- **Shows**:
  - Selected node details
  - Configuration options
  - Validation errors for node
  - Quick actions (delete, duplicate)

#### 3.1.6 Node Palette
- **Location**: `frontend/src/components/policy-builder/NodePalette.tsx`
- **Contents**:
  - START node (only one allowed)
  - STRATEGY node (unlimited)
  - Visual preview of each node type
  - Collapsible sidebar

---

### 3.2 Connector System

#### 3.2.1 Purpose
Connectors enable the system to fetch data from external APIs (credit bureaus, banking APIs, KYC services, etc.) during underwriting.

#### 3.2.2 Connector Configuration

##### Basic Settings
- **Name**: Human-readable connector name
- **Type**: API type (REST, GraphQL, SOAP, Custom)
- **Base URL**: API endpoint
- **Authentication**:
  - None
  - API Key (header or query param)
  - Basic Auth
  - Bearer Token
  - OAuth 2.0
- **Timeout**: Request timeout (ms)
- **Retry Policy**: Max retries and backoff strategy

##### Request Configuration
- **Method**: GET, POST, PUT, DELETE
- **Headers**: Custom HTTP headers
- **Body Template**: JSON template with variable substitution
- **Query Parameters**: Dynamic query params

##### Response Mapping
- **Response Path**: JSONPath to extract relevant data
- **Field Mapping**: Map API response fields to internal variable names
- **Type Inference**: Automatic data type detection

#### 3.2.3 Variable Extraction System

##### Automatic Variable Discovery
- **File**: `backend/src/api/routes/connector.routes.ts:156-189`
- **Process**:
  1. User provides sample request payload
  2. User provides sample response payload (or executes test request)
  3. System recursively parses JSON structure
  4. Extracts all fields as dot-notation paths (e.g., `credit_report.score`, `applicant.income.monthly`)
  5. Stores in `connector_variables` table
  6. Infers data types (string, number, boolean, object, array)

##### Variable Storage
- **Table**: `connector_variables`
- **Schema**:
  - `connector_id`: Reference to parent connector
  - `variable_name`: Full path (e.g., `applicant.credit_score`)
  - `variable_path`: JSONPath for extraction
  - `data_type`: Inferred type
  - `is_required`: Whether field must be present
  - `default_value`: Fallback value
  - `description`: Human-readable description

##### Variable Usage
- **In Policy Builder**:
  - Available in condition builder dropdown
  - Grouped by connector
  - Searchable
  - Type-safe comparisons

#### 3.2.4 Connector Testing
- **Location**: `frontend/src/components/connectors/ConnectorDetails.tsx`
- **Features**:
  - Test API connectivity
  - Send sample requests
  - View raw responses
  - Validate response structure
  - Update variable mappings

#### 3.2.5 Connector Execution
- **File**: `backend/src/services/underwriting.service.ts`
- **Process**:
  1. Retrieve all connectors linked to policy
  2. For each connector:
     - Substitute application data into request template
     - Execute HTTP request with auth
     - Handle retries on failure
     - Parse response
     - Extract variables using JSONPath
  3. Merge all connector data into execution context
  4. Pass to workflow engine

#### 3.2.6 Security
- **Credential Storage**: Encrypted in database (AES-256)
- **File**: `backend/src/utils/encryption.ts`
- **Migration**: `backend/src/database/migrations/010_encrypt_connector_credentials.sql`

---

### 3.3 Workflow Engine

#### 3.3.1 Purpose
Execute underwriting policies in real-time with sub-second response times.

#### 3.3.2 Execution Flow

##### Step 1: Request Validation
- **File**: `backend/src/api/routes/underwriting.routes.ts:141-176`
- **Validates**:
  - API key authentication
  - Required fields (application_id, applicant data)
  - Policy exists and is active
  - Rate limits

##### Step 2: Data Collection
- **File**: `backend/src/services/underwriting.service.ts`
- **Actions**:
  - Fetch policy workflow JSON
  - Execute all connectors
  - Merge applicant data + connector responses
  - Build execution context

##### Step 3: Workflow Execution
- **File**: `backend/src/services/workflow-executor.service.ts`
- **Process**:
  1. Find START node
  2. Traverse edges to next nodes
  3. For each STRATEGY node:
     - Evaluate all conditions
     - Apply decision logic:
       - If all conditions valid → Use condition decision (Approved/Manual Check)
       - If any condition invalid → Reject
  4. Aggregate decisions:
     - Block-level priority: Rejected > Manual Review > Approved
  5. Return final decision

##### Step 4: Decision Persistence
- **Tables**:
  - `underwriting_requests`: Log all requests
  - `underwriting_decisions`: Store decisions
  - `manual_reviews`: Queue for manual review (if needed)
  - `execution_logs`: Detailed execution traces

##### Step 5: Response
- **Format**:
```json
{
  "success": true,
  "data": {
    "underwriting_id": "uuid",
    "decision": "approved|rejected|manual_review",
    "decision_date": "ISO timestamp",
    "confidence_score": 0.95,
    "reasons": [
      {
        "condition": "credit_score > 700",
        "result": true,
        "message": "Credit score meets requirement"
      }
    ],
    "manual_review_reasons": [],
    "execution_time_ms": 450
  }
}
```

#### 3.3.3 Expression Evaluation
- **Library**: mathjs
- **File**: `backend/src/services/workflow-executor.service.ts`
- **Supported Operators**:
  - Comparison: `==`, `!=`, `>`, `<`, `>=`, `<=`
  - Logical: `&&`, `||`, `!`
  - String: `contains`, `matches` (regex), `startsWith`, `endsWith`
  - Math: `+`, `-`, `*`, `/`, `%`, `^`
  - Functions: `max()`, `min()`, `abs()`, `round()`

#### 3.3.4 Error Handling
- **Connector Failures**:
  - Retry with exponential backoff
  - Return error in execution context
  - Continue workflow with partial data
- **Condition Errors**:
  - Log error details
  - Treat as failed condition (reject)
- **Workflow Errors**:
  - Return 500 error
  - Log to Winston
  - Trigger alert (if configured)

---

### 3.4 Manual Review Queue

#### 3.4.1 Purpose
Human oversight for applications that require additional scrutiny.

#### 3.4.2 Trigger Conditions
- **Strategy node decision**: "Manual Check"
- **System errors**: Connector failures, missing data
- **High-risk indicators**: Fraud flags, anomalies

#### 3.4.3 Review Interface
- **Location**: `frontend/src/pages/ManualReview.tsx`
- **Features**:
  - List view with filters (status, priority, SLA)
  - Detailed application view
  - Original workflow visualization
  - Connector data inspection
  - Decision history
  - Comment thread
  - Override decision

#### 3.4.4 Review Actions
- **File**: `backend/src/api/routes/manual-review.routes.ts`
- **Operations**:
  - `GET /api/manual-review`: List all reviews
  - `GET /api/manual-review/:id`: Get review details
  - `PUT /api/manual-review/:id/assign`: Assign to reviewer
  - `POST /api/manual-review/:id/complete`: Submit decision
  - `POST /api/manual-review/:id/comment`: Add comment

#### 3.4.5 Review Record Structure
```typescript
{
  id: string;
  application_id: string;
  underwriting_id: string;
  policy_id: string;
  applicant_data: object;
  review_reason: string[];
  status: 'pending' | 'in_review' | 'approved' | 'rejected';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  sla_deadline: Date;
  assigned_to: string;
  reviewed_by: string;
  reviewed_at: Date;
  review_decision: string;
  review_notes: string;
  created_at: Date;
}
```

#### 3.4.6 SLA Management
- **Configuration**: Per-policy SLA settings
- **Calculation**: Based on priority and business rules
- **Alerts**:
  - 50% of SLA elapsed: Warning
  - 80% of SLA elapsed: Critical
  - SLA breached: Escalation

#### 3.4.7 Activity Tracking
- **Table**: `review_activities`
- **Events**:
  - Review created
  - Assigned to reviewer
  - Status changed
  - Comment added
  - Decision submitted

---

### 3.5 Analytics & Reporting

#### 3.5.1 Dashboard Overview
- **Location**: `frontend/src/pages/Dashboard.tsx`
- **Widgets**:
  - Applications processed (24h, 7d, 30d)
  - Approval rate trend
  - Average processing time
  - Active policies
  - Connector health status
  - Manual review queue size

#### 3.5.2 Policy Analytics
- **Location**: `frontend/src/pages/Analytics.tsx`
- **File**: `backend/src/api/routes/analytics.routes.ts`
- **Metrics**:
  - **Decision Distribution**:
    - Approved: count & percentage
    - Rejected: count & percentage
    - Manual Review: count & percentage
  - **Approval Rate by Credit Score Band**:
    - 300-579: X% approved
    - 580-669: X% approved
    - 670-739: X% approved
    - 740-799: X% approved
    - 800-850: X% approved
  - **Processing Time**:
    - Average, median, P95, P99
    - By policy, by connector
  - **Top Rejection Reasons**:
    - Ranked by frequency
    - With examples
  - **Connector Performance**:
    - Success rate
    - Average latency
    - Error types

#### 3.5.3 Manual Review Analytics
- **Endpoint**: `GET /api/analytics/manual-reviews`
- **Metrics**:
  - Total reviews created
  - Reviews by status
  - Average review time
  - SLA compliance rate
  - Reviewer performance
  - Override rate (manual decision vs. auto decision)

#### 3.5.4 Real-Time Metrics
- **Endpoint**: `GET /api/analytics/realtime`
- **Features**:
  - Applications processed (last 1h)
  - Current approval rate
  - Active underwriting requests
  - System health indicators
  - Connector uptime

#### 3.5.5 Export Capabilities
- **Endpoint**: `GET /api/analytics/export`
- **Formats**:
  - CSV: For spreadsheet analysis
  - JSON: For programmatic access
  - PDF: For reports (future)
- **Data**:
  - Application-level details
  - Decision history
  - Execution traces
  - Audit logs

---

### 3.6 Authentication & Authorization

#### 3.6.1 User Authentication
- **File**: `backend/src/api/routes/auth.routes.ts`
- **Method**: JWT (JSON Web Tokens)
- **Endpoints**:
  - `POST /api/auth/login`: Email + password → JWT token
  - `POST /api/auth/register`: Create new user (admin only)
  - `POST /api/auth/logout`: Invalidate token
  - `GET /api/auth/me`: Get current user info
  - `POST /api/auth/change-password`: Update password

#### 3.6.2 Password Security
- **Hashing**: bcrypt with salt rounds (10)
- **Policy**:
  - Minimum 8 characters
  - Must include uppercase, lowercase, number (recommended)
  - No password reuse (future)

#### 3.6.3 Role-Based Access Control (RBAC)
- **Roles**:
  - `admin`: Full system access
  - `reviewer`: Access to manual review queue
  - `analyst`: Read-only analytics access
  - `developer`: API key management

- **Middleware**: `backend/src/api/middleware/auth.middleware.ts`
- **Usage**:
```typescript
router.get('/admin-only',
  authenticate,
  requireRole(['admin']),
  handler
);
```

#### 3.6.4 API Key Authentication
- **Purpose**: External system integration (LOS)
- **Creation**:
  - User generates API key in UI
  - Key is hashed (SHA-256) and stored
  - Original key shown once
- **Usage**:
  - Header: `X-API-Key: <api-key>`
  - Linked to specific policy
  - Rate limiting per key
  - Expiration date (optional)
- **File**: `backend/src/utils/encryption.ts:hashApiKey()`

#### 3.6.5 Session Management
- **Token Expiry**: 24 hours
- **Refresh**: Not implemented (logout + re-login required)
- **Storage**:
  - Frontend: localStorage (`auth_token`, `user`)
  - Backend: Stateless (JWT only)

#### 3.6.6 Frontend Auth Context
- **File**: `frontend/src/contexts/AuthContext.tsx`
- **Provides**:
  - `user`: Current user object
  - `isAuthenticated`: Boolean
  - `login()`: Login function
  - `logout()`: Logout function
  - `checkAuth()`: Validate token

---

### 3.7 API Integration

#### 3.7.1 Public API Endpoints

##### Underwriting API
- **Base URL**: `http://your-domain.com/api/v1/underwrite`
- **Authentication**: API Key (header)
- **Endpoints**:
  - `POST /:policy_id`: Submit application
  - `GET /status/:underwriting_id`: Check status
  - `GET /analytics`: Get performance metrics

##### Request Example
```bash
curl -X POST \
  https://api.example.com/api/v1/underwrite/policy-123 \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "application_id": "APP-001",
    "applicant": {
      "name": "John Doe",
      "email": "john@example.com",
      "ssn": "123-45-6789",
      "income": 75000,
      "credit_score": 720
    },
    "loan": {
      "amount": 50000,
      "term_months": 60,
      "purpose": "auto"
    }
  }'
```

##### Response Example
```json
{
  "success": true,
  "data": {
    "underwriting_id": "uw-123abc",
    "application_id": "APP-001",
    "decision": "approved",
    "decision_date": "2025-11-11T10:30:00Z",
    "policy_id": "policy-123",
    "execution_time_ms": 450,
    "confidence_score": 0.92,
    "reasons": [
      {
        "strategy": "Credit Check",
        "condition": "credit_score >= 700",
        "result": true,
        "message": "Applicant has excellent credit"
      }
    ]
  }
}
```

#### 3.7.2 Webhook Support (Future)
- **Purpose**: Notify external systems of decisions
- **Configuration**: Per-policy webhook URL
- **Retry Logic**: 3 attempts with exponential backoff
- **Signature**: HMAC-SHA256 for verification

#### 3.7.3 Rate Limiting
- **Library**: express-rate-limit
- **Default**: 100 requests per minute per API key
- **Configurable**: Per-key custom limits
- **Response**: 429 Too Many Requests

#### 3.7.4 API Documentation
- **Tool**: Swagger/OpenAPI
- **Location**: `http://your-domain.com/api-docs`
- **Features**:
  - Interactive API explorer
  - Request/response examples
  - Authentication guide
  - Error code reference

---

## 4. Feature Specifications

### 4.1 Policy Management

#### 4.1.1 Policy Lifecycle
1. **Draft**: Being edited, not yet valid
2. **Valid**: Passes validation, ready to publish
3. **Active**: Published and accepting requests
4. **Inactive**: Deactivated, no longer accepting requests
5. **Archived**: Historical record only

#### 4.1.2 Policy Operations
- **Location**: `frontend/src/pages/Policies.tsx`
- **File**: `backend/src/api/routes/policy.routes.ts`

##### List Policies
- `GET /api/policies`
- **Filters**: status, product_type, created_by
- **Sorting**: name, created_at, updated_at
- **Pagination**: page, limit

##### Create Policy
- `POST /api/policies`
- **Required**: name, workflow_json
- **Optional**: description, product_type

##### Update Policy
- `PUT /api/policies/:id`
- **Allowed**: name, description, workflow_json
- **Restricted**: Cannot update active policy (must deactivate first)

##### Activate/Deactivate
- `POST /api/policies/:id/activate`
- **Validation**: Must pass workflow validation
- **Effect**: Start/stop accepting underwriting requests

##### Clone Policy
- `POST /api/policies/:id/clone`
- **Purpose**: Create copy for testing/iteration
- **Result**: New policy with suffix "(Copy)"

##### Delete Policy
- `DELETE /api/policies/:id`
- **Soft Delete**: Sets `deleted_at` timestamp
- **Restriction**: Cannot delete active policy

#### 4.1.3 Policy Validation Rules
- **Must have exactly 1 START node**
- **All STRATEGY nodes must have at least 1 condition**
- **No orphaned nodes** (all nodes must be connected)
- **No circular dependencies**
- **All connector variables must exist**
- **All operators must be valid for data types**

### 4.2 Connector Management

#### 4.2.1 Connector Lifecycle
1. **Created**: Basic details entered
2. **Configured**: Authentication and endpoints set
3. **Tested**: Successfully executed test request
4. **Active**: Available for use in policies
5. **Inactive**: Temporarily disabled

#### 4.2.2 Connector Operations
- **Location**: `frontend/src/pages/Connectors.tsx`
- **File**: `backend/src/api/routes/connector.routes.ts`

##### List Connectors
- `GET /api/connectors`
- **Display**: Name, type, status, last tested

##### Create Connector
- `POST /api/connectors`
- **Required**: name, connector_type, base_url

##### Update Connector
- `PUT /api/connectors/:id`
- **Security**: Credentials are re-encrypted on update

##### Test Connector
- `POST /api/connectors/:id/test`
- **Purpose**: Verify connectivity and response format
- **Output**: Success/failure + raw response

##### Execute Connector
- `POST /api/connectors/:id/execute`
- **Purpose**: Run connector with real application data
- **Output**: Parsed response data

##### Store Manual Sample
- `POST /api/connectors/:id/sample`
- **Purpose**: Provide sample response for variable extraction
- **Use Case**: When live API is not available during setup

##### Refresh Variables
- `POST /api/connectors/:id/variables/refresh`
- **Purpose**: Re-extract variables from latest sample response
- **Trigger**: When API response structure changes

##### Get Connector Variables
- `GET /api/connectors/:id/variables`
- **Output**: List of all extractable variables
- **Used By**: Policy builder condition autocomplete

#### 4.2.3 Supported Connector Types
- **REST API**: Standard HTTP REST
- **GraphQL**: GraphQL query execution
- **SOAP**: XML-based SOAP services
- **Custom**: JavaScript function executor

### 4.3 Testing System

#### 4.3.1 Single Application Test
- **Location**: `frontend/src/components/policy-builder/modals/TestModal.tsx`
- **Input**: JSON object representing applicant data
- **Process**:
  1. Validate JSON format
  2. Execute workflow with test data
  3. Return decision + execution trace
- **Output**:
  - Final decision
  - Node-by-node results
  - Failed conditions
  - Execution time

#### 4.3.2 Bulk Testing
- **Location**: Same as above, file upload tab
- **Input**: XLSX/CSV file with multiple applications
- **Process**:
  1. Parse file
  2. For each row:
     - Convert to JSON
     - Execute workflow
     - Record result
  3. Generate summary report
- **Output**:
  - Total tests
  - Passed/failed counts
  - Decision distribution
  - Export detailed results

#### 4.3.3 Split-View Testing
- **Location**: `frontend/src/components/policy-builder/TestPanel.tsx`
- **Layout**:
  - Left (30%): JSON editor + run button
  - Right (70%): Live workflow canvas
- **Features**:
  - Real-time node coloring during execution
  - Step-by-step execution trace
  - Pause/resume execution
  - Export results

#### 4.3.4 Test Results Visualization
- **Location**: `frontend/src/components/policy-builder/TestResultsOverlay.tsx`
- **Display**:
  - Overlay on canvas
  - Color-coded nodes:
    - Green: Passed
    - Yellow: Manual check
    - Red: Failed/rejected
  - Click node to see detailed results
  - Export execution log

---

## 5. Technical Architecture

### 5.1 Frontend Architecture

#### 5.1.1 Project Structure
```
frontend/
├── src/
│   ├── components/
│   │   ├── policy-builder/
│   │   │   ├── Canvas.tsx              # React Flow canvas
│   │   │   ├── NodePalette.tsx         # Draggable node list
│   │   │   ├── PropertyPanel.tsx       # Node properties editor
│   │   │   ├── TestPanel.tsx           # Split-view test interface
│   │   │   ├── TestResultsOverlay.tsx  # Visual test results
│   │   │   ├── nodes/
│   │   │   │   ├── StartNode.tsx
│   │   │   │   └── StrategyNode.tsx
│   │   │   └── modals/
│   │   │       ├── ConditionBuilder.tsx
│   │   │       ├── StrategyConfigModal.tsx
│   │   │       ├── TestModal.tsx
│   │   │       └── VariableAutocomplete.tsx
│   │   ├── connectors/
│   │   │   ├── ConnectorForm.tsx
│   │   │   └── ConnectorDetails.tsx
│   │   ├── policies/
│   │   │   └── APIIntegrationPanel.tsx
│   │   └── Layout.tsx
│   ├── contexts/
│   │   └── AuthContext.tsx             # Auth state management
│   ├── hooks/
│   │   └── useProximitySnapping.ts     # Canvas snapping logic
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── Policies.tsx
│   │   ├── PolicyBuilder.tsx
│   │   ├── Connectors.tsx
│   │   ├── ManualReview.tsx
│   │   ├── Analytics.tsx
│   │   ├── APIKeys.tsx
│   │   ├── APIDocs.tsx
│   │   └── Login.tsx
│   ├── services/
│   │   ├── api.ts                      # Base axios config
│   │   ├── policyApi.ts
│   │   ├── connectorApi.ts
│   │   └── analyticsApi.ts
│   ├── stores/
│   │   └── policyBuilderStore.ts       # Zustand state
│   ├── App.tsx
│   └── main.tsx
├── index.html
├── vite.config.ts
├── tailwind.config.js
└── package.json
```

#### 5.1.2 State Management (Zustand)
- **File**: `frontend/src/stores/policyBuilderStore.ts`
- **State**:
  - `policyName`: string
  - `policyDescription`: string
  - `nodes`: Node[] (React Flow nodes)
  - `edges`: Edge[] (React Flow edges)
  - `selectedNode`: Node | null
  - `validationErrors`: ValidationError[]
  - `testResults`: TestResult | null
  - `isConfigModalOpen`: boolean
  - `isTestModalOpen`: boolean
- **Actions**:
  - `setPolicyMetadata()`
  - `loadPolicy()`
  - `clearPolicy()`
  - `addNode()`
  - `updateNode()`
  - `deleteNode()`
  - `addEdge()`
  - `deleteEdge()`
  - `validateWorkflow()`
  - `testPolicy()`
  - `openConfigModal()`
  - `closeConfigModal()`

#### 5.1.3 Routing
```typescript
<Routes>
  <Route path="/login" element={<Login />} />
  <Route path="/" element={<Layout />}>
    <Route index element={<Dashboard />} />
    <Route path="policies" element={<Policies />} />
    <Route path="policy-builder/:id?" element={<PolicyBuilder />} />
    <Route path="connectors" element={<Connectors />} />
    <Route path="manual-review" element={<ManualReview />} />
    <Route path="analytics" element={<Analytics />} />
    <Route path="api-keys" element={<APIKeys />} />
    <Route path="api-docs" element={<APIDocs />} />
  </Route>
</Routes>
```

#### 5.1.4 API Service Layer
- **Base Configuration**: `frontend/src/services/api.ts`
  - Axios instance with interceptors
  - Auto-attach JWT token from localStorage
  - Handle 401 errors (redirect to login)
  - Handle network errors gracefully

- **Policy API**: `frontend/src/services/policyApi.ts`
  - `getPolicies()`, `createPolicy()`, `updatePolicy()`, etc.

- **Connector API**: `frontend/src/services/connectorApi.ts`
  - `getConnectors()`, `testConnector()`, `refreshVariables()`, etc.

- **Analytics API**: `frontend/src/services/analyticsApi.ts`
  - `getOverviewAnalytics()`, `getPolicyAnalytics()`, etc.

### 5.2 Backend Architecture

#### 5.2.1 Project Structure
```
backend/
├── src/
│   ├── api/
│   │   ├── middleware/
│   │   │   └── auth.middleware.ts      # JWT + RBAC
│   │   └── routes/
│   │       ├── auth.routes.ts
│   │       ├── policy.routes.ts
│   │       ├── connector.routes.ts
│   │       ├── underwriting.routes.ts
│   │       ├── manual-review.routes.ts
│   │       └── analytics.routes.ts
│   ├── config/
│   │   ├── database.ts                 # PostgreSQL/Redis/MongoDB
│   │   └── env.ts                      # Environment validation
│   ├── connectors/
│   │   └── sample-responses.ts         # Mock data for testing
│   ├── database/
│   │   ├── migrations/                 # SQL migration files
│   │   └── run-migration-011.ts        # Migration runner
│   ├── services/
│   │   ├── underwriting.service.ts     # Main underwriting logic
│   │   ├── workflow-executor.service.ts # Workflow engine
│   │   └── connector-executor.service.ts # Connector execution
│   ├── scripts/
│   │   ├── generate-encryption-key.ts
│   │   ├── encrypt-existing-credentials.ts
│   │   └── test-end-to-end.ts
│   ├── utils/
│   │   ├── logger.ts                   # Winston logger
│   │   └── encryption.ts               # AES-256 encryption
│   ├── app.ts                          # Express app setup
│   └── server.ts                       # Server entry point
├── .env
├── tsconfig.json
└── package.json
```

#### 5.2.2 Middleware Stack
1. **helmet**: Security headers
2. **cors**: CORS configuration
3. **express.json()**: JSON body parsing
4. **express.urlencoded()**: Form data parsing
5. **morgan**: HTTP request logging
6. **express-rate-limit**: Rate limiting
7. **authenticate**: JWT verification (route-specific)
8. **requireRole**: RBAC enforcement (route-specific)

#### 5.2.3 Database Configuration
- **File**: `backend/src/config/database.ts`
- **PostgreSQL**:
  - Host: `aws-1-us-east-1.pooler.supabase.com`
  - Port: `5432` (direct connection)
  - Database: `postgres`
  - Connection pool: 20 max connections
  - SSL: Required (`rejectUnauthorized: false`)
- **Redis**:
  - Optional caching layer
  - Connection string from env
- **MongoDB**:
  - Optional document store
  - Connection string from env

#### 5.2.4 Error Handling
- **Global Error Handler**: Catches all unhandled errors
- **HTTP Error Format**:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": {}
  }
}
```

- **Logging**:
  - Winston logger
  - Log levels: error, warn, info, debug
  - Output: Console + file (`logs/app.log`)
  - Format: Timestamp, level, message, metadata

#### 5.2.5 Environment Configuration
- **File**: `backend/.env`
- **Required Variables**:
  - `NODE_ENV`: development | production
  - `PORT`: Server port (default: 3000)
  - `DATABASE_URL`: PostgreSQL connection string
  - `JWT_SECRET`: Secret for JWT signing
  - `ENCRYPTION_KEY`: AES-256 key for credentials
- **Optional Variables**:
  - `REDIS_URL`: Redis connection string
  - `MONGODB_URL`: MongoDB connection string
  - `LOG_LEVEL`: Logging verbosity

---

## 6. API Documentation

### 6.1 Authentication API

#### POST /api/auth/login
**Description**: Authenticate user and receive JWT token

**Request**:
```json
{
  "email": "admin@underwriting.com",
  "password": "admin123"
}
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "admin@underwriting.com",
      "full_name": "System Administrator",
      "role": "admin",
      "is_active": true
    },
    "token": "eyJhbGc...",
    "expiresIn": 86400
  }
}
```

#### GET /api/auth/me
**Description**: Get current authenticated user

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "admin@underwriting.com",
    "full_name": "System Administrator",
    "role": "admin",
    "is_active": true,
    "created_at": "2025-01-01T00:00:00Z"
  }
}
```

### 6.2 Policy API

#### GET /api/policies
**Description**: List all policies

**Query Parameters**:
- `status`: Filter by status (active, inactive, draft)
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

**Response** (200):
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Auto Loan Policy",
      "description": "Standard auto loan underwriting",
      "product_type": "auto_loan",
      "status": "active",
      "created_by": "uuid",
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-02T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3
  }
}
```

#### POST /api/policies
**Description**: Create a new policy

**Request**:
```json
{
  "name": "Personal Loan Policy",
  "description": "For personal loans up to $50k",
  "product_type": "personal_loan",
  "workflow_json": {
    "nodes": [...],
    "edges": [...]
  }
}
```

**Response** (201):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Personal Loan Policy",
    "status": "draft",
    "created_at": "2025-01-01T00:00:00Z"
  }
}
```

#### PUT /api/policies/:id
**Description**: Update existing policy

**Request**: Same as POST

**Response** (200): Same as POST

#### POST /api/policies/:id/activate
**Description**: Activate a policy (make it live)

**Response** (200):
```json
{
  "success": true,
  "message": "Policy activated successfully"
}
```

#### POST /api/policies/:id/clone
**Description**: Clone an existing policy

**Request**:
```json
{
  "name": "Auto Loan Policy v2",
  "description": "Updated version with new rules"
}
```

**Response** (201): Same as POST

### 6.3 Connector API

#### GET /api/connectors
**Description**: List all connectors

**Response** (200):
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Experian Credit Check",
      "connector_type": "rest_api",
      "base_url": "https://api.experian.com/v1",
      "status": "active",
      "last_tested_at": "2025-01-01T10:00:00Z",
      "created_at": "2025-01-01T00:00:00Z"
    }
  ]
}
```

#### POST /api/connectors
**Description**: Create a new connector

**Request**:
```json
{
  "name": "TransUnion Credit",
  "connector_type": "rest_api",
  "base_url": "https://api.transunion.com",
  "auth_type": "bearer_token",
  "auth_config": {
    "token": "your-api-token"
  },
  "request_config": {
    "method": "POST",
    "endpoint": "/credit-report",
    "headers": {
      "Content-Type": "application/json"
    },
    "body_template": {
      "ssn": "{{applicant.ssn}}",
      "name": "{{applicant.name}}"
    }
  },
  "response_config": {
    "path": "$.data",
    "mappings": [
      {
        "source_field": "credit_score",
        "target_variable": "credit_score",
        "data_type": "number"
      }
    ]
  }
}
```

**Response** (201):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "TransUnion Credit",
    "status": "active",
    "created_at": "2025-01-01T00:00:00Z"
  }
}
```

#### POST /api/connectors/:id/test
**Description**: Test connector connectivity

**Response** (200):
```json
{
  "success": true,
  "data": {
    "status": "success",
    "response_time_ms": 250,
    "response_data": {
      "credit_score": 750,
      "report_date": "2025-01-01"
    }
  }
}
```

#### GET /api/connectors/:id/variables
**Description**: Get all extractable variables from connector

**Response** (200):
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "variable_name": "credit_report.score",
      "variable_path": "$.credit_report.score",
      "data_type": "number",
      "description": "Credit score from bureau"
    },
    {
      "id": "uuid",
      "variable_name": "credit_report.delinquencies",
      "variable_path": "$.credit_report.delinquencies",
      "data_type": "number",
      "description": "Number of delinquent accounts"
    }
  ]
}
```

#### POST /api/connectors/:id/variables/refresh
**Description**: Re-extract variables from latest sample response

**Response** (200):
```json
{
  "success": true,
  "message": "Variables refreshed successfully",
  "data": {
    "variables_found": 25,
    "new_variables": 3,
    "updated_variables": 2
  }
}
```

### 6.4 Underwriting API

#### POST /api/v1/underwrite/:policy_id
**Description**: Submit application for underwriting

**Headers**: `X-API-Key: <api-key>`

**Request**:
```json
{
  "application_id": "APP-12345",
  "applicant": {
    "name": "John Doe",
    "ssn": "123-45-6789",
    "email": "john@example.com",
    "phone": "555-1234",
    "income": 75000,
    "employment_status": "employed",
    "employment_years": 5
  },
  "loan": {
    "amount": 50000,
    "term_months": 60,
    "purpose": "auto"
  },
  "async": false,
  "callback_url": "https://your-los.com/webhook"
}
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "underwriting_id": "uw-abc123",
    "application_id": "APP-12345",
    "policy_id": "policy-uuid",
    "decision": "approved",
    "decision_date": "2025-11-11T10:30:00Z",
    "confidence_score": 0.92,
    "execution_time_ms": 450,
    "reasons": [
      {
        "strategy": "Credit Check",
        "condition": "credit_report.score >= 700",
        "result": true,
        "value": 750,
        "message": "Credit score meets minimum requirement"
      },
      {
        "strategy": "Income Verification",
        "condition": "applicant.income >= 50000",
        "result": true,
        "value": 75000,
        "message": "Income sufficient for loan amount"
      }
    ],
    "manual_review_reasons": [],
    "connector_data": {
      "experian_credit": {
        "credit_score": 750,
        "delinquencies": 0,
        "inquiries_6m": 2
      }
    }
  }
}
```

**Response** (200 - Manual Review):
```json
{
  "success": true,
  "data": {
    "underwriting_id": "uw-abc123",
    "application_id": "APP-12345",
    "decision": "manual_review",
    "manual_review_id": "mr-xyz789",
    "manual_review_reasons": [
      "High debt-to-income ratio requires manual verification",
      "Recent credit inquiry requires explanation"
    ],
    "execution_time_ms": 420
  }
}
```

**Response** (200 - Rejected):
```json
{
  "success": true,
  "data": {
    "underwriting_id": "uw-abc123",
    "application_id": "APP-12345",
    "decision": "rejected",
    "rejection_reasons": [
      {
        "strategy": "Credit Check",
        "condition": "credit_report.score >= 700",
        "result": false,
        "value": 620,
        "message": "Credit score below minimum requirement"
      }
    ],
    "execution_time_ms": 380
  }
}
```

#### GET /api/v1/underwrite/status/:underwriting_id
**Description**: Check underwriting status

**Headers**: `X-API-Key: <api-key>`

**Response** (200):
```json
{
  "success": true,
  "data": {
    "underwriting_id": "uw-abc123",
    "application_id": "APP-12345",
    "status": "completed",
    "decision": "approved",
    "created_at": "2025-11-11T10:30:00Z",
    "completed_at": "2025-11-11T10:30:01Z"
  }
}
```

### 6.5 Manual Review API

#### GET /api/manual-review
**Description**: List all manual review applications

**Query Parameters**:
- `status`: pending, in_review, approved, rejected
- `priority`: low, normal, high, urgent
- `page`, `limit`

**Response** (200):
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "application_id": "APP-12345",
      "underwriting_id": "uw-abc123",
      "policy_id": "policy-uuid",
      "review_reason": [
        "High DTI ratio",
        "Recent credit inquiry"
      ],
      "status": "pending",
      "priority": "high",
      "sla_deadline": "2025-11-12T10:30:00Z",
      "created_at": "2025-11-11T10:30:00Z"
    }
  ]
}
```

#### GET /api/manual-review/:id
**Description**: Get detailed manual review information

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "application_id": "APP-12345",
    "applicant_data": { ... },
    "review_reason": [...],
    "status": "in_review",
    "priority": "high",
    "assigned_to": "reviewer-uuid",
    "activities": [
      {
        "id": "uuid",
        "user_name": "Jane Reviewer",
        "action": "assigned",
        "details": {},
        "created_at": "2025-11-11T11:00:00Z"
      }
    ]
  }
}
```

#### PUT /api/manual-review/:id/assign
**Description**: Assign review to a user

**Request**:
```json
{
  "userId": "reviewer-uuid"
}
```

**Response** (200):
```json
{
  "success": true,
  "message": "Review assigned successfully"
}
```

#### POST /api/manual-review/:id/complete
**Description**: Submit review decision

**Request**:
```json
{
  "decision": "approved",
  "notes": "Verified income through employer, DTI acceptable with documented assets",
  "approvedAmount": 50000,
  "conditions": [
    "Provide proof of auto insurance",
    "Verify employment before funding"
  ]
}
```

**Response** (200):
```json
{
  "success": true,
  "message": "Review completed successfully",
  "data": {
    "application_id": "APP-12345",
    "decision": "approved",
    "reviewed_by": "reviewer-uuid"
  }
}
```

### 6.6 Analytics API

#### GET /api/analytics/overview
**Description**: Get system-wide analytics

**Query Parameters**:
- `date_from`: ISO date
- `date_to`: ISO date

**Response** (200):
```json
{
  "success": true,
  "data": {
    "total_applications": 15420,
    "decisions": {
      "approved": 11850,
      "rejected": 2100,
      "manual_review": 1470
    },
    "approval_rate": 0.769,
    "avg_processing_time_ms": 450,
    "connector_health": {
      "experian": { "uptime": 0.998, "avg_latency_ms": 180 },
      "plaid": { "uptime": 0.995, "avg_latency_ms": 220 }
    }
  }
}
```

#### GET /api/analytics/policies/:policy_id
**Description**: Get policy-specific analytics

**Response** (200):
```json
{
  "success": true,
  "data": {
    "policy_id": "uuid",
    "policy_name": "Auto Loan Policy",
    "applications_processed": 5230,
    "approval_rate": 0.782,
    "avg_processing_time_ms": 420,
    "approval_by_credit_score": [
      { "score_band": "300-579", "approved": 15, "total": 250, "rate": 0.06 },
      { "score_band": "580-669", "approved": 850, "total": 1500, "rate": 0.567 },
      { "score_band": "670-739", "approved": 1200, "total": 1600, "rate": 0.75 },
      { "score_band": "740-799", "approved": 1300, "total": 1450, "rate": 0.897 },
      { "score_band": "800-850", "approved": 430, "total": 430, "rate": 1.0 }
    ],
    "top_rejection_reasons": [
      { "reason": "Credit score below 580", "count": 235 },
      { "reason": "DTI ratio exceeds 50%", "count": 180 },
      { "reason": "Recent bankruptcy", "count": 95 }
    ]
  }
}
```

---

## 7. User Workflows

### 7.1 Creating an Underwriting Policy

#### Step 1: Create Connectors
1. Navigate to **Connectors** page
2. Click **"New Connector"**
3. Enter connector details:
   - Name: "Experian Credit Check"
   - Type: REST API
   - Base URL: https://api.experian.com/v1
4. Configure authentication (API key)
5. Set up request template with variable placeholders
6. Provide sample response or execute test
7. Click **"Save"**
8. System automatically extracts variables
9. Click **"Refresh Variables"** if response structure changes

#### Step 2: Design Workflow
1. Navigate to **Policies** page
2. Click **"Create Policy"**
3. Enter policy name and description
4. Click **"Open Policy Builder"**
5. Drag START node onto canvas (auto-placed)
6. Drag STRATEGY node for first decision block
7. Double-click STRATEGY node to configure
8. In modal:
   - Enter strategy name: "Credit Check"
   - Add condition:
     - Left: Search and select `experian.credit_score`
     - Operator: `>=`
     - Right: `700`
     - Decision: `Approved`
   - Add another condition (OR):
     - Left: `experian.credit_score`
     - Operator: `>=`
     - Right: `650`
     - AND
     - Left: `applicant.income`
     - Operator: `>=`
     - Right: `60000`
     - Decision: `Manual Check`
   - Click **"Save"**
9. Connect START → STRATEGY node by dragging edge
10. Add more STRATEGY nodes for additional checks (DTI, employment, etc.)
11. Connect nodes sequentially
12. Click **"Validate"** to check for errors
13. Click **"Save"** to save draft

#### Step 3: Test Policy
1. In Policy Builder, click **"Test"**
2. Choose **"Single Test"** tab
3. Paste sample JSON:
```json
{
  "application_id": "TEST-001",
  "applicant": {
    "name": "Test User",
    "ssn": "123-45-6789",
    "income": 75000
  }
}
```
4. Click **"Run Test"**
5. Observe:
   - Each node turns green (passed), yellow (manual), or red (failed)
   - Results overlay shows decision + reasons
6. Click **"Switch to Split View"** for detailed testing
7. Iterate on conditions based on test results

#### Step 4: Publish Policy
1. Click **"Publish"** in Policy Builder
2. Confirm activation
3. Policy status changes to **"Active"**
4. Policy is now live and accepting API requests

### 7.2 Integrating with Loan Origination System (LOS)

#### Step 1: Generate API Key
1. Navigate to **API Keys** page
2. Click **"Generate New Key"**
3. Select policy to associate with key
4. Optionally set expiration date and rate limit
5. Click **"Generate"**
6. **Copy API key immediately** (shown only once)
7. Store securely in LOS configuration

#### Step 2: Implement API Call in LOS
```javascript
// Example: Node.js/JavaScript LOS integration

const axios = require('axios');

async function submitForUnderwriting(application) {
  try {
    const response = await axios.post(
      'https://api.your-underwriting-system.com/api/v1/underwrite/policy-uuid',
      {
        application_id: application.id,
        applicant: {
          name: application.borrower.fullName,
          ssn: application.borrower.ssn,
          email: application.borrower.email,
          income: application.borrower.annualIncome,
          // ... more fields
        },
        loan: {
          amount: application.loanAmount,
          term_months: application.termMonths,
          purpose: application.purpose,
        }
      },
      {
        headers: {
          'X-API-Key': process.env.UNDERWRITING_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    const { decision, underwriting_id, reasons } = response.data.data;

    if (decision === 'approved') {
      // Auto-approve in LOS
      await approveLoanApplication(application.id, underwriting_id);
    } else if (decision === 'manual_review') {
      // Flag for manual review
      await flagForManualReview(application.id, reasons);
    } else if (decision === 'rejected') {
      // Auto-decline in LOS
      await rejectLoanApplication(application.id, reasons);
    }

  } catch (error) {
    console.error('Underwriting API error:', error);
    // Fallback: Manual review
    await flagForManualReview(application.id, ['API error']);
  }
}
```

#### Step 3: Handle Webhook Callbacks (Future)
```javascript
// Express.js webhook endpoint
app.post('/webhook/underwriting', (req, res) => {
  const { underwriting_id, decision, application_id } = req.body;

  // Verify signature
  const signature = req.headers['x-webhook-signature'];
  if (!verifyWebhookSignature(req.body, signature)) {
    return res.status(401).send('Invalid signature');
  }

  // Update application status
  updateApplicationStatus(application_id, decision);

  res.status(200).send('OK');
});
```

### 7.3 Manual Review Workflow

#### Step 1: Reviewer Assignment
1. Reviewer logs into system
2. Navigates to **Manual Review** page
3. Sees queue of pending applications
4. Filters by:
   - Priority (urgent, high, normal, low)
   - SLA deadline (overdue first)
   - Assigned to me
5. Clicks **"Assign to Me"** on application
6. Status changes to **"In Review"**

#### Step 2: Application Review
1. Click application to open details
2. Review applicant data:
   - Personal information
   - Income details
   - Credit report data (from connectors)
   - Loan details
3. Review auto-decision context:
   - Which conditions passed/failed
   - Why manual review was triggered
4. Access original workflow visualization (read-only)
5. Add internal comment: "Verified employment via phone call"

#### Step 3: Make Decision
1. Click **"Complete Review"** button
2. In modal:
   - Select decision: Approved / Rejected
   - If approved:
     - Enter approved amount (can differ from requested)
     - Set interest rate (if applicable)
     - Add conditions: ["Verify auto insurance", "Employment verification"]
   - Enter review notes: Detailed explanation
3. Click **"Submit Decision"**
4. Decision logged with timestamp and reviewer ID
5. Application moves to **"Completed"** status
6. Webhook sent to LOS (if configured)

### 7.4 Analyzing Performance

#### Step 1: View Dashboard
1. Login and navigate to **Dashboard**
2. View high-level metrics:
   - Applications processed today
   - Current approval rate
   - Avg processing time
   - Active policies count
   - Manual review queue size

#### Step 2: Deep-Dive Analytics
1. Navigate to **Analytics** page
2. Select date range (last 7 days, 30 days, custom)
3. Select policy to analyze
4. View charts:
   - Approval rate trend (line chart)
   - Decision distribution (pie chart)
   - Approval by credit score band (bar chart)
   - Processing time distribution (histogram)
5. View top rejection reasons table
6. View connector performance metrics

#### Step 3: Export Data
1. Click **"Export"** button
2. Select format: CSV or JSON
3. Select data type:
   - Application-level details
   - Decision history
   - Execution traces
   - Audit logs
4. Click **"Download"**
5. Use exported data in Excel, BI tools, or data warehouse

---

## 8. Database Schema

### 8.1 Core Tables

#### users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL, -- admin, reviewer, analyst, developer
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### policies
```sql
CREATE TABLE policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  product_type VARCHAR(100), -- auto_loan, personal_loan, mortgage, etc.
  workflow_json JSONB NOT NULL, -- {nodes: [], edges: []}
  status VARCHAR(50) DEFAULT 'draft', -- draft, active, inactive, archived
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);
```

#### connectors
```sql
CREATE TABLE connectors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  connector_type VARCHAR(50) NOT NULL, -- rest_api, graphql, soap, custom
  base_url TEXT NOT NULL,
  auth_type VARCHAR(50), -- none, api_key, bearer_token, basic_auth, oauth2
  auth_config JSONB, -- Encrypted credentials
  request_config JSONB NOT NULL,
  response_config JSONB,
  timeout_ms INTEGER DEFAULT 5000,
  retry_attempts INTEGER DEFAULT 3,
  status VARCHAR(50) DEFAULT 'active',
  last_tested_at TIMESTAMP,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### connector_variables
```sql
CREATE TABLE connector_variables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connector_id UUID REFERENCES connectors(id) ON DELETE CASCADE,
  variable_name VARCHAR(255) NOT NULL, -- e.g., "credit_report.score"
  variable_path VARCHAR(500), -- JSONPath: "$.credit_report.score"
  data_type VARCHAR(50), -- string, number, boolean, object, array
  is_required BOOLEAN DEFAULT FALSE,
  default_value TEXT,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(connector_id, variable_name)
);
```

#### api_keys
```sql
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key_hash VARCHAR(255) UNIQUE NOT NULL, -- SHA-256 hash of key
  policy_id UUID REFERENCES policies(id),
  name VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  rate_limit INTEGER, -- requests per minute
  expires_at TIMESTAMP,
  last_used_at TIMESTAMP,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### underwriting_requests
```sql
CREATE TABLE underwriting_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  policy_id UUID REFERENCES policies(id),
  api_key_id UUID REFERENCES api_keys(id),
  application_id VARCHAR(255) NOT NULL,
  applicant_data JSONB NOT NULL,
  connector_data JSONB, -- Data fetched from connectors
  decision VARCHAR(50), -- approved, rejected, manual_review
  decision_date TIMESTAMP,
  execution_time_ms INTEGER,
  execution_log JSONB, -- Detailed trace
  status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);
```

#### manual_reviews
```sql
CREATE TABLE manual_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id VARCHAR(255) NOT NULL,
  underwriting_id UUID REFERENCES underwriting_requests(id),
  policy_id UUID REFERENCES policies(id),
  applicant_data JSONB NOT NULL,
  review_reason TEXT[], -- Array of reasons for manual review
  status VARCHAR(50) DEFAULT 'pending', -- pending, in_review, approved, rejected
  priority VARCHAR(50) DEFAULT 'normal', -- low, normal, high, urgent
  sla_deadline TIMESTAMP,
  assigned_to UUID REFERENCES users(id),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP,
  review_decision VARCHAR(50),
  review_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### review_activities
```sql
CREATE TABLE review_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id UUID REFERENCES manual_reviews(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL, -- assigned, comment, decision, status_change
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### audit_logs
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL, -- login, create_policy, update_connector, etc.
  resource_type VARCHAR(100), -- policy, connector, api_key, etc.
  resource_id UUID,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 8.2 Indexes
```sql
-- Performance indexes
CREATE INDEX idx_underwriting_requests_policy ON underwriting_requests(policy_id);
CREATE INDEX idx_underwriting_requests_application ON underwriting_requests(application_id);
CREATE INDEX idx_underwriting_requests_created_at ON underwriting_requests(created_at);
CREATE INDEX idx_manual_reviews_status ON manual_reviews(status);
CREATE INDEX idx_manual_reviews_assigned_to ON manual_reviews(assigned_to);
CREATE INDEX idx_connector_variables_connector ON connector_variables(connector_id);
CREATE INDEX idx_audit_logs_user_action ON audit_logs(user_id, action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
```

### 8.3 Migrations
All database migrations are located in `backend/src/database/migrations/`:

1. **001_extend_connector_schema.sql**: Initial connector tables
2. **008_create_connector_variables_tables.sql**: Variable extraction system
3. **009_add_execution_type.sql**: Add execution context fields
4. **010_encrypt_connector_credentials.sql**: Encrypt sensitive data
5. **011_create_manual_reviews_tables.sql**: Manual review workflow
6. **012_fix_manual_reviews_table.sql**: Schema fixes

---

## 9. Security & Compliance

### 9.1 Data Encryption

#### At Rest
- **Database**: PostgreSQL with encryption enabled (Supabase)
- **Credentials**: AES-256 encryption for connector auth configs
- **API Keys**: SHA-256 hashing before storage
- **File**: `backend/src/utils/encryption.ts`

#### In Transit
- **HTTPS**: All API traffic over TLS 1.2+
- **SSL**: Database connections require SSL
- **Headers**: Security headers via Helmet.js

### 9.2 Authentication & Authorization

#### User Authentication
- **Method**: JWT with 24-hour expiry
- **Password**: bcrypt with 10 salt rounds
- **Token Storage**: localStorage (frontend)

#### API Authentication
- **Method**: API key in header
- **Format**: `X-API-Key: <key>`
- **Rate Limiting**: Configurable per key

#### Role-Based Access Control
- **admin**: Full system access
- **reviewer**: Manual review queue only
- **analyst**: Read-only analytics
- **developer**: API key management

### 9.3 Audit Logging

#### Logged Events
- User login/logout
- Policy create/update/delete/activate
- Connector create/update/delete
- API key generation/revocation
- Manual review decisions
- Underwriting requests

#### Log Format
```json
{
  "user_id": "uuid",
  "action": "activate_policy",
  "resource_type": "policy",
  "resource_id": "policy-uuid",
  "details": {},
  "ip_address": "1.2.3.4",
  "user_agent": "Mozilla/5.0...",
  "timestamp": "2025-11-11T10:30:00Z"
}
```

### 9.4 Data Privacy

#### PII Handling
- **SSN**: Stored but never logged
- **Credit Data**: From connectors, stored in execution logs
- **Retention**: Configurable (default: 7 years for audit)

#### GDPR Compliance (Future)
- Right to access
- Right to deletion
- Data portability
- Consent management

### 9.5 Security Best Practices

#### Code
- Input validation (Joi schemas)
- Output sanitization
- SQL parameterization (no raw queries)
- CORS configuration
- Rate limiting

#### Infrastructure
- Environment variables for secrets
- No hardcoded credentials
- Least privilege database access
- Regular security updates

---

## 10. Deployment & Infrastructure

### 10.1 Architecture Components

#### Frontend
- **Hosting**: Netlify / Vercel / AWS S3 + CloudFront
- **Build**: `npm run build` in `frontend/`
- **Deployment**: Automatic on git push (CI/CD)

#### Backend
- **Hosting**: Render / Heroku / AWS EC2
- **Runtime**: Node.js 18+
- **Process Manager**: PM2 (production)
- **Port**: 3000 (configurable via PORT env var)

#### Database
- **Primary**: PostgreSQL on Supabase
- **Connection**: Direct connection on port 5432
- **Pooling**: 20 max connections
- **Backups**: Automated daily (Supabase)

#### Cache
- **Redis**: Optional, for caching frequently used data
- **Provider**: Redis Cloud / AWS ElastiCache

### 10.2 Environment Configuration

#### Backend Environment Variables
```bash
# Application
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://your-frontend.com

# Database
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
REDIS_URL=redis://host:6379
MONGODB_URL=mongodb://host:27017/db

# Security
JWT_SECRET=<generate-with-openssl-rand-base64-32>
ENCRYPTION_KEY=<generate-with-openssl-rand-base64-32>
SESSION_SECRET=<generate-with-openssl-rand-base64-32>

# LOS Integration
LOS_WEBHOOK_URL=https://your-los.com/api/webhook

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=./logs/app.log

# Feature Flags
ENABLE_ASYNC_PROCESSING=true
ENABLE_WEBHOOK_RETRIES=true
```

#### Frontend Environment Variables
```bash
VITE_API_URL=https://api.your-backend.com
VITE_ENVIRONMENT=production
```

### 10.3 Deployment Steps

#### Backend Deployment
```bash
# 1. Install dependencies
npm install

# 2. Build TypeScript
npm run build

# 3. Run migrations
npm run migrate

# 4. Start server
npm start

# Or with PM2
pm2 start dist/server.js --name underwriting-api
```

#### Frontend Deployment
```bash
# 1. Install dependencies
cd frontend && npm install

# 2. Build for production
npm run build

# 3. Deploy dist/ folder to hosting
# (Netlify/Vercel auto-deploy from git)
```

### 10.4 Health Monitoring

#### Health Check Endpoint
- **URL**: `GET /health`
- **Response**:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-11T10:30:00Z",
  "uptime": 86400.5,
  "environment": "production",
  "version": "1.0.0"
}
```

#### Monitoring Recommendations
- **APM**: New Relic / Datadog
- **Error Tracking**: Sentry
- **Logs**: Logtail / CloudWatch
- **Uptime**: Pingdom / UptimeRobot

### 10.5 Scaling Considerations

#### Horizontal Scaling
- **Backend**: Run multiple instances behind load balancer
- **State**: Stateless JWT auth (no session store needed)
- **Database**: Connection pooling handles concurrent requests

#### Vertical Scaling
- **Backend**: Increase CPU/RAM for Node.js process
- **Database**: Upgrade Supabase tier for more connections

#### Caching Strategy
- **Redis**: Cache connector responses (with TTL)
- **CDN**: Cache static frontend assets
- **HTTP Caching**: Cache-Control headers for analytics

---

## Conclusion

The AI Underwriting System is a production-ready, enterprise-grade platform for automating loan underwriting decisions. It combines:

- **Visual No-Code Interface**: Enabling non-technical users to design complex policies
- **Real-Time Decision Engine**: Sub-second underwriting via REST API
- **Flexible Integration**: Connect to any data provider via configurable connectors
- **Human Oversight**: Seamless manual review workflow for edge cases
- **Comprehensive Analytics**: Track performance, identify bottlenecks, optimize policies

### Key Metrics
- **Processing Time**: ~450ms average per application
- **Scalability**: Handles 100+ requests/sec per instance
- **Uptime**: 99.9% availability target
- **Connector Support**: Unlimited external API integrations

### Technology Highlights
- **Frontend**: React + TypeScript + React Flow
- **Backend**: Node.js + Express + PostgreSQL
- **Security**: JWT auth + AES-256 encryption + RBAC
- **Deployment**: Cloud-native, containerizable, horizontally scalable

This system is ready for production use and can be customized to meet specific business requirements.

---

**End of Document**
