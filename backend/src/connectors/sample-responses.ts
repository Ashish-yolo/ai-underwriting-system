/**
 * Sample connector responses for testing and development
 * These can be used to populate the connector variables system without requiring live API connections
 */

export const SAMPLE_EXPERIAN_RESPONSE = {
  status: "success",
  data: {
    applicant_id: "APP12345",
    score: 750,
    score_factors: {
      payment_history: "excellent",
      credit_utilization: 35.5,
      credit_age_months: 84,
      total_inquiries: 2
    },
    credit_profile: {
      total_accounts: 5,
      active_accounts: 3,
      closed_accounts: 2,
      overdue_accounts: 0,
      delinquent_accounts: 0
    },
    account_summary: {
      total_credit_limit: 500000,
      total_outstanding: 177500,
      total_emi: 15000
    },
    payment_history: {
      on_time_payments: 95.5,
      late_payments_30_days: 1,
      late_payments_60_days: 0,
      late_payments_90_days: 0
    },
    inquiries: {
      last_6_months: 1,
      last_12_months: 2,
      last_24_months: 3
    },
    risk_indicators: {
      defaults: 0,
      settlements: 0,
      write_offs: 0,
      suits_filed: 0
    }
  },
  timestamp: "2024-11-09T10:30:00Z"
};

export const SAMPLE_BANK_STATEMENT_RESPONSE = {
  status: "success",
  data: {
    account_holder: "John Doe",
    account_number_masked: "XXXX1234",
    analysis_period: {
      start_date: "2024-05-01",
      end_date: "2024-10-31",
      months: 6
    },
    balance_analysis: {
      average_monthly_balance: 125000,
      minimum_balance: 45000,
      maximum_balance: 235000,
      current_balance: 156000,
      closing_balance_trend: "increasing"
    },
    income_analysis: {
      average_monthly_credits: 180000,
      salary_credits: 150000,
      other_credits: 30000,
      total_credits_6m: 1080000,
      regular_income_detected: true,
      income_stability_score: 85
    },
    expense_analysis: {
      average_monthly_debits: 142000,
      loan_emi_payments: 35000,
      utility_payments: 12000,
      credit_card_payments: 18000,
      other_debits: 77000,
      total_debits_6m: 852000
    },
    cash_flow: {
      average_monthly_surplus: 38000,
      debt_to_income_ratio: 19.4,
      bounce_count: 0,
      return_cheque_count: 1
    },
    loan_indicators: {
      existing_emi_detected: true,
      total_emi_amount: 35000,
      emi_to_income_ratio: 19.4,
      irregular_emi_payments: 0
    },
    transaction_patterns: {
      gambling_transactions: 0,
      high_risk_merchants: 2,
      international_transactions: 5,
      cash_withdrawals_monthly: 25000
    },
    risk_flags: {
      frequent_overdrafts: false,
      excessive_bounces: false,
      irregular_income: false,
      high_cash_dependency: false
    }
  },
  timestamp: "2024-11-09T10:30:00Z"
};

export const SAMPLE_GST_RESPONSE = {
  status: "success",
  data: {
    gstin: "29ABCDE1234F1Z5",
    legal_name: "ABC Private Limited",
    trade_name: "ABC Corp",
    registration_date: "2018-03-15",
    status: "Active",
    taxpayer_type: "Regular",
    business_details: {
      principal_place: {
        state: "Karnataka",
        city: "Bangalore",
        pincode: "560001"
      },
      constitution_of_business: "Private Limited Company",
      nature_of_business: ["Manufacturing", "Trading"]
    },
    filing_compliance: {
      last_filing_date: "2024-10-20",
      filing_frequency: "Monthly",
      returns_filed_last_12m: 12,
      returns_expected_last_12m: 12,
      compliance_rating: 100,
      default_count: 0
    },
    turnover_analysis: {
      annual_turnover_fy_2023_24: 12500000,
      annual_turnover_fy_2022_23: 10200000,
      turnover_growth_percent: 22.5,
      average_monthly_turnover: 1041667
    },
    tax_analysis: {
      total_tax_paid_last_12m: 1875000,
      average_monthly_tax: 156250,
      input_tax_credit_claimed: 625000,
      effective_tax_rate: 15
    },
    return_summary: {
      gstr1_filed_on_time: 12,
      gstr3b_filed_on_time: 12,
      late_filings: 0,
      nil_returns: 0
    },
    risk_indicators: {
      cancellation_history: false,
      suspension_history: false,
      pending_litigation: false,
      address_mismatch: false
    },
    business_stability: {
      years_in_operation: 6,
      turnover_consistency_score: 88,
      filing_discipline_score: 100,
      overall_stability_score: 92
    }
  },
  timestamp: "2024-11-09T10:30:00Z"
};

