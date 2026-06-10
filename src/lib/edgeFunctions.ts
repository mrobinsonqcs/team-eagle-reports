import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

/**
 * Invokes a Supabase Edge Function and throws an Error with the function's
 * own `{ error: "..." }` message when it returns a non-2xx response.
 */
export async function invokeFunction<T = unknown>(
  name: string,
  body: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });

  if (error) {
    if (error instanceof FunctionsHttpError) {
      let message: string | undefined;
      try {
        const parsed = await error.context.json();
        if (typeof parsed?.error === 'string') message = parsed.error;
      } catch {
        // response body wasn't JSON; fall back to the generic message below
      }
      if (message) throw new Error(message);
    }
    throw new Error(error.message);
  }

  return data as T;
}
