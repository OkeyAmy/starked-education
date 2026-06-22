// Pure-schema tests. No React/RTL, so these avoid the Babel fallback parser
// issue some other tests in this repo hit. They exercise the DoD-critical
// validation paths for issue #76.

import {
  profileSchema,
  enrollmentPersonalInfoSchema,
  paymentCardSchema,
  paymentBankSchema,
  fileMetaSchema,
  validateFile,
  assignmentTextSchema,
  assignmentCodeSchema,
  luhnCheck,
  mapServerZodErrorsToForm,
} from '../lib/schemas';

describe('Schemas — reusable primitives', () => {
  describe('luhnCheck', () => {
    it.each([
      ['4242424242424242', true],
      ['4000000000000002', true],
      ['4000000000000000', false],
      ['', false],
      ['4242424242424241', false],
    ])('returns %s for %p', (input, expected) => {
      expect(luhnCheck(input)).toBe(expected);
    });
  });
});

describe('Schemas — profileSchema', () => {
  it('accepts a complete valid payload', () => {
    const parsed = profileSchema.safeParse({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      bio: 'Mathematician',
      location: 'London',
      website: 'https://example.com',
      privacy: 'public',
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects empty name with required message', () => {
    const parsed = profileSchema.safeParse({
      name: '',
      email: 'ada@example.com',
      bio: '',
      location: '',
      website: '',
      privacy: 'public',
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const messages = parsed.error.issues.map((e) => e.message);
      expect(messages).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/required|at least 2 characters/i),
        ]),
      );
    }
  });

  it('rejects invalid email', () => {
    const parsed = profileSchema.safeParse({
      name: 'Ada',
      email: 'not-an-email',
      bio: '',
      location: '',
      website: '',
      privacy: 'public',
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0].message).toMatch(/valid email/i);
    }
  });

  it('rejects website that is not a URL', () => {
    const parsed = profileSchema.safeParse({
      name: 'Ada',
      email: 'ada@example.com',
      bio: '',
      location: '',
      website: 'not-a-url',
      privacy: 'public',
    });
    expect(parsed.success).toBe(false);
  });

  it('allows empty website as opt-out', () => {
    const parsed = profileSchema.safeParse({
      name: 'Ada',
      email: 'ada@example.com',
      bio: '',
      location: '',
      website: '',
      privacy: 'public',
    });
    expect(parsed.success).toBe(true);
  });
});

