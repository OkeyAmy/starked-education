import { z } from 'zod';

// =============================================================================
// Reusable primitives
// =============================================================================

/**
 * E-mail schema used across every form. `trim()` ensures whitespace-only
 * values are rejected by both `.min(1)` (required) and `.email()` (format).
 */
export const emailSchema = z
  .string({ message: 'Email is required' })
  .trim()
  .min(1, 'Email is required')
  .email('Please enter a valid email address');

/**
 * Optional international phone — accepts `+`, digits, spaces, parentheses,
 * dashes. Empty string is treated as unset (`.optional()`).
 */
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^[+()\d\s-]{7,20}$/u, 'Please enter a valid phone number')
  .optional()
  .or(z.literal(''));

/**
 * Optional URL — empty string allowed. Otherwise must start with http(s)://
 * and parse as a URL.
 */
export const urlSchema = z
  .string()
  .trim()
  .url('Please enter a valid URL (https://...)')
  .optional()
  .or(z.literal(''));

/** 2–50 character name field with separate messages for empty vs. too-short
 *  so the form can show "Required" and "Too short" distinctly. */
export const nameSchema = z
  .string({ message: 'Name is required' })
  .trim()
  .min(1, 'Name is required')
  .min(2, 'Name must be at least 2 characters')
  .max(50, 'Name cannot exceed 50 characters');

// =============================================================================
// Form: ProfileEditor
// =============================================================================

/**
 * `ProfileFormData` mirrors `frontend/src/types/profile.ts`'s
 * `ProfileFormData`. The Zod-inferred type replaces the manual interface
 * for any new consumers; the original interface is kept for backward
 * compatibility within `useProfile.ts`.
 */
export const profileSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  bio: z
    .string()
    .trim()
    .max(500, 'Bio cannot exceed 500 characters')
    .optional()
    .default(''),
  location: z
    .string()
    .trim()
    .max(100, 'Location cannot exceed 100 characters')
    .optional()
    .default(''),
  website: urlSchema,
  privacy: z.enum(['public', 'private', 'friends-only']),
});

export type ProfileFormDataZ = z.infer<typeof profileSchema>;
/**
 * `ProfileFormDataIn` is the INPUT shape (`z.input`) — the pre-defaults
 * version of the schema with `.optional()` fields still optional. Used as
 * the React Hook Form `TFieldValues` generic so `zodResolver` and the
 * `reset({ ...default values })` call line up. Use `ProfileFormDataZ`
 * (the OUTPUT type) as the third generic to `useForm` and as the
 * `handleSubmit(onSubmit)` callback's argument type.
 */
export type ProfileFormDataIn = z.input<typeof profileSchema>;

// =============================================================================
// Form: EnrollmentForm — step 1 (personal info)
// =============================================================================

export const enrollmentPersonalInfoSchema = z.object({
  firstName: z
    .string({ message: 'First name is required' })
    .trim()
    .min(1, 'First name is required')
    .max(50, 'First name cannot exceed 50 characters'),
  lastName: z
    .string({ message: 'Last name is required' })
    .trim()
    .min(1, 'Last name is required')
    .max(50, 'Last name cannot exceed 50 characters'),
  email: emailSchema,
  phone: phoneSchema,
});

export type EnrollmentPersonalInfo = z.infer<typeof enrollmentPersonalInfoSchema>;

// =============================================================================
// Form: PaymentMethodSelector — credit card
// =============================================================================

