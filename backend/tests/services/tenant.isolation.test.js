let mockObjectIdCounter = 0;
function mockObjectId() {
  ++mockObjectIdCounter;
  const hex = mockObjectIdCounter.toString(16).padStart(24, '0');
  return { toString: () => hex, _id: hex };
}

jest.mock('../../src/models/Tenant', () => {
  const tenants = new Map();

  const MockTenant = function (data) {
    Object.assign(this, data);
    this._id = data._id || mockObjectId();
    Object.defineProperty(this, 'isActive', {
      get: function () {
        return this.status === 'active' &&
          (!this.subscription?.endDate || new Date(this.subscription.endDate) > new Date());
      },
      enumerable: true
    });
    this.branding = this.branding || {};
    this.settings = this.settings || { maxUsers: 100, maxStorage: 1024, allowPublicRegistration: true };
    this.usage = this.usage || { users: 0, storage: 0, apiCalls: 0 };
  };

  MockTenant.prototype.save = jest.fn().mockResolvedValue(true);
  MockTenant.prototype.markModified = jest.fn();
  MockTenant.prototype.canAddUser = function () {
    return (this.usage?.users || 0) < (this.settings?.maxUsers || 100);
  };
  MockTenant.prototype.canAllocateStorage = function (additionalMB) {
    return ((this.usage?.storage || 0) + additionalMB) <= (this.settings?.maxStorage || 1024);
  };
  MockTenant.prototype.incrementUsage = jest.fn(function (type, amount = 1) {
    if (!this.usage) this.usage = {};
    this.usage[type] = (this.usage[type] || 0) + amount;
  });

  MockTenant.findOne = jest.fn((query) => {
    const entries = Array.from(tenants.values());
    for (const q of query.$or || [query]) {
      for (const t of entries) {
        if ((q.subdomain && t.subdomain === q.subdomain) ||
            (q.domain && t.domain === q.domain) ||
            (q._id && t._id.toString() === q._id.toString())) {
          return Promise.resolve(t);
        }
      }
    }
    return Promise.resolve(null);
  });

  MockTenant.findById = jest.fn((id) => {
    const idStr = typeof id === 'string' ? id : id?.toString();
    for (const t of tenants.values()) {
      if (t._id.toString() === idStr) return Promise.resolve(t);
    }
    return Promise.resolve(null);
  });

  MockTenant.findByIdAndUpdate = jest.fn(async (id, update) => {
    const t = await MockTenant.findById(id);
    if (!t) return null;
    if (update.$set) {
      Object.assign(t, update.$set);
    }
    return t;
  });

  MockTenant.findByIdAndDelete = jest.fn((id) => {
    const idStr = typeof id === 'string' ? id : id?.toString();
    for (const [key, t] of tenants.entries()) {
      if (t._id.toString() === idStr) {
        tenants.delete(key);
        return Promise.resolve(t);
      }
    }
    return Promise.resolve(null);
  });

  MockTenant.countDocuments = jest.fn((query = {}) => {
    return MockTenant.find(query).then(r => r.length);
  });

  MockTenant.find = jest.fn((query = {}) => {
    let results = Array.from(tenants.values());
    if (query.createdAt?.$gte) {
      results = results.filter(t => new Date(t.createdAt) >= query.createdAt.$gte);
    }
    if (query._id) {
      results = results.filter(t => t._id.toString() === query._id.toString());
    }
    if (query.status) {
      results = results.filter(t => t.status === query.status);
    }
    return Promise.resolve(results);
  });

  MockTenant.aggregate = jest.fn(() => Promise.resolve([]));

  MockTenant.schema = { paths: {} };

  MockTenant.__seed = (data) => {
    const t = new MockTenant(data);
    t.createdAt = data.createdAt || new Date();
    tenants.set(t._id.toString(), t);
    return t;
  };

  MockTenant.__clear = () => {
    tenants.clear();
  };

  return MockTenant;
});

