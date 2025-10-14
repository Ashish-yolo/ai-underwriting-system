import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../config/database';
import { config } from '../config/env';
import logger from '../utils/logger';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'policy_creator' | 'reviewer' | 'viewer';
  is_active: boolean;
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  expiresIn: number;
}

/**
 * Register a new user
 */
export const registerUser = async (
  email: string,
  password: string,
  fullName: string,
  role: string = 'viewer'
): Promise<User> => {
  try {
    // Check if user already exists
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existing.rows.length > 0) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert user
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, full_name, role, is_active`,
      [email, passwordHash, fullName, role]
    );

    logger.info(`User registered: ${email}`);

    return result.rows[0];
  } catch (error) {
    logger.error(`Registration error: ${error.message}`);
    throw error;
  }
};

/**
 * Login user and generate JWT token
 */
export const loginUser = async (
  email: string,
  password: string,
  ipAddress?: string,
  userAgent?: string
): Promise<AuthResponse> => {
  try {
    // Find user
    const result = await pool.query(
      `SELECT id, email, password_hash, full_name, role, is_active
       FROM users
       WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      throw new Error('Invalid email or password');
    }

    const user = result.rows[0];

    // Check if user is active
    if (!user.is_active) {
      throw new Error('User account is deactivated');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Generate JWT token
    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const expiresIn = config.SESSION_TIMEOUT_HOURS * 3600; // in seconds
    const token = jwt.sign(tokenPayload, config.JWT_SECRET, {
      expiresIn,
    });

    // Hash token for storage
    const tokenHash = await bcrypt.hash(token, 10);

    // Store session
    await pool.query(
      `INSERT INTO user_sessions (user_id, token_hash, ip_address, user_agent, expires_at)
       VALUES ($1, $2, $3, $4, NOW() + INTERVAL '${config.SESSION_TIMEOUT_HOURS} hours')`,
      [user.id, tokenHash, ipAddress, userAgent]
    );

    // Update last login
    await pool.query(
      'UPDATE users SET last_login_at = NOW() WHERE id = $1',
      [user.id]
    );

    logger.info(`User logged in: ${email}`);

    return {
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        is_active: user.is_active,
      },
      token,
      expiresIn,
    };
  } catch (error) {
    logger.error(`Login error: ${error.message}`);
    throw error;
  }
};

/**
 * Verify JWT token and return user
 */
export const verifyToken = async (token: string): Promise<User> => {
  try {
    // Verify JWT
    const decoded = jwt.verify(token, config.JWT_SECRET) as TokenPayload;

    // Get user from database
    const result = await pool.query(
      `SELECT id, email, full_name, role, is_active
       FROM users
       WHERE id = $1 AND is_active = true`,
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      throw new Error('User not found or inactive');
    }

    return result.rows[0];
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    }
    throw error;
  }
};

/**
 * Logout user (revoke session)
 */
export const logoutUser = async (token: string): Promise<void> => {
  try {
    const tokenHash = await bcrypt.hash(token, 10);

    await pool.query(
      'UPDATE user_sessions SET revoked_at = NOW() WHERE token_hash = $1',
      [tokenHash]
    );

    logger.info('User logged out');
  } catch (error) {
    logger.error(`Logout error: ${error.message}`);
    throw error;
  }
};

/**
 * Change user password
 */
export const changePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> => {
  try {
    // Get current password hash
    const result = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);

    if (!isValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [newPasswordHash, userId]
    );

    // Revoke all existing sessions
    await pool.query(
      'UPDATE user_sessions SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
      [userId]
    );

    logger.info(`Password changed for user: ${userId}`);
  } catch (error) {
    logger.error(`Change password error: ${error.message}`);
    throw error;
  }
};

/**
 * Get user by ID
 */
export const getUserById = async (userId: string): Promise<User | null> => {
  try {
    const result = await pool.query(
      'SELECT id, email, full_name, role, is_active FROM users WHERE id = $1',
      [userId]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    logger.error(`Get user error: ${error.message}`);
    throw error;
  }
};

/**
 * Get all users (admin only)
 */
export const getAllUsers = async (): Promise<User[]> => {
  try {
    const result = await pool.query(
      'SELECT id, email, full_name, role, is_active FROM users ORDER BY created_at DESC'
    );

    return result.rows;
  } catch (error) {
    logger.error(`Get all users error: ${error.message}`);
    throw error;
  }
};

/**
 * Update user role (admin only)
 */
export const updateUserRole = async (
  userId: string,
  newRole: string
): Promise<void> => {
  try {
    await pool.query(
      'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2',
      [newRole, userId]
    );

    logger.info(`User role updated: ${userId} -> ${newRole}`);
  } catch (error) {
    logger.error(`Update user role error: ${error.message}`);
    throw error;
  }
};

/**
 * Deactivate user (admin only)
 */
export const deactivateUser = async (userId: string): Promise<void> => {
  try {
    await pool.query(
      'UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1',
      [userId]
    );

    // Revoke all sessions
    await pool.query(
      'UPDATE user_sessions SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
      [userId]
    );

    logger.info(`User deactivated: ${userId}`);
  } catch (error) {
    logger.error(`Deactivate user error: ${error.message}`);
    throw error;
  }
};
