const Joi = require('joi');
const { validateRequestSchema } = require('../middleware/validateRequestSchema');

describe('Validation Integration', () => {
  const makeRes = () => {
    const res = { statusCode: 200 };
    res.status = jest.fn((code) => { res.statusCode = code; return res; });
    res.json = jest.fn((payload) => { res.bodySent = payload; return res; });
    return res;
  };

  describe('validateRequestSchema with Joi schemas', () => {
    it('passes valid body through the middleware', () => {
      const schema = {
        body: Joi.object({
          name: Joi.string().required(),
          email: Joi.string().email().required(),
        })
      };
      const middleware = validateRequestSchema(schema);
      const req = { body: { name: 'Alice', email: 'alice@test.com' }, query: {}, params: {} };
      const res = makeRes();
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('rejects missing required fields with 400 and standard envelope', () => {
      const schema = {
        body: Joi.object({
          name: Joi.string().required(),
          email: Joi.string().email().required(),
        })
      };
      const middleware = validateRequestSchema(schema);
      const req = { body: { name: 'Alice' }, query: {}, params: {} };
      const res = makeRes();
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.bodySent.success).toBe(false);
      expect(res.bodySent.message).toBe('Validation failed');
      expect(res.bodySent.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ source: 'body', field: 'email', message: expect.stringContaining('required') }),
        ])
      );
    });

    it('rejects invalid field types with descriptive error message', () => {
      const schema = {
        body: Joi.object({
          age: Joi.number().integer().min(0).max(150).required(),
        })
      };
      const middleware = validateRequestSchema(schema);
      const req = { body: { age: 'not-a-number' }, query: {}, params: {} };
      const res = makeRes();
      const next = jest.fn();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.bodySent.errors[0].field).toBe('age');
    });

    it('validates query parameters', () => {
      const schema = {
        query: Joi.object({
          limit: Joi.number().integer().min(1).max(100).required(),
        })
      };
      const middleware = validateRequestSchema(schema);
      const req = { body: {}, query: { limit: 'abc' }, params: {} };
      const res = makeRes();
      const next = jest.fn();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.bodySent.errors[0].source).toBe('query');
    });

    it('validates URL params', () => {
      const schema = {
        params: Joi.object({
          id: Joi.string().trim().min(1).required(),
        })
      };
      const middleware = validateRequestSchema(schema);
      const req = { body: {}, query: {}, params: {} };
      const res = makeRes();
      const next = jest.fn();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.bodySent.errors[0].source).toBe('params');
      expect(res.bodySent.errors[0].field).toBe('id');
    });

    it('aggregates errors from body, query, and params simultaneously', () => {
      const schema = {
        body: Joi.object({ title: Joi.string().required() }),
        query: Joi.object({ page: Joi.number().integer().required() }),
        params: Joi.object({ courseId: Joi.string().required() }),
      };
      const middleware = validateRequestSchema(schema);
      const req = { body: {}, query: {}, params: {} };
      const res = makeRes();
      const next = jest.fn();

      middleware(req, res, next);

      expect(res.bodySent.errors).toHaveLength(3);
      expect(res.bodySent.errors.map(e => e.source).sort()).toEqual(['body', 'params', 'query']);
    });

    it('reports all errors (not just the first one) for a single source', () => {
      const schema = {
        body: Joi.object({
          a: Joi.string().required(),
          b: Joi.string().required(),
          c: Joi.string().required(),
        })
      };
      const middleware = validateRequestSchema(schema);
      const req = { body: {}, query: {}, params: {} };
      const res = makeRes();
      const next = jest.fn();

      middleware(req, res, next);

      expect(res.bodySent.errors).toHaveLength(3);
    });

    it('strips unknown fields from validated body', () => {
      const schema = {
        body: Joi.object({
          name: Joi.string().required(),
        })
      };
      const middleware = validateRequestSchema(schema);
      const req = { body: { name: 'Alice', extraField: 'should be stripped' }, query: {}, params: {} };
      const res = makeRes();
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.body).toEqual({ name: 'Alice' });
      expect(req.body.extraField).toBeUndefined();
    });
  });

  describe('Standard error envelope', () => {
    it('error response contains success, message, and errors fields', () => {
      const schema = {
        body: Joi.object({ x: Joi.number().required() }),
      };
      const middleware = validateRequestSchema(schema);
      const req = { body: {}, query: {}, params: {} };
      const res = makeRes();
      const next = jest.fn();

      middleware(req, res, next);

      expect(res.bodySent).toHaveProperty('success', false);
      expect(res.bodySent).toHaveProperty('message', 'Validation failed');
      expect(res.bodySent).toHaveProperty('errors');
      expect(Array.isArray(res.bodySent.errors)).toBe(true);
      expect(res.bodySent.errors[0]).toHaveProperty('source');
      expect(res.bodySent.errors[0]).toHaveProperty('field');
      expect(res.bodySent.errors[0]).toHaveProperty('message');
    });
  });
});