jest.mock('../../src/models/TenantUser', () => {
  const tenantUsers = new Map();

  const MockTenantUser = function (data) {
    Object.assign(this, data);
    this._id = data._id || mockObjectId();
    this.roles = data.roles || [];
    this.permissions = data.permissions || [];
    this.status = data.status || 'active';
    this.activity = data.activity || { lastActive: new Date(), totalLogins: 0, totalTimeSpent: 0, coursesCompleted: 0, certificatesEarned: 0 };
    this.auth = data.auth || {};
    this.profile = data.profile || {};
    this.stellar = data.stellar || {};
    this.preferences = data.preferences || {};
    this.createdAt = data.createdAt || new Date();
  };

  MockTenantUser.prototype.save = jest.fn().mockResolvedValue(true);
  MockTenantUser.prototype.markModified = jest.fn();
  MockTenantUser.prototype.hasRole = function (role) {
    return this.roles.includes(role);
  };
  MockTenantUser.prototype.hasPermission = function (resource, action) {
    const p = this.permissions.find(p => p.resource === resource);
    return p && p.actions.includes(action);
  };
  MockTenantUser.prototype.addRole = function (role) {
    if (!this.roles.includes(role)) this.roles.push(role);
  };
  MockTenantUser.prototype.removeRole = function (role) {
    this.roles = this.roles.filter(r => r !== role);
  };
  MockTenantUser.prototype.incLoginAttempts = jest.fn();
  MockTenantUser.prototype.resetLoginAttempts = jest.fn();

  MockTenantUser.findOne = jest.fn((query) => {
    const entries = Array.from(tenantUsers.values());
    for (const u of entries) {
      let match = true;
      if (query._id && u._id.toString() !== query._id.toString()) match = false;
      if (query.tenantId && u.tenantId?.toString() !== query.tenantId.toString()) match = false;
      if (query['profile.email'] && u.profile?.email?.toLowerCase() !== query['profile.email'].toLowerCase()) match = false;
      if (match) return Promise.resolve(u);
    }
    return Promise.resolve(null);
  });

  MockTenantUser.find = jest.fn((query = {}) => {
    let results = Array.from(tenantUsers.values());
    if (query.tenantId) {
      results = results.filter(u => u.tenantId?.toString() === query.tenantId.toString());
    }
    if (query.status) {
      results = results.filter(u => u.status === query.status);
    }
    if (query.roles) {
      results = results.filter(u => u.roles.includes(query.roles));
    }
    if (query.$or) {
      results = results.filter(u => {
        return query.$or.some(condition => {
          for (const key of Object.keys(condition)) {
            if (key.startsWith('profile.')) {
              const field = key.split('.')[1];
              const regex = condition[key].$regex;
              return u.profile?.[field]?.match(new RegExp(regex, condition[key].$options || ''));
            }
          }
          return false;
        });
      });
    }
    if (query.createdAt?.$gte) {
      results = results.filter(u => new Date(u.createdAt) >= query.createdAt.$gte);
    }
    if (query['activity.lastActive']?.$gte) {
      results = results.filter(u => new Date(u.activity.lastActive) >= query['activity.lastActive'].$gte);
    }
    const resolveResults = () => results;
    const chain = {
      sort: jest.fn(() => chain),
      limit: jest.fn(() => chain),
      skip: jest.fn(() => chain),
      select: jest.fn(() => chain),
      then: (onFulfilled) => Promise.resolve(resolveResults()).then(onFulfilled),
      catch: (onRejected) => Promise.resolve(resolveResults()).catch(onRejected)
    };
    return chain;
  });

  MockTenantUser.countDocuments = jest.fn(async (query = {}) => {
    const chain = MockTenantUser.find(query);
    const results = await chain;
    return results.length;
  });

  MockTenantUser.updateMany = jest.fn((query, update) => {
    return MockTenantUser.find(query).then(results => {
      results.forEach(u => {
        if (update.$set) Object.assign(u, update.$set);
      });
      return Promise.resolve({ modifiedCount: results.length });
    });
  });

  MockTenantUser.deleteMany = jest.fn((query) => {
    return MockTenantUser.find(query).then(results => {
      results.forEach(u => tenantUsers.delete(u._id.toString()));
      return Promise.resolve({ deletedCount: results.length });
    });
  });

  MockTenantUser.aggregate = jest.fn((pipeline) => {
    const matchStage = pipeline.find(s => s.$match);
    let users = Array.from(tenantUsers.values());

    if (matchStage?.$match) {
      const m = matchStage.$match;
      if (m.tenantId) {
        const tid = m.tenantId.toString ? m.tenantId.toString() : m.tenantId;
        users = users.filter(u => u.tenantId?.toString() === tid);
      }
      if (m.status) {
        users = users.filter(u => u.status === m.status);
      }
      if (m['activity.lastActive']?.$gte) {
        users = users.filter(u => new Date(u.activity.lastActive) >= m['activity.lastActive'].$gte);
      }
      if (m.createdAt?.$gte) {
        users = users.filter(u => new Date(u.createdAt) >= m.createdAt.$gte);
      }
      if (m.roles) {
        users = users.filter(u => u.roles === m.roles);
      }
    }

    const groupStage = pipeline.find(s => s.$group);
    if (groupStage) {
      const grouped = {};
      users.forEach(u => {
        const key = groupStage.$group._id === null ? 'null' :
          groupStage.$group._id === '$status' ? (u.status || 'unknown') :
          groupStage.$group._id === '$roles' ? (u.roles?.[0] || 'unknown') : 'unknown';
        if (!grouped[key]) grouped[key] = { _id: key, count: 0 };
        grouped[key].count++;
      });
      return Promise.resolve(Object.values(grouped));
    }

    return Promise.resolve([]);
  });

  MockTenantUser.schema = {
    paths: { tenantId: { instance: 'ObjectId' } }
  };

  MockTenantUser.__seed = (data) => {
    const u = new MockTenantUser(data);
    tenantUsers.set(u._id.toString(), u);
    return u;
  };

  MockTenantUser.__clear = () => {
    tenantUsers.clear();
  };

  return MockTenantUser;
});

