/** Serialize structured data without allowing a field to close its HTML script element. */
export function jsonLdStringify(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