export const SAMPLE_CIBIL_RESPONSE = {
  status: "success",
  data: {
    applicant_id: "APP12345",
    score: 780,
    score_range: "750-900",
    score_grade: "Excellent",
    report_date: "2024-11-09",
    account_summary: {
      total_accounts: 8,
      active_accounts: 5,
      closed_accounts: 3,
      overdue_accounts: 0
    },
    credit_mix: {
      secured_accounts: 3,
      unsecured_accounts: 5,
      secured_amount: 2500000,
      unsecured_amount: 450000
    },
    loan_details: {
      home_loan: {
        sanctioned_amount: 2000000,
        outstanding_amount: 1650000,
        emi: 18000,
        status: "Regular"
      },
      car_loan: {
        sanctioned_amount: 500000,
        outstanding_amount: 125000,
        emi: 12000,
        status: "Regular"
      },
      credit_cards: {
        total_limit: 450000,
        utilized_amount: 135000,
        utilization_percent: 30
      }
    },
    payment_history: {
      months_reviewed: 36,
      on_time_percentage: 97.2,
      dpd_30_count: 1,
      dpd_60_count: 0,
      dpd_90_count: 0,
      dpd_90_plus_count: 0
    },
    enquiries: {
      last_30_days: 0,
      last_90_days: 1,
      last_180_days: 2,
      last_12_months: 3
    },
    age_of_credit: {
      oldest_account_months: 96,
      newest_account_months: 12,
      average_account_age_months: 48
    },
    derogatory_info: {
      settled_accounts: 0,
      written_off_accounts: 0,
      suits_filed: 0,
      wilful_default: false
    }
  },
  timestamp: "2024-11-09T10:30:00Z"
};

export const SAMPLE_PAN_VERIFICATION_RESPONSE = {
  status: "success",
  data: {
    pan_number: "ABCDE1234F",
    name_on_pan: "JOHN DOE",
    category: "Individual",
    status: "Valid",
    verification_details: {
      pan_exists: true,
      pan_active: true,
      name_match_score: 100
    },
    additional_info: {
      aadhaar_linked: true,
      date_of_birth: "1985-05-15",
      gender: "M"
    }
  },
  timestamp: "2024-11-09T10:30:00Z"
};

export const SAMPLE_AADHAAR_VERIFICATION_RESPONSE = {
  status: "success",
  data: {
    aadhaar_masked: "XXXX-XXXX-1234",
    full_name: "John Doe",
    date_of_birth: "15-05-1985",
    gender: "M",
    address: {
      house: "123",
      street: "MG Road",
      landmark: "Near City Center",
      locality: "Indiranagar",
      city: "Bangalore",
      district: "Bangalore Urban",
      state: "Karnataka",
      pincode: "560038"
    },
    verification_status: "Verified",
    mobile_verified: true,
    email_verified: true
  },
  timestamp: "2024-11-09T10:30:00Z"
};

// Helper function to get sample response by connector type
export function getSampleResponse(connectorType: string): any {
  const sampleMap: Record<string, any> = {
    experian: SAMPLE_EXPERIAN_RESPONSE,
    bank_statement: SAMPLE_BANK_STATEMENT_RESPONSE,
    gst: SAMPLE_GST_RESPONSE,
    cibil: SAMPLE_CIBIL_RESPONSE,
    pan: SAMPLE_PAN_VERIFICATION_RESPONSE,
    aadhaar: SAMPLE_AADHAAR_VERIFICATION_RESPONSE,
  };

  return sampleMap[connectorType.toLowerCase()] || SAMPLE_EXPERIAN_RESPONSE;
}