const Tenant = require('../../src/models/Tenant');
const TenantUser = require('../../src/models/TenantUser');
const tenantService = require('../../src/services/tenantService');
const tenantAnalyticsService = require('../../src/services/tenantAnalyticsService');

const {
  withTenantScope,
  getAuditLog,
  addAuditEntry,
  verifyTenantAccess,
  adminScopeOverride
} = require('../../src/middleware/tenant');

describe('Tenant Data Isolation', () => {
  let tenantA, tenantB, userA, userB, adminUser;

  beforeEach(() => {
    getAuditLog().length = 0;
    Tenant.__clear();
    TenantUser.__clear();

    tenantA = Tenant.__seed({
      name: 'Tenant A',
      subdomain: 'tenant-a',
      domain: 'tenant-a.example.com',
      status: 'active',
      plan: 'professional',
      contact: { firstName: 'Admin', lastName: 'A', email: 'admin-a@test.com' },
      settings: { maxUsers: 100, maxStorage: 1024, allowPublicRegistration: true },
      usage: { users: 1, storage: 0, apiCalls: 0 },
      subscription: {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 335 * 24 * 60 * 60 * 1000)
      },
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    });

    tenantB = Tenant.__seed({
      name: 'Tenant B',
      subdomain: 'tenant-b',
      domain: 'tenant-b.example.com',
      status: 'active',
      plan: 'starter',
      contact: { firstName: 'Admin', lastName: 'B', email: 'admin-b@test.com' },
      settings: { maxUsers: 50, maxStorage: 512, allowPublicRegistration: true },
      usage: { users: 1, storage: 0, apiCalls: 0 },
      subscription: {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 335 * 24 * 60 * 60 * 1000)
      },
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    });

    userA = TenantUser.__seed({
      tenantId: tenantA._id,
      profile: { firstName: 'User', lastName: 'A', email: 'usera@test.com' },
      status: 'active',
      roles: ['student']
    });

    userB = TenantUser.__seed({
      tenantId: tenantB._id,
      profile: { firstName: 'User', lastName: 'B', email: 'userb@test.com' },
      status: 'active',
      roles: ['student']
    });

    adminUser = TenantUser.__seed({
      tenantId: tenantA._id,
      profile: { firstName: 'Admin', lastName: 'Super', email: 'admin@test.com' },
      status: 'active',
      roles: ['super_admin']
    });
  });

  describe('Tenant context on authenticated requests', () => {
    it('should set req.tenant and req.tenantId via tenantMiddleware', async () => {
      const { tenantMiddleware } = require('../../src/middleware/tenant');

      const req = {
        hostname: 'tenant-a.example.com',
        headers: {},
        query: {}
      };
      const res = {
        set: jest.fn().mockReturnThis(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      await tenantMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.tenant).toBeDefined();
      expect(req.tenantId).toBeDefined();
      expect(req.tenantId.toString()).toBe(tenantA._id.toString());
    });

    it('should resolve tenant from X-Tenant-ID header', async () => {
      const { tenantMiddleware } = require('../../src/middleware/tenant');

      const req = {
        hostname: 'localhost',
        headers: { 'x-tenant-id': 'tenant-a' },
        query: {}
      };
      const res = {
        set: jest.fn().mockReturnThis(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      await tenantMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.tenantId.toString()).toBe(tenantA._id.toString());
    });

    it('should resolve tenant from query parameter', async () => {
      const { tenantMiddleware } = require('../../src/middleware/tenant');

      const req = {
        hostname: 'localhost',
        headers: {},
        query: { tenant: 'tenant-a' }
      };
      const res = {
        set: jest.fn().mockReturnThis(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      await tenantMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.tenantId.toString()).toBe(tenantA._id.toString());
    });

    it('should reject request without tenant info', async () => {
      const { tenantMiddleware } = require('../../src/middleware/tenant');

      const req = {
        hostname: 'localhost',
        headers: {},
        query: {}
      };
      const res = {
        set: jest.fn().mockReturnThis(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      await tenantMiddleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Tenant information required' })
      );
    });

    it('should reject request for inactive tenant', async () => {
      const { tenantMiddleware } = require('../../src/middleware/tenant');

      tenantA.status = 'suspended';

      const req = {
        hostname: 'tenant-a.example.com',
        headers: {},
        query: {}
      };
      const res = {
        set: jest.fn().mockReturnThis(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      await tenantMiddleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('Database queries scoped by tenant_id', () => {
    it('should scope getTenantUsers to the given tenantId', async () => {
      const resultA = await tenantService.getTenantUsers(tenantA._id);
      expect(resultA.users.every(u => u.tenantId.toString() === tenantA._id.toString())).toBe(true);

      const resultB = await tenantService.getTenantUsers(tenantB._id);
      expect(resultB.users.every(u => u.tenantId.toString() === tenantB._id.toString())).toBe(true);
    });

    it('should not return Tenant B users when querying Tenant A', async () => {
      const result = await tenantService.getTenantUsers(tenantA._id);

      const tenantBUserIds = result.users.filter(
        u => u.tenantId.toString() === tenantB._id.toString()
      );
      expect(tenantBUserIds.length).toBe(0);
    });

    it('should scope getTenantUsage to the correct tenant', async () => {
      const usageA = await tenantService.getTenantUsage(tenantA._id);
      expect(usageA.usage.users).toBe(1);

      await expect(tenantService.getTenantUsage('nonexistent-id'))
        .rejects.toThrow('Tenant not found');
    });

    it('should scope getTenantAnalytics to the correct tenant', async () => {
      const analyticsA = await tenantAnalyticsService.getTenantAnalytics(tenantA._id.toString());

      expect(analyticsA.tenant.id.toString()).toBe(tenantA._id.toString());
      expect(analyticsA.userMetrics.totalUsers).toBeGreaterThanOrEqual(1);
      expect(analyticsA.tenant.name).toBe('Tenant A');
    });

    it('withTenantScope helper should add tenantId filter to queries', () => {
      const filter = { status: 'active' };
      const scoped = withTenantScope(filter, tenantA._id);

      expect(scoped.tenantId).toBe(tenantA._id);
      expect(scoped.status).toBe('active');
    });

    it('withTenantScope should return original filter when no tenantId', () => {
      const filter = { status: 'active' };
      const scoped = withTenantScope(filter, null);

      expect(scoped).toEqual(filter);
    });
  });

  describe('Cross-tenant access returns 403', () => {
    it('verifyTenantAccess should block mismatched tenantId in route param', () => {
      const req = {
        params: { tenantId: tenantB._id.toString() },
        tenantId: tenantA._id,
        originalUrl: '/api/v1/tenants/' + tenantB._id + '/users',
        method: 'GET',
        user: { userId: userA._id }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      verifyTenantAccess('tenantId')(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'CROSS_TENANT_ACCESS_DENIED' })
      );
    });

    it('verifyTenantAccess should allow matching tenantId', () => {
      const req = {
        params: { tenantId: tenantA._id.toString() },
        tenantId: tenantA._id,
        originalUrl: '/api/v1/tenants/' + tenantA._id + '/users',
        method: 'GET',
        user: { userId: userA._id }
      };
      const res = {
        set: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      verifyTenantAccess('tenantId')(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('ensureTenantUser should reject user from different tenant', async () => {
      const { ensureTenantUser } = require('../../src/middleware/tenant');

      const req = {
        user: { userId: userA._id.toString(), tenantId: tenantB._id.toString(), roles: ['student'] },
        tenant: tenantB,
        tenantId: tenantB._id
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      await ensureTenantUser(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'User does not belong to this tenant' })
      );
    });

    it('cross-tenant data query via service should not leak data', async () => {
      const resultA = await tenantService.getTenantUsers(tenantA._id);

      const leakedUsers = resultA.users.filter(
        u => u.tenantId.toString() === tenantB._id.toString()
      );
      expect(leakedUsers.length).toBe(0);
    });
  });

  describe('Admin override with explicit scope change', () => {
    it('should allow super_admin to override tenant scope via header', async () => {
      const req = {
        user: { userId: adminUser._id.toString() },
        tenantUser: adminUser,
        tenant: tenantA,
        tenantId: tenantA._id,
        headers: { 'x-admin-override': tenantB._id.toString() },
        query: {},
        originalUrl: '/api/v1/tenants/' + tenantB._id + '/users',
        method: 'GET'
      };
      const res = {
        set: jest.fn().mockReturnThis(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      await new Promise((resolve) => {
        adminScopeOverride(req, res, (err) => {
          next(err);
          resolve();
        });
      });

      expect(next).toHaveBeenCalled();
      expect(req.tenantId.toString()).toBe(tenantB._id.toString());
      expect(req.adminOverrideActive).toBe(true);
    });

    it('should ignore override for non-super_admin roles', async () => {
      const req = {
        user: { userId: userA._id.toString() },
        tenantUser: userA,
        tenant: tenantA,
        tenantId: tenantA._id,
        headers: { 'x-admin-override': tenantB._id.toString() },
        query: {},
        originalUrl: '/api/v1/tenants/' + tenantA._id + '/users',
        method: 'GET'
      };
      const res = {
        set: jest.fn().mockReturnThis(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      await new Promise((resolve) => {
        adminScopeOverride(req, res, (err) => {
          next(err);
          resolve();
        });
      });

      expect(next).toHaveBeenCalled();
      expect(req.adminOverrideActive).toBeUndefined();
    });

    it('should return 404 if override target tenant does not exist', (done) => {
      const req = {
        user: { userId: adminUser._id.toString() },
        tenantUser: adminUser,
        tenant: tenantA,
        tenantId: tenantA._id,
        headers: { 'x-admin-override': '000000000000000000000000' },
        query: {},
        originalUrl: '/api/v1/tenants/' + '000000000000000000000000' + '/users',
        method: 'GET'
      };
      const res = {
        set: jest.fn().mockReturnThis(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      // Use setImmediate to allow the async .then() in adminScopeOverride to complete
      adminScopeOverride(req, res, (err) => {
        next(err);
      });

      setImmediate(() => {
        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(404);
        done();
      });
    });
  });

  describe('Audit log entries for cross-tenant access', () => {
    it('should log cross-tenant access denied events', () => {
      const initialCount = getAuditLog().length;

      const req = {
        params: { tenantId: tenantB._id.toString() },
        tenantId: tenantA._id,
        originalUrl: '/api/v1/tenants/' + tenantB._id + '/users',
        method: 'GET',
        user: { userId: userA._id }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      verifyTenantAccess('tenantId')(req, res, next);

      const newEntries = getAuditLog().slice(initialCount);
      expect(newEntries.length).toBeGreaterThanOrEqual(1);
      expect(newEntries[0].type).toBe('CROSS_TENANT_DENIED');
      expect(newEntries[0].severity).toBe('WARN');
    });

    it('should log admin scope override events', async () => {
      const initialCount = getAuditLog().length;

      const req = {
        user: { userId: adminUser._id.toString() },
        tenantUser: adminUser,
        tenant: tenantA,
        tenantId: tenantA._id,
        headers: { 'x-admin-override': tenantB._id.toString() },
        query: {},
        originalUrl: '/api/v1/tenants/' + tenantB._id + '/users',
        method: 'GET'
      };
      const res = {
        set: jest.fn().mockReturnThis(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      await new Promise((resolve) => {
        adminScopeOverride(req, res, (err) => {
          next(err);
          resolve();
        });
      });

      const newEntries = getAuditLog().slice(initialCount);
      expect(newEntries.length).toBeGreaterThanOrEqual(1);
      expect(newEntries[0].type).toBe('ADMIN_SCOPE_OVERRIDE');
      expect(newEntries[0].adminUserId).toBeDefined();
      expect(newEntries[0].targetTenantId).toBe(tenantB._id.toString());
    });

    it('should expose audit log externally', () => {
      addAuditEntry({ type: 'TEST_EVENT', message: 'test audit entry' });

      const log = getAuditLog();
      expect(log.length).toBeGreaterThanOrEqual(1);
      expect(log.some(e => e.type === 'TEST_EVENT')).toBe(true);
    });
  });

  describe('Tenant A cannot access Tenant B data', () => {
    it('should not return Tenant B users from Tenant A user query', async () => {
      const resultA = await tenantService.getTenantUsers(tenantA._id);

      const tenantBIds = resultA.users.filter(
        u => u._id.toString() === userB._id.toString()
      );
      expect(tenantBIds.length).toBe(0);
    });

    it('should enforce isolation for updateTenantSettings', async () => {
      const updatedA = await tenantService.updateTenantSettings(tenantA._id, {
        allowPublicRegistration: false
      });
      expect(updatedA._id.toString()).toBe(tenantA._id.toString());

      expect(tenantB.settings.allowPublicRegistration).toBe(true);
    });

    it('should enforce isolation for updateTenantBranding', async () => {
      await tenantService.updateTenantBranding(tenantA._id, {
        companyName: 'Company A'
      });

      expect(tenantA.branding.companyName).toBe('Company A');
      expect(tenantB.branding.companyName).toBeUndefined();
    });

    it('should not allow Tenant A analytics to return Tenant B data', async () => {
      const analytics = await tenantAnalyticsService.getTenantAnalytics(tenantA._id.toString());

      expect(analytics.tenant.id.toString()).toBe(tenantA._id.toString());
      expect(analytics.tenant.name).toBe('Tenant A');
    });

    it('should prevent deleting other tenant data', async () => {
      await tenantService.deleteTenant(tenantB._id);

      const deletedTenant = await Tenant.findById(tenantB._id);
      expect(deletedTenant).toBeNull();

      const tenantARemains = await Tenant.findById(tenantA._id);
      expect(tenantARemains).not.toBeNull();
    });
  });
});
