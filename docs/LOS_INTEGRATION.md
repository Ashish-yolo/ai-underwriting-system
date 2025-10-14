# LOS Integration Guide

Complete guide for integrating the AI Underwriting System with your intelligent-loan-platform at `https://new-age-los.netlify.app`.

## Integration Architecture

```
┌─────────────────────────────┐        ┌──────────────────────────────┐
│                             │        │                              │
│  Intelligent Loan Platform  │◄──────►│  AI Underwriting System      │
│  (new-age-los.netlify.app)  │        │  (underwriting-api.com)      │
│                             │        │                              │
└─────────────────────────────┘        └──────────────────────────────┘
         │                                        │
         │ 1. POST /underwrite                    │
         ├───────────────────────────────────────►│
         │    (Application Data)                  │
         │                                        │
         │ 2. Immediate Response OR               │
         │    (decision: approved/rejected/       │
         │     manual_review)                     │
         │◄───────────────────────────────────────┤
         │                                        │
         │ 3. Webhook Callback (async)            │
         │    (final decision)                    │
         │◄───────────────────────────────────────┤
         │                                        │
```

## Prerequisites

1. AI Underwriting System deployed and running
2. Policy created and activated
3. API key generated for production
4. Webhook endpoint configured in LOS

## Step 1: Deploy Underwriting System

### Option A: Using Existing Instance
If the underwriting system is already deployed at a URL:
- Base URL: `https://your-underwriting-api.com`
- API Endpoint: `https://your-underwriting-api.com/api/v1/underwrite/{policy_id}`

### Option B: Deploy Yourself
```bash
# On your server
cd underwriting-system
docker-compose up -d
npm run migrate
npm run build
npm start
```

## Step 2: Create and Activate Policy

Use the admin panel or API:

```bash
# 1. Login
curl -X POST https://your-underwriting-api.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@underwriting.com", "password": "your-password"}'

# Save the token

# 2. Create Policy (see QUICKSTART.md for detailed workflow JSON)
curl -X POST https://your-underwriting-api.com/api/policies \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d @personal-loan-policy.json

# 3. Deploy to Production and Get API Key
curl -X POST https://your-underwriting-api.com/api/deployment/deploy \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "policy_id": "YOUR_POLICY_ID",
    "environment": "production"
  }'

# Save the API key securely!
```

## Step 3: Configure Webhook in LOS

In your intelligent-loan-platform, add this webhook endpoint:

```javascript
// LOS Backend: routes/underwriting-webhook.js

router.post('/api/underwriting/callback', async (req, res) => {
  try {
    // Verify webhook signature
    const signature = req.headers['x-webhook-signature'];
    const expectedSignature = crypto
      .createHmac('sha256', process.env.UNDERWRITING_WEBHOOK_SECRET)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (signature !== expectedSignature) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const {
      underwriting_id,
      application_id,
      decision,
      reason,
      details,
      timestamp
    } = req.body;

    // Find application in LOS database
    const application = await Application.findOne({
      where: { id: application_id }
    });

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Update application based on decision
    if (decision === 'approved') {
      await application.update({
        status: 'approved',
        underwriting_decision: decision,
        underwriting_reason: reason,
        approved_amount: details.approved_amount || application.loan_amount,
        interest_rate: details.suggested_interest_rate,
        approved_at: new Date(timestamp),
        approved_by: 'underwriting_system'
      });

      // Trigger next step (loan disbursement)
      await triggerLoanDisbursal(application);

      // Send approval notification to applicant
      await sendApprovalEmail(application);

    } else if (decision === 'rejected') {
      await application.update({
        status: 'rejected',
        underwriting_decision: decision,
        underwriting_reason: reason,
        rejected_at: new Date(timestamp),
        rejected_by: 'underwriting_system'
      });

      // Send rejection notification
      await sendRejectionEmail(application, reason);

    } else if (decision === 'manual_review') {
      await application.update({
        status: 'under_review',
        underwriting_decision: decision,
        underwriting_reason: reason,
        review_required_at: new Date(timestamp)
      });

      // Notify underwriting team
      await notifyUnderwritingTeam(application);
    }

    // Log the decision
    await AuditLog.create({
      application_id: application.id,
      action: 'underwriting_decision',
      decision: decision,
      details: { underwriting_id, reason, details },
      timestamp: new Date(timestamp)
    });

    res.status(200).json({ received: true });

  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Processing failed' });
  }
});
```

