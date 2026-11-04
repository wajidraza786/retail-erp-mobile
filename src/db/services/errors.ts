export type FieldError = { field: string; message: string };

/** Thrown by services when input is invalid. Forms show `errors[].message` in ErrorBanners. */
export class ValidationError extends Error {
  readonly errors: FieldError[];

  constructor(errors: FieldError[]) {
    super(errors.map((e) => e.message).join('\n'));
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

/** Thrown when a document's postings don't balance. Indicates a bug, never user error. */
export class UnbalancedError extends Error {
  constructor(debit: number, credit: number) {
    super(`Postings do not balance: debit ${debit} ≠ credit ${credit}`);
    this.name = 'UnbalancedError';
  }
}

export function errorMessages(e: unknown): string[] {
  if (e instanceof ValidationError) return e.errors.map((x) => x.message);
  if (e instanceof Error) return [e.message];
  return ['Something went wrong.'];
}
