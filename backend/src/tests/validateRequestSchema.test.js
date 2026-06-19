/**
 * Unit tests for validateRequestSchema middleware factory
 *
 * Covers the extracted lightweight module that restores Joi validation
 * on /api/v1/smart-wallet/* routes (Issue #44).
 */

const { validateRequestSchema } = require('../middleware/validateRequestSchema');

// ── Helpers ──────────────────────────────────────────────────────

function mockReq(overrides = {}) {
  return {
    body: {},
    query: {},
    params: {},
    ...overrides,
  };
}

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

function schemaShouldPass() {
  return { validate: () => ({}) };
}

function schemaShouldFail(errorMsg = 'test error') {
  return { validate: () => ({ error: { details: [{ message: errorMsg }] } }) };
}

// ── Tests ────────────────────────────────────────────────────────

describe('validateRequestSchema', () => {
  it('calls next() when no schemas are provided (empty schema)', () => {
    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();

    const middleware = validateRequestSchema({});
    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('calls next() when body validation passes', () => {
    const req = mockReq({ body: { name: 'test' } });
    const res = mockRes();
    const next = jest.fn();

    const middleware = validateRequestSchema({ body: schemaShouldPass() });
    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('calls next() when query validation passes', () => {
    const req = mockReq({ query: { page: '1' } });
    const res = mockRes();
    const next = jest.fn();

    const middleware = validateRequestSchema({ query: schemaShouldPass() });
    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('calls next() when params validation passes', () => {
    const req = mockReq({ params: { id: 'abc' } });
    const res = mockRes();
    const next = jest.fn();

    const middleware = validateRequestSchema({ params: schemaShouldPass() });
    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 400 when body validation fails', () => {
    const req = mockReq({ body: {} });
    const res = mockRes();
    const next = jest.fn();

    const middleware = validateRequestSchema({
      body: schemaShouldFail('name is required'),
    });
    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Validation failed',
        details: expect.arrayContaining(['Body: name is required']),
      })
    );
  });

  it('returns 400 when query validation fails', () => {
    const req = mockReq({ query: {} });
    const res = mockRes();
    const next = jest.fn();

    const middleware = validateRequestSchema({
      query: schemaShouldFail('page must be integer'),
    });
    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        details: expect.arrayContaining(['Query: page must be integer']),
      })
    );
  });

  it('returns 400 when params validation fails', () => {
    const req = mockReq({ params: { id: '' } });
    const res = mockRes();
    const next = jest.fn();

    const middleware = validateRequestSchema({
      params: schemaShouldFail('id required'),
    });
    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        details: expect.arrayContaining(['Params: id required']),
      })
    );
  });

  it('accumulates multiple validation errors', () => {
    const req = mockReq({ body: {}, query: {} });
    const res = mockRes();
    const next = jest.fn();

    const middleware = validateRequestSchema({
      body: schemaShouldFail('body error'),
      query: schemaShouldFail('query error'),
    });
    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    const jsonCall = res.json.mock.calls[0][0];
    expect(jsonCall.details).toHaveLength(2);
    expect(jsonCall.details).toContain('Body: body error');
    expect(jsonCall.details).toContain('Query: query error');
  });

  it('does not call res.json on successful validation (no side effects)', () => {
    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();

    const middleware = validateRequestSchema({
      body: schemaShouldPass(),
      query: schemaShouldPass(),
      params: schemaShouldPass(),
    });
    middleware(req, res, next);

    expect(res.json).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it('handles null body gracefully', () => {
    const req = mockReq({ body: null });
    const res = mockRes();
    const next = jest.fn();

    const middleware = validateRequestSchema({
      body: schemaShouldFail('body required'),
    });
    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});
