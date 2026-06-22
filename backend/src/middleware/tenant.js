const Tenant = require('../models/Tenant');
const TenantUser = require('../models/TenantUser');

/**
 * Audit trail for cross-tenant access events
 */
const auditLog = [];

function addAuditEntry(entry) {
  const logEntry = {
    ...entry,
    timestamp: new Date(),
    id: auditLog.length + 1
  };
  auditLog.push(logEntry);
  console.warn('[TENANT-AUDIT]', JSON.stringify(logEntry));
  return logEntry;
}

function getAuditLog() {
  return auditLog;
}

/**
 * Multi-tenant middleware to identify and validate tenant from request
 * Sets req.tenant and req.tenantId on every authenticated request.
 */
const tenantMiddleware = async (req, res, next) => {
  try {
    // Extract tenant information from request
    const tenantInfo = extractTenantInfo(req);
    
    if (!tenantInfo) {
      return res.status(400).json({
        success: false,
        message: 'Tenant information required'
      });
    }
    
    // Find tenant
    const tenant = await Tenant.findOne({
      $or: [
        { subdomain: tenantInfo.subdomain },
        { domain: tenantInfo.domain }
      ]
    });
    
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }
    
    // Check if tenant is active
    if (!tenant.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Tenant account is inactive or expired'
      });
    }
    
    // Attach tenant to request
    req.tenant = tenant;
    req.tenantId = tenant._id;
    
    // Add tenant context to response headers for debugging
    res.set('X-Tenant-ID', tenant._id.toString());
    res.set('X-Tenant-Name', tenant.name);
    res.set('X-Tenant-Subdomain', tenant.subdomain);
    
    next();
  } catch (error) {
    console.error('Tenant middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Extract tenant information from various sources
 */
function extractTenantInfo(req) {
  // Method 1: Subdomain from hostname
  if (req.hostname) {
    const parts = req.hostname.toLowerCase().split('.');
    if (parts.length > 2) {
      const subdomain = parts[0];
      if (subdomain !== 'www' && subdomain !== 'api') {
        return { subdomain };
      }
    }
  }
  
  // Method 2: Custom header
  const tenantHeader = req.headers['x-tenant-id'];
  if (tenantHeader) {
    return { subdomain: tenantHeader };
  }
  
  // Method 3: Query parameter (for API testing)
  const tenantQuery = req.query.tenant;
  if (tenantQuery) {
    return { subdomain: tenantQuery };
  }
  
  // Method 4: Full domain mapping
  const domain = req.hostname;
  if (domain && domain !== 'localhost' && !domain.includes('127.0.0.1')) {
    return { domain };
  }
  
  return null;
}

/**
 * Middleware to check tenant resource limits
 */
const checkResourceLimits = (resource) => {
  return async (req, res, next) => {
    try {
      if (!req.tenant) {
        return res.status(400).json({
          success: false,
          message: 'Tenant context required'
        });
      }
      
      const tenant = req.tenant;
      
      switch (resource) {
        case 'users':
          if (!tenant.canAddUser()) {
            return res.status(429).json({
              success: false,
              message: 'User limit exceeded for current plan',
              code: 'USER_LIMIT_EXCEEDED'
            });
          }
          break;
          
        case 'storage':
          const additionalStorage = parseInt(req.body.storageSize) || 0;
          if (!tenant.canAllocateStorage(additionalStorage)) {
            return res.status(429).json({
              success: false,
              message: 'Storage limit exceeded for current plan',
              code: 'STORAGE_LIMIT_EXCEEDED'
            });
          }
          break;
          
        case 'api':
          // This would typically be handled by rate limiting middleware
          // but we can add tenant-specific API call tracking here
          await tenant.incrementUsage('apiCalls');
          break;
      }
      
      next();
    } catch (error) {
      console.error('Resource limit check error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };
};

/**
 * Middleware to ensure user belongs to current tenant
 */
const ensureTenantUser = async (req, res, next) => {
  try {
    if (!req.user || !req.tenant) {
      return res.status(401).json({
        success: false,
        message: 'Authentication and tenant context required'
      });
    }
    
    // JWT payload uses `userId` field (not `_id`) — see tenantService.generateTokens()
    const userId = req.user.userId || req.user._id || req.user.sub;
    
    // Check if user belongs to current tenant
    const userTenant = await TenantUser.findOne({
      _id: userId,
      tenantId: req.tenantId
    });
    
    if (!userTenant) {
      return res.status(403).json({
        success: false,
        message: 'User does not belong to this tenant'
      });
    }
    
    // Attach tenant user to request
    req.tenantUser = userTenant;
    next();
  } catch (error) {
    console.error('Tenant user check error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Middleware to check user permissions within tenant context
 */
const requireTenantPermission = (resource, action) => {
  return async (req, res, next) => {
    try {
      if (!req.tenantUser) {
        return res.status(401).json({
          success: false,
          message: 'Tenant user context required'
        });
      }
      
      // Super admins have access to everything
      if (req.tenantUser.hasRole('super_admin')) {
        return next();
      }
      
      // Tenant admins have most permissions within their tenant
      if (req.tenantUser.hasRole('tenant_admin')) {
        return next();
      }
      
      // Check specific permission
      if (!req.tenantUser.hasPermission(resource, action)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          required: { resource, action }
        });
      }
      
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };
};

/**
 * Middleware to add tenant isolation to database queries
 */
const tenantIsolation = (Model) => {
  return async (req, res, next) => {
    try {
      // Add tenant filter to query
      if (req.tenantId && Model.schema.paths.tenantId) {
        req.queryTenant = { tenantId: req.tenantId };
      }
      next();
    } catch (error) {
      console.error('Tenant isolation error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };
};

/**
 * Verifies the URL route parameter :tenantId matches the resolved req.tenantId.
 * Prevents cross-tenant access through URL manipulation.
 */
const verifyTenantAccess = (paramName = 'tenantId') => {
  return (req, res, next) => {
    const routeTenantId = req.params[paramName];
    
    if (!routeTenantId) {
      return next();
    }
    
    if (!req.tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant context not established'
      });
    }
    
    if (req.tenantId.toString() !== routeTenantId) {
      addAuditEntry({
        type: 'CROSS_TENANT_DENIED',
        severity: 'WARN',
        routeParamTenantId: routeTenantId,
        resolvedTenantId: req.tenantId.toString(),
        userId: req.user?.userId || req.user?._id || null,
        path: req.originalUrl,
        method: req.method
      });
      
      return res.status(403).json({
        success: false,
        message: 'Cross-tenant access denied',
        code: 'CROSS_TENANT_ACCESS_DENIED'
      });
    }
    
    next();
  };
};

/**
 * Admin scope override middleware.
 * Allows super_admin users to explicitly access a different tenant scope.
 * Requires an explicit X-Admin-Override header or query parameter.
 * Logs all such access to the audit trail.
 */
const adminScopeOverride = (req, res, next) => {
  // Only applies when a super_admin is performing the request
  if (!req.user || !req.tenantUser) {
    return next();
  }
  
  const isSuperAdmin = req.tenantUser.hasRole('super_admin');
  if (!isSuperAdmin) {
    return next();
  }
  
  const overrideTarget = req.headers['x-admin-override'] || req.query.adminTenantId;
  
  if (!overrideTarget) {
    return next();
  }
  
  // Resolve the target tenant
  Tenant.findById(overrideTarget)
    .then(targetTenant => {
      if (!targetTenant) {
        return res.status(404).json({
          success: false,
          message: 'Admin override target tenant not found'
        });
      }
      
      // Record the override in audit log
      addAuditEntry({
        type: 'ADMIN_SCOPE_OVERRIDE',
        severity: 'INFO',
        adminUserId: req.user.userId || req.user._id,
        originalTenantId: req.tenantId.toString(),
        targetTenantId: targetTenant._id.toString(),
        targetTenantName: targetTenant.name,
        path: req.originalUrl,
        method: req.method
      });
      
      // Switch tenant context to the target tenant
      req.tenant = targetTenant;
      req.tenantId = targetTenant._id;
      req.adminOverrideActive = true;
      req.adminOriginalTenantId = req.tenantId.toString();
      
      res.set('X-Admin-Override', 'true');
      res.set('X-Original-Tenant-ID', req.tenantId.toString());
      
      next();
    })
    .catch(err => {
      console.error('Admin scope override error:', err);
      res.status(500).json({
        success: false,
        message: 'Failed to process admin override'
      });
    });
};

/**
 * Wraps a MongoDB query filter object with a tenantId scope condition.
 * Ensures queries never accidentally omit the tenant filter.
 */
function withTenantScope(queryFilter, tenantId) {
  if (!tenantId) {
    return queryFilter;
  }
  const filter = { ...queryFilter, tenantId };
  return filter;
}

module.exports = {
  tenantMiddleware,
  checkResourceLimits,
  ensureTenantUser,
  requireTenantPermission,
  tenantIsolation,
  verifyTenantAccess,
  adminScopeOverride,
  withTenantScope,
  getAuditLog,
  addAuditEntry
};