describe('Schemas — enrollmentPersonalInfoSchema', () => {
  it('accepts a complete personal-info payload', () => {
    const parsed = enrollmentPersonalInfoSchema.safeParse({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      phone: '+1 (555) 123-4567',
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects missing required fields', () => {
    const parsed = enrollmentPersonalInfoSchema.safeParse({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      // three required failures expected for firstName, lastName, email
      expect(parsed.error.issues.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('treats phone as optional', () => {
    const parsed = enrollmentPersonalInfoSchema.safeParse({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      phone: '',
    });
    expect(parsed.success).toBe(true);
  });
});

describe('Schemas — paymentCardSchema', () => {
  it('accepts a valid card', () => {
    const parsed = paymentCardSchema.safeParse({
      name: 'John Doe',
      number: '4242 4242 4242 4242',
      expiry: '12/30',
      cvv: '123',
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects card number failing Luhn checksum', () => {
    const parsed = paymentCardSchema.safeParse({
      name: 'John Doe',
      number: '4242 4242 4242 4241',
      expiry: '12/30',
      cvv: '123',
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0].message).toMatch(/checksum|luhn/i);
    }
  });

  it('rejects expired card', () => {
    const parsed = paymentCardSchema.safeParse({
      name: 'John Doe',
      number: '4242 4242 4242 4242',
      expiry: '01/20', // 2020-01 → long past
      cvv: '123',
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0].message).toMatch(/expired/i);
    }
  });

  it('rejects expiry in wrong format', () => {
    const parsed = paymentCardSchema.safeParse({
      name: 'John Doe',
      number: '4242 4242 4242 4242',
      expiry: '13/30', // month 13 invalid
      cvv: '123',
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects CVV of wrong length', () => {
    const parsed = paymentCardSchema.safeParse({
      name: 'John Doe',
      number: '4242 4242 4242 4242',
      expiry: '12/30',
      cvv: '12',
    });
    expect(parsed.success).toBe(false);
  });
});

describe('Schemas — paymentBankSchema', () => {
  it('accepts valid bank details', () => {
    const parsed = paymentBankSchema.safeParse({
      accountNumber: '12345678',
      routingNumber: '021000021',
      accountName: 'Jane Doe',
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects too-short account number', () => {
    const parsed = paymentBankSchema.safeParse({
      accountNumber: '123',
      routingNumber: '021000021',
      accountName: 'Jane Doe',
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects routing number with letters', () => {
    const parsed = paymentBankSchema.safeParse({
      accountNumber: '12345678',
      routingNumber: 'abc123',
      accountName: 'Jane Doe',
    });
    expect(parsed.success).toBe(false);
  });
});

describe('Schemas — fileMetaSchema + validateFile', () => {
  const validJpeg = {
    name: 'photo.jpg',
    size: 1024, // 1KB
    type: 'image/jpeg',
  };

  it('accepts a supported file under the size cap', () => {
    expect(fileMetaSchema.safeParse(validJpeg).success).toBe(true);
    expect(validateFile(validJpeg as unknown as File).valid).toBe(true);
  });

  it('rejects unsupported MIME type', () => {
    expect(
      validateFile({ ...validJpeg, type: 'application/x-msdownload' } as unknown as File).valid,
    ).toBe(false);
  });

  it('rejects empty file', () => {
    const result = validateFile({ ...validJpeg, size: 0 } as unknown as File);
    expect(result.valid).toBe(false);
    if (result.valid === false) {
      expect(result.error).toMatch(/empty|required/i);
    }
  });

  it('rejects file over the 100MB cap', () => {
    const result = validateFile({
      ...validJpeg,
      size: 101 * 1024 * 1024,
    } as unknown as File);
    expect(result.valid).toBe(false);
    if (result.valid === false) {
      expect(result.error).toMatch(/exceeds/i);
    }
  });
});

describe('Schemas — assignment submissions', () => {
  it('text schema rejects empty text', () => {
    const parsed = assignmentTextSchema.safeParse({ textContent: '' });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0].message).toMatch(/required/i);
    }
  });

  it('text schema trims before length check', () => {
    const parsed = assignmentTextSchema.safeParse({ textContent: '   ' });
    expect(parsed.success).toBe(false);
  });

  it('code schema rejects when language is unsupported', () => {
    const parsed = assignmentCodeSchema.safeParse({
      language: 'brainfuck',
      code: '+++[->+++++]',
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0].message).toMatch(/language/i);
    }
  });

  it('code schema rejects empty code with required message', () => {
    const parsed = assignmentCodeSchema.safeParse({
      language: 'javascript',
      code: '',
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0].message).toMatch(/required/i);
    }
  });
});

describe('Schemas — mapServerZodErrorsToForm', () => {
  it('maps server issues to matching field errors', () => {
    const calls: Array<[string, { type: string; message: string }]> = [];
    const setError = (
      name: string,
      error: { type: string; message: string },
    ) => {
      calls.push([name, error]);
    };

    mapServerZodErrorsToForm<{ firstName: string; email: string }>(setError, {
      issues: [
        { path: ['firstName'], message: 'Too short' },
        { path: ['email'], message: 'Invalid email' },
      ],
    });

    expect(calls).toEqual([
      ['firstName', { type: 'server', message: 'Too short' }],
      ['email', { type: 'server', message: 'Invalid email' }],
    ]);
  });

  it('ignores issues on unknown fields when knownFields is provided', () => {
    const calls: Array<[string, { type: string; message: string }]> = [];
    mapServerZodErrorsToForm<{ firstName: string }>(
      (n, e) => calls.push([n as string, e]),
      {
        issues: [
          { path: ['firstName'], message: 'oops' },
          { path: ['otherField'], message: 'ignore me' },
        ],
      },
      ['firstName'],
    );

    expect(calls).toHaveLength(1);
    expect(calls[0][0]).toBe('firstName');
  });

  it('accepts every field when no knownFields whitelist is supplied', () => {
    const calls: Array<[string, { type: string; message: string }]> = [];
    mapServerZodErrorsToForm<{ firstName: string }>(
      (n, e) => calls.push([n as string, e]),
      { issues: [{ path: ['firstName'], message: 'oops' }, { path: ['otherField'], message: 'allow me' }] },
    );

    expect(calls.map((c) => c[0])).toEqual(['firstName', 'otherField']);
  });

  it('no-ops on missing issues array', () => {
    expect(() =>
      mapServerZodErrorsToForm<{ a: string }>(() => {
        throw new Error('should not be called');
      }, {}),
    ).not.toThrow();
  });
});
