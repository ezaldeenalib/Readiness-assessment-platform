/**
 * Shared input sanitization utilities
 * M-03: single source of truth — imported everywhere, not duplicated per-route
 * Uses allowlist approach via validator.js rather than blocklist regex
 */
import validator from 'validator';

/**
 * Sanitize a human-readable name (full_name, entity names, etc.)
 * HTML-encodes special chars so they cannot be rendered as markup.
 * @param {*}      input    Raw value from req.body
 * @param {number} maxLen   Maximum allowed length (default 255)
 * @returns {string} Sanitized, trimmed string
 */
export function sanitizeName(input, maxLen = 255) {
  if (typeof input !== 'string') return '';
  // validator.escape converts <, >, &, ', " to HTML entities
  return validator.escape(input.trim()).slice(0, maxLen);
}

/**
 * Validate and normalize an email address.
 * @param {*} input
 * @returns {string|null} Normalized email or null if invalid
 */
export function normalizeEmail(input) {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim().toLowerCase();
  if (!validator.isEmail(trimmed)) return null;
  return trimmed;
}

/**
 * Validate that a value is a safe positive integer (for IDs).
 * @param {*} input
 * @returns {number|null}
 */
export function parseId(input) {
  const n = parseInt(input, 10);
  if (isNaN(n) || n < 1) return null;
  return n;
}

/**
 * Sanitize a free-text field (descriptions, comments).
 * Strips HTML entirely — does not encode.
 * @param {*} input
 * @param {number} maxLen
 * @returns {string}
 */
export function sanitizeText(input, maxLen = 1000) {
  if (typeof input !== 'string') return '';
  return validator.stripLow(input.trim()).slice(0, maxLen);
}
