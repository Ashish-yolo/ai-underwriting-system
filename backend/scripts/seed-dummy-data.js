const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres.glejgqtveeywjppbsxxv:Ashi08gmail.com@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true',
  ssl: {
    rejectUnauthorized: false
  }
});

async function seedDummyData() {
  const client = await pool.connect();

  try {
    console.log('🌱 Starting to seed dummy data...');

    // Get or create a test user
    let userId;
    const userResult = await client.query(
      "SELECT id FROM users WHERE email = 'test@example.com' LIMIT 1"
    );

    if (userResult.rows.length > 0) {
      userId = userResult.rows[0].id;
      console.log('✅ Using existing test user');
    } else {
      const newUser = await client.query(
        "INSERT INTO users (email, password_hash, full_name, role) VALUES ($1, $2, $3, $4) RETURNING id",
        ['test@example.com', 'dummy_hash', 'Test User', 'admin']
      );
      userId = newUser.rows[0].id;
      console.log('✅ Created test user');
    }

    // Get or create a test policy
    let policyId;
    const policyResult = await client.query(
      "SELECT id FROM policies WHERE name = 'Test Policy' LIMIT 1"
    );

    if (policyResult.rows.length > 0) {
      policyId = policyResult.rows[0].id;
      console.log('✅ Using existing test policy');
    } else {
      const newPolicy = await client.query(
        "INSERT INTO policies (name, description, status, workflow_json, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING id",
        [
          'Test Policy',
          'Test policy for dummy data',
          'active',
          JSON.stringify({ blocks: [] }),
          userId
        ]
      );
      policyId = newPolicy.rows[0].id;
      console.log('✅ Created test policy');
    }

    // Generate dummy api_requests for the last 30 days
    console.log('📊 Generating dummy API requests...');

    const decisions = ['approved', 'rejected', 'manual_review'];
    const creditScores = [580, 620, 650, 680, 700, 720, 750, 780, 800, 820];

    // Batch insert for better performance
    const batchSize = 100;
    const values = [];
    let totalRequests = 0;

    for (let day = 30; day >= 0; day--) {
      // Random number of requests per day (10-50)
      const requestsPerDay = Math.floor(Math.random() * 40) + 10;

      for (let i = 0; i < requestsPerDay; i++) {
        const creditScore = creditScores[Math.floor(Math.random() * creditScores.length)];
        const decision = decisions[Math.floor(Math.random() * decisions.length)];
        const executionTime = Math.floor(Math.random() * 500) + 50; // 50-550ms

        const createdAt = new Date();
        createdAt.setDate(createdAt.getDate() - day);
        createdAt.setHours(Math.floor(Math.random() * 24));
        createdAt.setMinutes(Math.floor(Math.random() * 60));

        const requestData = {
          applicant: {
            first_name: 'John',
            last_name: 'Doe',
            credit_score: creditScore,
            income: Math.floor(Math.random() * 150000) + 30000,
          },
          loan: {
            amount: Math.floor(Math.random() * 500000) + 10000,
            purpose: 'home',
          },
        };

        const responseData = {
          decision,
          confidence: Math.random() * 0.3 + 0.7,
          reasons: ['Credit score check', 'Income verification'],
        };

        values.push([
          JSON.stringify(requestData),
          JSON.stringify(responseData),
          decision,
          policyId,
          executionTime,
          createdAt,
        ]);

        totalRequests++;

        // Insert in batches
        if (values.length >= batchSize) {
          const placeholders = values.map((_, idx) => {
            const base = idx * 6;
            return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6})`;
          }).join(', ');

          await client.query(
            `INSERT INTO api_requests
             (request_data, response_data, decision, policy_id, execution_time_ms, created_at)
             VALUES ${placeholders}`,
            values.flat()
          );

          console.log(`  Inserted ${values.length} requests...`);
          values.length = 0; // Clear array
        }
      }
    }

    // Insert remaining records
    if (values.length > 0) {
      const placeholders = values.map((_, idx) => {
        const base = idx * 6;
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6})`;
      }).join(', ');

      await client.query(
        `INSERT INTO api_requests
         (request_data, response_data, decision, policy_id, execution_time_ms, created_at)
         VALUES ${placeholders}`,
        values.flat()
      );

      console.log(`  Inserted ${values.length} requests...`);
    }

    console.log(`✅ Generated ${totalRequests} API requests for last 30 days`);

    // Generate some manual reviews
    console.log('📝 Generating manual reviews...');

    const manualReviewResult = await client.query(
      `SELECT id, request_data, created_at FROM api_requests WHERE decision = 'manual_review' ORDER BY RANDOM() LIMIT 20`
    );

    for (const row of manualReviewResult.rows) {
      const rand = Math.random();
      let status, finalDecision, reviewerNotes, reviewedAt;

      if (rand > 0.6) {
        // 40% approved
        status = 'approved';
        finalDecision = 'approved';
        reviewerNotes = 'Application reviewed and approved. All criteria met.';
        reviewedAt = new Date(row.created_at);
        reviewedAt.setDate(reviewedAt.getDate() + Math.floor(Math.random() * 3) + 1);
      } else if (rand > 0.3) {
        // 30% rejected
        status = 'rejected';
        finalDecision = 'rejected';
        reviewerNotes = 'Application rejected due to insufficient documentation.';
        reviewedAt = new Date(row.created_at);
        reviewedAt.setDate(reviewedAt.getDate() + Math.floor(Math.random() * 3) + 1);
      } else if (rand > 0.15) {
        // 15% in_review
        status = 'in_review';
        finalDecision = null;
        reviewerNotes = 'Currently under review by underwriter.';
        reviewedAt = null;
      } else {
        // 15% pending
        status = 'pending';
        finalDecision = null;
        reviewerNotes = 'Awaiting review assignment.';
        reviewedAt = null;
      }

      await client.query(
        `INSERT INTO manual_reviews
         (application_id, policy_id, applicant_data, assigned_to, status, final_decision, reviewer_notes, reviewed_at, created_at, review_reason)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          'APP-' + row.id.slice(0, 8),
          policyId,
          row.request_data,
          userId,
          status,
          finalDecision,
          reviewerNotes,
          reviewedAt,
          row.created_at,
          'Manual review required for borderline credit score'
        ]
      );
    }

    console.log('✅ Generated manual reviews');

    // Get statistics
    const stats = await client.query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN decision = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN decision = 'rejected' THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN decision = 'manual_review' THEN 1 ELSE 0 END) as manual_review
      FROM api_requests
    `);

    console.log('');
    console.log('📈 Summary:');
    console.log(`  Total Requests: ${stats.rows[0].total}`);
    console.log(`  Approved: ${stats.rows[0].approved}`);
    console.log(`  Rejected: ${stats.rows[0].rejected}`);
    console.log(`  Manual Review: ${stats.rows[0].manual_review}`);
    console.log('');
    console.log('🎉 Dummy data seeded successfully!');
    console.log('');
    console.log('You can now:');
    console.log('  1. Visit http://localhost:5173/analytics to see the dashboard');
    console.log('  2. Visit http://localhost:5173/manual-review to see reviews');
    console.log('  3. Visit http://localhost:5173/connectors to manage connectors');

  } catch (error) {
    console.error('❌ Seed failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the seed
seedDummyData();
