/**
 * Tests for the lightweight validateRequestSchema middleware factory
 * (Issue #44).  The middleware is dependency-free by design, so these
 * tests substitute hand-rolled mock schemas that satisfy
 * `SchemaLike.validate` without pulling in real Joi.
 */

import { validateRequestSchema, ValidationSchema, SchemaLike } from '../../src/middleware/validateRequestSchema';

type Detail = { path: Array<string | number>; message: string; type?: string };

/**
 * Build a SchemaLike stub. Each entry maps a return shape for
 * `validate(value)`: pass `null` for the error key (or omit it) to
 * represent success; pass an array of details to represent failure.
 */
const mockSchema = (failuresByPayloadOrValue: Map<unknown, Detail[]> | Detail[] | null, defaultSuccessValue?: unknown): SchemaLike => ({
  validate: (value: unknown) => {
    if (Array.isArray(failuresByPayloadOrValue)) {
      const errors = failuresByPayloadOrValue;
      return errors.length === 0
        ? { value: defaultSuccessValue ?? value }
        : { error: { details: errors } };
    }
    if (failuresByPayloadOrValue instanceof Map) {
      const errors = failuresByPayloadOrValue.get(value) ?? [];
      return errors.length === 0
        ? { value: defaultSuccessValue ?? value }
        : { error: { details: errors } };
    }
    return { value: defaultSuccessValue ?? value };
  },
});

const makeReq = (overrides: Partial<{ body: unknown; query: unknown; params: unknown }> = {}) => ({
  body: undefined,
  query: undefined,
  params: undefined,
  ...overrides,
});

const makeRes = () => {
  const res: any = {
    statusCode: 200,
    bodySent: undefined,
  };
  res.status = jest.fn((code: number) => {
    res.statusCode = code;
    return res;
  });
  res.json = jest.fn((payload: unknown) => {
    res.bodySent = payload;
    return res;
  });
  return res;
};

describe('validateRequestSchema middleware (Issue #44)', () => {
  it('calls next() and does not respond when validation passes', () => {
    const schema: ValidationSchema = {
      body: mockSchema([]),
      query: mockSchema([]),
      params: mockSchema([]),
    };
    const middleware = validateRequestSchema(schema);
    const req = makeReq({ body: { a: 1 }, query: { b: 2 }, params: { c: 3 } });
    const res = makeRes();
    const next = jest.fn();

    middleware(req as any, res as any, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  it('returns the standard envelope { success:false, message, errors } on failure', () => {
    const schema: ValidationSchema = {
      body: mockSchema([{ path: ['ownerAddress'], message: '"ownerAddress" is required', type: 'any.required' }]),
    };
    const middleware = validateRequestSchema(schema);
    const req = makeReq({ body: {} });
    const res = makeRes();
    const next = jest.fn();

    middleware(req as any, res as any, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.bodySent).toEqual({
      success: false,
      message: 'Validation failed',
      errors: [{ source: 'body', field: 'ownerAddress', message: '"ownerAddress" is required' }],
    });
  });

  it('aggregates errors across all three sources (body + query + params)', () => {
    const schema: ValidationSchema = {
      body: mockSchema([{ path: ['walletAddress'], message: 'bad body', type: 'string.pattern.base' }]),
      query: mockSchema([{ path: ['limit'], message: 'bad query', type: 'number.base' }]),
      params: mockSchema([{ path: ['recoveryId'], message: 'bad param', type: 'string.pattern.base' }]),
    };
    const middleware = validateRequestSchema(schema);
    const req = makeReq({ body: {}, query: { limit: 'x' }, params: { recoveryId: 'nope' } });
    const res = makeRes();
    const next = jest.fn();

    middleware(req as any, res as any, next);

    expect(res.bodySent.errors).toEqual([
      { source: 'body', field: 'walletAddress', message: 'bad body' },
      { source: 'query', field: 'limit', message: 'bad query' },
      { source: 'params', field: 'recoveryId', message: 'bad param' },
    ]);
  });

  it('aggregates every body error, not just the first (abortEarly:false semantics)', () => {
    const schema: ValidationSchema = {
      body: mockSchema([
        { path: ['walletAddress'], message: 'msg1', type: 'string.pattern.base' },
        { path: ['value'], message: 'msg2', type: 'string.pattern.base' },
        { path: ['signature'], message: 'msg3', type: 'string.pattern.base' },
      ]),
    };
    const middleware = validateRequestSchema(schema);
    const req = makeReq({ body: {} });
    const res = makeRes();
    const next = jest.fn();

    middleware(req as any, res as any, next);

    expect(res.bodySent.errors).toHaveLength(3);
  });

  it('does not run body validation when body schema is not provided', () => {
    const schema: ValidationSchema = {
      query: mockSchema([]),
    };
    const middleware = validateRequestSchema(schema);
    const req = makeReq({ body: { anything: true } });
    const res = makeRes();
    const next = jest.fn();

    middleware(req as any, res as any, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('strips unknown top-level keys from validated body when schema strips them', () => {
    // The mock schema returns a sanitized value when validation succeeds.
    const schema: ValidationSchema = {
      body: {
        validate: () => ({ value: { keep: 'yes' } } satisfies ReturnType<SchemaLike['validate']>),
      },
    };
    const middleware = validateRequestSchema(schema);
    const req = makeReq({ body: { keep: 'yes', drop: 'no' } });
    const res = makeRes();
    const next = jest.fn();

    middleware(req as any, res as any, next);

    expect(req.body).toEqual({ keep: 'yes' });
    expect(next).toHaveBeenCalled();
  });

  it('skips sources whose schema is undefined', () => {
    const schema: ValidationSchema = {
      body: mockSchema([]),
    };
    const middleware = validateRequestSchema(schema);
    const req = makeReq({ body: { ok: 1 }, query: { foo: 'bar' }, params: { id: '0xabc' } });
    const res = makeRes();
    const next = jest.fn();

    middleware(req as any, res as any, next);

    // Only body schema declared — query/params must NOT be inspected.
    expect(next).toHaveBeenCalled();
  });

  it('produces an error whose field label falls back to "(root)" when path is empty', () => {
    const schema: ValidationSchema = {
      body: mockSchema([{ path: [], message: 'something is wrong', type: 'object.unknown' }]),
    };
    const middleware = validateRequestSchema(schema);
    const req = makeReq({ body: {} });
    const res = makeRes();
    const next = jest.fn();

    middleware(req as any, res as any, next);

    expect(res.bodySent.errors[0]).toEqual({
      source: 'body',
      field: '(root)',
      message: 'something is wrong',
    });
  });
});
