/**
 * Extracts a message from a thrown value. The Resend SDK rejects with plain
 * `{ message, name, statusCode }` objects that aren't `instanceof Error`, so
 * `error instanceof Error ? error.message : 'Unknown error'` loses the
 * actual reason (e.g. "domain not verified").
 */
export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message;
  }
  return 'Unknown error';
}
