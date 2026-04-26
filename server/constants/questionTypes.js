/**
 * Question Types - Single Source of Truth
 * أنواع الأسئلة - مصدر واحد للحقيقة
 *
 * Keep Frontend, Backend, and DB in sync:
 * - Backend: use VALID_QUESTION_TYPES for validation
 * - DB: run add_multiselect_type.sql (or migration) so CHECK constraint matches this list
 * - Frontend: use same values in questionTypesList / question_type
 */

/** All valid question_type values allowed in DB and API */
export const VALID_QUESTION_TYPES = Object.freeze([
  'Manual',
  'YesNo',
  'MultiChoice',
  'MultiSelect',
  'StaticData',
  'Composite'
]);

/** SQL-safe list for CHECK constraint (same order as VALID_QUESTION_TYPES) */
export const QUESTION_TYPES_SQL_LIST = VALID_QUESTION_TYPES
  .map(t => `'${t}'`)
  .join(', ');

/**
 * Validate question_type before insert/update.
 * @param {string} questionType - value from request body
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateQuestionType(questionType) {
  if (!questionType || typeof questionType !== 'string') {
    return { valid: false, error: 'question_type is required and must be a string' };
  }
  const trimmed = questionType.trim();
  if (!VALID_QUESTION_TYPES.includes(trimmed)) {
    return {
      valid: false,
      error: `question_type must be one of: ${VALID_QUESTION_TYPES.join(', ')}`
    };
  }
  return { valid: true };
}

/**
 * Normalize question_type (trim, no mapping needed if UI sends same as DB).
 * Use this if you ever need to map UI values to DB values.
 * @param {string} questionType
 * @returns {string|null} normalized value or null if invalid
 */
export function normalizeQuestionType(questionType) {
  if (!questionType || typeof questionType !== 'string') return null;
  const trimmed = questionType.trim();
  return VALID_QUESTION_TYPES.includes(trimmed) ? trimmed : null;
}

/**
 * Express middleware: validate req.body.question_type when present.
 * Use on POST/PUT question routes so invalid question_type never reaches DB.
 * @param {object} req
 * @param {object} res
 * @param {function} next
 */
export function validateQuestionTypeMiddleware(req, res, next) {
  const questionType = req.body?.question_type;
  if (questionType === undefined || questionType === null) return next();
  const result = validateQuestionType(questionType);
  if (!result.valid) {
    return res.status(400).json({ success: false, message: result.error });
  }
  next();
}
