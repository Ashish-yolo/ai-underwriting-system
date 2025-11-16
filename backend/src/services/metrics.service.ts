import logger from '../utils/logger';

// In-memory store for test executions (resets on server restart)
interface TestExecution {
  policyId: string;
  finalDecision: 'Approved' | 'Rejected' | 'Manual Review';
  timestamp: Date;
  executionTimeMs: number;
}

class MetricsService {
  private testExecutions: TestExecution[] = [];
  private readonly MAX_STORED_EXECUTIONS = 10000; // Keep last 10k executions

  /**
   * Record a test execution
   */
  recordTestExecution(execution: TestExecution): void {
    this.testExecutions.push(execution);

    // Keep only the most recent executions
    if (this.testExecutions.length > this.MAX_STORED_EXECUTIONS) {
      this.testExecutions = this.testExecutions.slice(-this.MAX_STORED_EXECUTIONS);
    }

    logger.info(`Test execution recorded: ${execution.finalDecision}`);
  }

  /**
   * Get realtime metrics for dashboard
   */
  getRealtimeMetrics() {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    // Filter executions
    const lastHourExecutions = this.testExecutions.filter(
      e => e.timestamp >= oneHourAgo
    );
    const lastFiveMinExecutions = this.testExecutions.filter(
      e => e.timestamp >= fiveMinutesAgo
    );

    // Count manual reviews (these become "active reviews")
    const manualReviews = lastHourExecutions.filter(
      e => e.finalDecision === 'Manual Review'
    );

    // Calculate overdue reviews (manual reviews older than 30 minutes)
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
    const overdueReviews = this.testExecutions.filter(
      e => e.finalDecision === 'Manual Review' && e.timestamp < thirtyMinutesAgo
    );

    return {
      applications_last_hour: lastHourExecutions.length,
      applications_last_5min: lastFiveMinExecutions.length,
      active_reviews: manualReviews.length,
      overdue_reviews: overdueReviews.length,
      timestamp: now.toISOString(),
      breakdown_last_hour: {
        approved: lastHourExecutions.filter(e => e.finalDecision === 'Approved').length,
        rejected: lastHourExecutions.filter(e => e.finalDecision === 'Rejected').length,
        manual_review: manualReviews.length,
      },
    };
  }

  /**
   * Get statistics for a specific time period
   */
  getStatsByPeriod(minutes: number) {
    const now = new Date();
    const periodStart = new Date(now.getTime() - minutes * 60 * 1000);

    const periodExecutions = this.testExecutions.filter(
      e => e.timestamp >= periodStart
    );

    return {
      total: periodExecutions.length,
      approved: periodExecutions.filter(e => e.finalDecision === 'Approved').length,
      rejected: periodExecutions.filter(e => e.finalDecision === 'Rejected').length,
      manual_review: periodExecutions.filter(e => e.finalDecision === 'Manual Review').length,
      avg_execution_time: periodExecutions.length > 0
        ? Math.round(periodExecutions.reduce((sum, e) => sum + e.executionTimeMs, 0) / periodExecutions.length)
        : 0,
    };
  }

  /**
   * Clear old executions (cleanup job)
   */
  cleanup(olderThanHours: number = 24): void {
    const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    const before = this.testExecutions.length;
    this.testExecutions = this.testExecutions.filter(e => e.timestamp >= cutoff);
    const removed = before - this.testExecutions.length;
    if (removed > 0) {
      logger.info(`Cleaned up ${removed} old test executions`);
    }
  }
}

export const metricsService = new MetricsService();

// Cleanup old executions every hour
setInterval(() => {
  metricsService.cleanup(24); // Keep last 24 hours
}, 60 * 60 * 1000);