## Step 4: Implement Underwriting Call from LOS

When a loan application is submitted:

```javascript
// LOS Backend: services/underwriting.service.js

const axios = require('axios');

const UNDERWRITING_API_URL = process.env.UNDERWRITING_API_URL;
const UNDERWRITING_API_KEY = process.env.UNDERWRITING_API_KEY;
const UNDERWRITING_POLICY_ID = process.env.UNDERWRITING_POLICY_ID;

async function submitForUnderwriting(application) {
  try {
    const response = await axios.post(
      `${UNDERWRITING_API_URL}/api/v1/underwrite/${UNDERWRITING_POLICY_ID}`,
      {
        application_id: application.id,
        applicant: {
          name: application.applicant_name,
          age: application.age,
          pan: application.pan_number,
          aadhaar: application.aadhaar_number,
          mobile: application.mobile_number,
          email: application.email,
          monthly_income: application.monthly_income,
          employment_type: application.employment_type,
          company_name: application.company_name,
          work_experience_years: application.work_experience_years,
          requested_loan_amount: application.loan_amount,
          loan_tenure_months: application.loan_tenure_months,
          purpose: application.loan_purpose,
          existing_loans: application.existing_loans || 0,
          existing_emi: application.existing_emi || 0,
          credit_score: application.credit_score, // if already fetched
        },
        metadata: {
          source: 'los',
          timestamp: new Date().toISOString(),
          los_version: '1.0',
          branch_code: application.branch_code,
          loan_officer_id: application.assigned_to,
        },
        callback_url: `${process.env.LOS_BASE_URL}/api/underwriting/callback`
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': UNDERWRITING_API_KEY,
          'X-Request-ID': generateRequestId(),
        },
        timeout: 30000, // 30 seconds
      }
    );

    const { decision, underwriting_id, reason, details } = response.data;

    // Update application with underwriting result
    await application.update({
      underwriting_id: underwriting_id,
      underwriting_status: decision,
      underwriting_reason: reason,
      underwriting_details: details,
      underwriting_completed_at: new Date(),
    });

    // Handle immediate decisions
    if (decision === 'approved') {
      await handleImmediateApproval(application, details);
    } else if (decision === 'rejected') {
      await handleImmediateRejection(application, reason);
    } else if (decision === 'manual_review') {
      await handleManualReview(application, reason);
    }

    return {
      success: true,
      decision,
      underwriting_id,
    };

  } catch (error) {
    console.error('Underwriting submission error:', error);

    // Handle errors gracefully
    if (error.response?.status === 429) {
      // Rate limited - retry after delay
      await sleep(5000);
      return submitForUnderwriting(application);
    }

    // Mark for manual review on error
    await application.update({
      status: 'pending_manual_review',
      underwriting_error: error.message,
    });

    return {
      success: false,
      error: error.message,
    };
  }
}

module.exports = { submitForUnderwriting };
```

## Step 5: Add to Application Flow

Integrate underwriting into your application submission flow:

```javascript
// LOS Backend: controllers/application.controller.js

router.post('/api/applications', authenticate, async (req, res) => {
  try {
    // 1. Create application in LOS database
    const application = await Application.create({
      ...req.body,
      status: 'submitted',
      submitted_at: new Date(),
    });

    // 2. Submit to underwriting system
    const underwritingResult = await submitForUnderwriting(application);

    // 3. Return response to frontend
    res.json({
      success: true,
      application_id: application.id,
      underwriting_status: underwritingResult.decision,
      message: 'Application submitted successfully',
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});
```

## Step 6: Environment Variables in LOS

Add these to your LOS `.env` file:

