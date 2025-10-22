const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface Policy {
  id: string;
  name: string;
  description: string;
  workflow: {
    nodes: any[];
    edges: any[];
  };
  version: number;
  status: string;
  created_at: string;
  updated_at: string;
}

const getAuthToken = (): string | null => {
  return localStorage.getItem('token');
};

const authHeaders = (): HeadersInit => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
};

export const policyApi = {
  /**
   * Get all policies
   */
  async getAllPolicies(): Promise<Policy[]> {
    const response = await fetch(`${API_BASE_URL}/policies`, {
      headers: authHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch policies: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data;
  },

  /**
   * Get a single policy by ID
   */
  async getPolicyById(id: string): Promise<Policy> {
    const response = await fetch(`${API_BASE_URL}/policies/${id}`, {
      headers: authHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch policy: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data;
  },

  /**
   * Create a new policy
   */
  async createPolicy(policyData: {
    name: string;
    description: string;
    workflow: { nodes: any[]; edges: any[] };
  }): Promise<Policy> {
    const response = await fetch(`${API_BASE_URL}/policies`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(policyData),
    });

    if (!response.ok) {
      throw new Error(`Failed to create policy: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data;
  },

  /**
   * Update an existing policy
   */
  async updatePolicy(
    id: string,
    policyData: {
      name?: string;
      description?: string;
      workflow?: { nodes: any[]; edges: any[] };
    }
  ): Promise<Policy> {
    const response = await fetch(`${API_BASE_URL}/policies/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(policyData),
    });

    if (!response.ok) {
      throw new Error(`Failed to update policy: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data;
  },

  /**
   * Delete a policy
   */
  async deletePolicy(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/policies/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to delete policy: ${response.statusText}`);
    }
  },

  /**
   * Publish a policy (make it active)
   */
  async publishPolicy(id: string): Promise<Policy> {
    const response = await fetch(`${API_BASE_URL}/policies/${id}/publish`, {
      method: 'POST',
      headers: authHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to publish policy: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data;
  },

  /**
   * Clone/duplicate a policy
   */
  async clonePolicy(id: string): Promise<Policy> {
    const response = await fetch(`${API_BASE_URL}/policies/${id}/clone`, {
      method: 'POST',
      headers: authHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to clone policy: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data;
  },

  /**
   * Validate a policy workflow
   */
  async validatePolicy(workflow: { nodes: any[]; edges: any[] }): Promise<{
    valid: boolean;
    errors: Array<{ type: string; message: string; nodeId?: string }>;
  }> {
    const response = await fetch(`${API_BASE_URL}/policies/validate`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ workflow }),
    });

    if (!response.ok) {
      throw new Error(`Failed to validate policy: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data;
  },
};
