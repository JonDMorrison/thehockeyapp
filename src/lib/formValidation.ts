import type { ZodError } from "zod";

export function getZodFieldErrors(error: ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.errors) {
    const field = issue.path[0];
    if (typeof field === "string" && !errors[field]) {
      errors[field] = issue.message;
    }
  }
  return errors;
}

export function focusFirstInvalidField(
  errors: Record<string, string>,
  fieldIds: Record<string, string>,
) {
  const firstField = Object.keys(errors).find((field) => fieldIds[field]);
  if (!firstField) return;

  requestAnimationFrame(() => {
    document.getElementById(fieldIds[firstField])?.focus();
  });
}