```bash
# Underwriting System Integration
UNDERWRITING_API_URL=https://your-underwriting-api.com
UNDERWRITING_API_KEY=uw_your_api_key_here
UNDERWRITING_POLICY_ID=your_policy_id
UNDERWRITING_WEBHOOK_SECRET=your_webhook_secret
LOS_BASE_URL=https://new-age-los.netlify.app
```

## Step 7: Test Integration

### Test 1: Automatic Approval
```javascript
// Test data for approval
const testApproval = {
  applicant_name: 'Test Approve User',
  age: 30,
  pan_number: 'AAAAA1111A',
  monthly_income: 75000,
  employment_type: 'salaried',
  work_experience_years: 5,
  loan_amount: 300000,
  loan_tenure_months: 36,
  existing_loans: 0,
};

// Submit and expect immediate approval
const result = await submitApplication(testApproval);
console.log(result.underwriting_status); // Should be 'approved'
```

### Test 2: Automatic Rejection
```javascript
// Test data for rejection
const testRejection = {
  applicant_name: 'Test Reject User',
  age: 19, // Below minimum age
  pan_number: 'BBBBB2222B',
  monthly_income: 20000,
  employment_type: 'salaried',
  loan_amount: 500000,
};

// Submit and expect immediate rejection
const result = await submitApplication(testRejection);
console.log(result.underwriting_status); // Should be 'rejected'
```

### Test 3: Manual Review
```javascript
// Test data for manual review
const testReview = {
  applicant_name: 'Test Review User',
  age: 28,
  pan_number: 'CCCCC3333C',
  monthly_income: 45000,
  employment_type: 'self_employed', // Might need review
  work_experience_years: 1, // Short history
  loan_amount: 450000,
};

// Submit and expect manual review
const result = await submitApplication(testReview);
console.log(result.underwriting_status); // Should be 'manual_review'
```

## Step 8: Monitor Integration

Add monitoring and logging:

```javascript
// LOS Backend: Monitor underwriting performance

async function getUnderwritingStats() {
  const stats = await Application.aggregate([
    {
      $match: {
        submitted_at: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }
    },
    {
      $group: {
        _id: '$underwriting_status',
        count: { $sum: 1 },
        avg_time: { $avg: '$underwriting_time_ms' }
      }
    }
  ]);

  return stats;
}

// Dashboard endpoint
router.get('/api/admin/underwriting-stats', authenticate, requireAdmin, async (req, res) => {
  const stats = await getUnderwritingStats();
  res.json({ success: true, data: stats });
});
```

## Troubleshooting

### Issue: Webhook not received

**Check:**
1. Webhook URL is accessible from internet
2. Firewall allows incoming connections
3. SSL certificate is valid
4. Signature verification is correct

**Debug:**
```bash
# Test webhook endpoint
curl -X POST https://new-age-los.netlify.app/api/underwriting/callback \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: test" \
  -d '{"test": true}'
```

### Issue: Rate limiting

**Solution:**
Contact underwriting system admin to increase rate limit for your API key.

### Issue: Timeout errors

**Solution:**
Increase timeout to 60 seconds:
```javascript
timeout: 60000
```

And use async mode:
```javascript
{
  ...,
  async: true,
  callback_url: "your_webhook_url"
}
```

## Production Checklist

- [ ] Underwriting system deployed and stable
- [ ] Policy tested with at least 100 test cases
- [ ] API key secured in environment variables (not in code!)
- [ ] Webhook signature verification implemented
- [ ] Error handling and retry logic in place
- [ ] Monitoring and alerting configured
- [ ] Logs configured and accessible
- [ ] Rate limits understood and acceptable
- [ ] Failover plan documented
- [ ] Team trained on manual review process
- [ ] Integration tested with production-like data
- [ ] Performance benchmarks met (<5s response time)

## Support

For integration issues:
- Email: integration-support@underwriting.com
- Slack: #underwriting-integration
- Documentation: https://docs.underwriting.com

---

**Integration Complete!** 🎉

Your LOS is now integrated with the AI Underwriting System for automated loan decisioning!
