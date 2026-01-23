import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from "@supabase/supabase-js";

/**
 * Turns supabase.functions.invoke errors (incl. non-2xx) into a human-friendly message.
 * For HTTP errors tries to read JSON body returned by the Edge Function.
 */
export async function getInvokeErrorMessage(err: unknown): Promise<string> {
  if (!err) return "Неизвестная ошибка";

  if (err instanceof FunctionsHttpError) {
    try {
      const payload = await err.context.json();
      if (payload && typeof payload === "object") {
        const p: any = payload;
        const main = p.error || p.message || "Ошибка Edge Function";
        const type = p.errorType ? `${p.errorType}: ` : "";
        const hint = p.hint ? `\nПодсказка: ${p.hint}` : "";
        const details = p.details?.message ? `\nDetails: ${p.details.message}` : "";
        return `${type}${main}${details}${hint}`.trim();
      }
      return String(payload);
    } catch {
      try {
        const text = await err.context.text();
        return text || err.message;
      } catch {
        return err.message;
      }
    }
  }

  if (err instanceof FunctionsRelayError) return err.message;
  if (err instanceof FunctionsFetchError) return err.message;

  const anyErr = err as any;
  if (typeof anyErr?.message === "string") return anyErr.message;

  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}