/** Luhn algorithm check (mod-10). Returns true for valid card numbers. */
export function luhnCheck(num: string): boolean {
  if (!num || !/^\d+$/.test(num)) return false;
  let sum = 0;
  let alt = false;
  for (let i = num.length - 1; i >= 0; i -= 1) {
    let n = num.charCodeAt(i) - 48;
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

const cardNumberSchema = z
  .string({ message: 'Card number is required' })
  .trim()
  .min(13, 'Card number is too short')
  .max(23, 'Card number is too long')
  .refine(
    (raw) => {
      const digits = raw.replace(/\s+/gu, '');
      return luhnCheck(digits);
    },
    { message: 'Card number failed checksum (Luhn)' },
  );

const cardExpirySchema = z
  .string({ message: 'Expiry date is required' })
  .trim()
  .regex(/^(0[1-9]|1[0-2])\/(\d{2})$/u, 'Use MM/YY format')
  .refine(
    (v) => {
      const match = v.match(/^(\d{2})\/(\d{2})$/u);
      if (!match) return false;
      const month = Number(match[1]);
      const year = 2000 + Number(match[2]);
      // Last instant of the expiry month
      const last = new Date(year, month, 0, 23, 59, 59, 999);
      return last.getTime() >= Date.now();
    },
    { message: 'Card is expired' },
  );

const cardCvvSchema = z
  .string({ message: 'CVV is required' })
  .trim()
  .regex(/^\d{3,4}$/u, 'CVV must be 3 or 4 digits');

export const paymentCardSchema = z.object({
  name: z
    .string({ message: 'Cardholder name is required' })
    .trim()
    .min(1, 'Cardholder name is required'),
  number: cardNumberSchema,
  expiry: cardExpirySchema,
  cvv: cardCvvSchema,
});

export type PaymentCardData = z.infer<typeof paymentCardSchema>;

// =============================================================================
// Form: PaymentMethodSelector — bank transfer
// =============================================================================

export const paymentBankSchema = z.object({
  accountNumber: z
    .string({ message: 'Account number is required' })
    .trim()
    .regex(/^\d{6,20}$/u, 'Account number must be 6–20 digits'),
  routingNumber: z
    .string({ message: 'Routing number is required' })
    .trim()
    .regex(/^\d{6,12}$/u, 'Routing number must be 6–12 digits'),
  accountName: z
    .string({ message: 'Account name is required' })
    .trim()
    .min(1, 'Account name is required'),
});

export type PaymentBankData = z.infer<typeof paymentBankSchema>;

// =============================================================================
// File upload (ContentUploader + AssignmentSubmission)
// =============================================================================

export const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100MB

export const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];
export const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/webm'];
export const ACCEPTED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav'];
export const ACCEPTED_DOCUMENT_TYPES = [
  'application/pdf',
  'text/plain',
  'application/json',
  'text/markdown',
];

export const ACCEPTED_FILE_TYPES = [
  ...ACCEPTED_IMAGE_TYPES,
  ...ACCEPTED_VIDEO_TYPES,
  ...ACCEPTED_AUDIO_TYPES,
  ...ACCEPTED_DOCUMENT_TYPES,
];

/**
 * Schema for a single file's metadata. Used by the drop-zone validation
 * helper. Note: real `File` instances expose a `name`, `size` and `type`
 * property — we mirror those here so we can call `safeParse` without
 * coupling the validator to a browser type.
 */
export const fileMetaSchema = z.object({
  name: z.string().min(1, 'File name is required'),
  size: z
    .number({ message: 'File size is required' })
    .int('File size must be an integer')
    .min(1, 'File is empty')
    .max(
      MAX_FILE_SIZE_BYTES,
      `File size exceeds ${Math.round(MAX_FILE_SIZE_BYTES / (1024 * 1024))}MB limit`,
    ),
  type: z
    .string()
    .refine((t) => (ACCEPTED_FILE_TYPES as string[]).includes(t), {
      message: 'File type not supported',
    }),
});

export type FileMeta = z.infer<typeof fileMetaSchema>;

/**
 * Convenience wrapper for the drop-zone: returns a discriminated union so
 * callers can render the error inline without parsing the full result.
 */
export function validateFile(
  file: Pick<File, 'name' | 'size' | 'type'>,
): { valid: true } | { valid: false; error: string } {
  const result = fileMetaSchema.safeParse({
    name: file.name,
    size: file.size,
    type: file.type,
  });
  if (result.success) return { valid: true };
  // First error wins so the UI shows one actionable message.
  const first = result.error.issues[0];
  return { valid: false, error: first?.message ?? 'Invalid file' };
}

// =============================================================================
// Form: AssignmentSubmission
// =============================================================================

export const assignmentTextSchema = z.object({
  textContent: z
    .string({ message: 'Text content is required' })
    .trim()
    .min(1, 'Text content is required')
    .max(50_000, 'Text submission is too long (max 50,000 characters)'),
});

export type AssignmentTextSubmission = z.infer<typeof assignmentTextSchema>;

export const CODE_LANGUAGES = [
  'javascript',
  'python',
  'java',
  'cpp',
  'c',
  'php',
  'ruby',
  'go',
  'rust',
] as const;

export const assignmentCodeSchema = z.object({
  language: z.enum(CODE_LANGUAGES, {
    message: 'Please select a supported programming language',
  }),
  code: z
    .string({ message: 'Code submission is required' })
    .trim()
    .min(1, 'Code submission is required'),
});

export type AssignmentCodeSubmission = z.infer<typeof assignmentCodeSchema>;

export const SUPPORTED_SUBMISSION_TYPES = ['text', 'code', 'file'] as const;
export type SupportedSubmissionType = (typeof SUPPORTED_SUBMISSION_TYPES)[number];

/**
 * Maps a ZodError-style response from the backend (or any client-side
 * `safeParse` result) onto React Hook Form's `setError`, fulfilling the
 * DoD item: "Server-side validation errors mapped to form fields".
 *
 * IMPORTANT: TypeScript types are erased at runtime, so we can NOT
 * derive the field-name whitelist from the generic `TFieldValues`
 * parameter. Callers must pass `knownFields` explicitly OR omit it
 * (in which case every issue becomes a setError call — safe because
 * setError is a no-op for unknown paths anyway, but it does mean
 * typos will silently produce field-level errors instead of being
 * dropped). The explicit-whitelist form is preferred for production.
 */
export function mapServerZodErrorsToForm<TFieldValues extends Record<string, unknown>>(
  // React Hook Form's `UseFormSetError` signature is broader than what
  // we'd want to redeclare here: its first arg is a `FieldPath<TFieldValues>`
  // recursive-string-union and its second arg has several required fields
  // (`types`, etc.). Since this helper is a thin bridge between a Zod
  // `issues[]` array and an RHF form, we widen to `any`/`any` and let
  // the `knownFields` whitelist enforce real type-safety at the call
  // site. The two `any`s here do not bleed into call-site code; the
  // export surface (`mapServerZodErrorsToForm<T>(setError, body, fields)`)
  // is the same.
  setError: (name: any, error: any) => void,
  errorResponse: {
    issues?: Array<{ path: Array<string | number>; message: string }>;
  },
  knownFields?: ReadonlyArray<keyof TFieldValues | string>,
): void {
  if (!errorResponse?.issues?.length) return;
  const KNOWN = knownFields ? new Set(knownFields as ReadonlyArray<string>) : null;
  for (const issue of errorResponse.issues) {
    const head = issue.path[0];
    if (typeof head !== 'string') continue;
    if (KNOWN !== null && !KNOWN.has(head)) continue;
    setError(head as keyof TFieldValues, {
      type: 'server',
      message: issue.message,
    });
  }
}
