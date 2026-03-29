/**
 * Migration: Add User Roles
 * Description: Adds role field to users table and creates role-related indexes
 * Version: 002
 */

const { UserRole } = require('../src/models/User');

/**
 * Up migration - Add role field and related structures
 */
async function up(pool) {
  try {
    console.log('Starting migration: Add User Roles');
    
    // Add role column to users table
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT '${UserRole.STUDENT}'
    `);
    
    console.log('Added role column to users table');
    
    // Create index on role for faster queries
    await pool.query(`
      CREATE INDEX idx_users_role ON users(role)
    `);
    
    console.log('Created index on users.role');
    
    // Create composite index for role-based queries with other common filters
    await pool.query(`
      CREATE INDEX idx_users_role_status ON users(role, created_at)
    `);
    
    console.log('Created composite index on users.role and users.created_at');
    
    // Update existing users to have student role (if any exist)
    await pool.query(`
      UPDATE users 
      SET role = '${UserRole.STUDENT}' 
      WHERE role IS NULL OR role = ''
    `);
    
    console.log('Updated existing users to have student role');
    
    // Create role permissions table for future extensibility
    await pool.query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        id SERIAL PRIMARY KEY,
        role VARCHAR(20) NOT NULL,
        permission VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(role, permission)
      )
    `);
    
    console.log('Created role_permissions table');
    
    // Insert default permissions for each role
    const defaultPermissions = [
      // Student permissions
      ['student', 'course:read'],
      ['student', 'quiz:read'],
      ['student', 'content:read'],
      ['student', 'user:read'],
      
      // Educator permissions
      ['educator', 'course:create'],
      ['educator', 'course:read'],
      ['educator', 'course:update'],
      ['educator', 'quiz:create'],
      ['educator', 'quiz:read'],
      ['educator', 'quiz:update'],
      ['educator', 'quiz:delete'],
      ['educator', 'content:create'],
      ['educator', 'content:read'],
      ['educator', 'content:update'],
      ['educator', 'content:delete'],
      ['educator', 'user:read'],
      
      // Admin permissions (all permissions)
      ['admin', 'course:create'],
      ['admin', 'course:read'],
      ['admin', 'course:update'],
      ['admin', 'course:delete'],
      ['admin', 'quiz:create'],
      ['admin', 'quiz:read'],
      ['admin', 'quiz:update'],
      ['admin', 'quiz:delete'],
      ['admin', 'user:read'],
      ['admin', 'user:update'],
      ['admin', 'user:delete'],
      ['admin', 'user:assign_role'],
      ['admin', 'admin:panel'],
      ['admin', 'system:manage'],
      ['admin', 'content:create'],
      ['admin', 'content:read'],
      ['admin', 'content:update'],
      ['admin', 'content:delete']
    ];
    
    // Insert permissions using parameterized query
    for (const [role, permission] of defaultPermissions) {
      await pool.query(`
        INSERT INTO role_permissions (role, permission) 
        VALUES ($1, $2) 
        ON CONFLICT (role, permission) DO NOTHING
      `, [role, permission]);
    }
    
    console.log('Inserted default role permissions');
    
    // Create audit log table for role changes
    await pool.query(`
      CREATE TABLE IF NOT EXISTS role_change_log (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        changed_by VARCHAR(255) NOT NULL,
        old_role VARCHAR(20),
        new_role VARCHAR(20) NOT NULL,
        change_reason TEXT,
        changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ip_address INET,
        user_agent TEXT
      )
    `);
    
    console.log('Created role_change_log table');
    
    // Create indexes for audit log
    await pool.query(`
      CREATE INDEX idx_role_change_log_user_id ON role_change_log(user_id)
    `);
    
    await pool.query(`
      CREATE INDEX idx_role_change_log_changed_at ON role_change_log(changed_at)
    `);
    
    console.log('Created indexes for role_change_log table');
    
    // Add check constraint to ensure only valid roles
    await pool.query(`
      ALTER TABLE users 
      ADD CONSTRAINT chk_user_role 
      CHECK (role IN ('${UserRole.STUDENT}', '${UserRole.EDUCATOR}', '${UserRole.ADMIN}'))
    `);
    
    console.log('Added role constraint to users table');
    
    console.log('Migration completed successfully: Add User Roles');
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

/**
 * Down migration - Remove role field and related structures
 */
async function down(pool) {
  try {
    console.log('Starting rollback migration: Remove User Roles');
    
    // Drop check constraint
    await pool.query(`
      ALTER TABLE users 
      DROP CONSTRAINT IF EXISTS chk_user_role
    `);
    
    console.log('Dropped role constraint from users table');
    
    // Drop role_permissions table
    await pool.query(`
      DROP TABLE IF EXISTS role_permissions
    `);
    
    console.log('Dropped role_permissions table');
    
    // Drop role_change_log table
    await pool.query(`
      DROP TABLE IF EXISTS role_change_log
    `);
    
    console.log('Dropped role_change_log table');
    
    // Drop indexes
    await pool.query(`
      DROP INDEX IF EXISTS idx_users_role
    `);
    
    await pool.query(`
      DROP INDEX IF EXISTS idx_users_role_status
    `);
    
    console.log('Dropped role-related indexes');
    
    // Remove role column from users table
    await pool.query(`
      ALTER TABLE users 
      DROP COLUMN IF EXISTS role
    `);
    
    console.log('Removed role column from users table');
    
    console.log('Rollback migration completed successfully: Remove User Roles');
    
  } catch (error) {
    console.error('Rollback migration failed:', error);
    throw error;
  }
}

/**
 * Migration validation
 */
async function validate(pool) {
  try {
    console.log('Validating migration: Add User Roles');
    
    // Check if role column exists
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'role'
    `);
    
    if (columnCheck.rows.length === 0) {
      throw new Error('Role column not found in users table');
    }
    
    console.log('✓ Role column exists in users table');
    
    // Check if role_permissions table exists
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'role_permissions'
    `);
    
    if (tableCheck.rows.length === 0) {
      throw new Error('role_permissions table not found');
    }
    
    console.log('✓ role_permissions table exists');
    
    // Check if role_change_log table exists
    const logTableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'role_change_log'
    `);
    
    if (logTableCheck.rows.length === 0) {
      throw new Error('role_change_log table not found');
    }
    
    console.log('✓ role_change_log table exists');
    
    // Check if indexes exist
    const indexCheck = await pool.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE indexname IN ('idx_users_role', 'idx_users_role_status', 'idx_role_change_log_user_id', 'idx_role_change_log_changed_at')
    `);
    
    const expectedIndexes = ['idx_users_role', 'idx_users_role_status', 'idx_role_change_log_user_id', 'idx_role_change_log_changed_at'];
    const foundIndexes = indexCheck.rows.map(row => row.indexname);
    
    for (const expectedIndex of expectedIndexes) {
      if (!foundIndexes.includes(expectedIndex)) {
        throw new Error(`Index ${expectedIndex} not found`);
      }
    }
    
    console.log('✓ All required indexes exist');
    
    // Check if default permissions are inserted
    const permissionCheck = await pool.query(`
      SELECT COUNT(*) as count 
      FROM role_permissions
    `);
    
    if (parseInt(permissionCheck.rows[0].count) < 10) {
      throw new Error('Default permissions not properly inserted');
    }
    
    console.log('✓ Default permissions are present');
    
    console.log('Migration validation passed: Add User Roles');
    
  } catch (error) {
    console.error('Migration validation failed:', error);
    throw error;
  }
}

module.exports = {
  up,
  down,
  validate,
  version: '002',
  description: 'Add User Roles',
  dependencies: ['001']
};
