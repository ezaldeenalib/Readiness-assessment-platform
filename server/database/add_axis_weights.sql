-- Migration: Add axis_weights JSONB column to templates table
-- Purpose: Store axis/section weights as JSON { "axisName": percentageWeight }
--          so that the TemplateWeightManager can persist and restore weight distributions.
-- Percentage mode: when axis_weights is non-empty, all override_weights sum to 100
--                  and scores are normalized relative to total 100 points.

ALTER TABLE templates
  ADD COLUMN IF NOT EXISTS axis_weights JSONB DEFAULT '{}'::jsonb;

-- Widen override_weight precision to support 2-decimal percentages
ALTER TABLE template_questions
  ALTER COLUMN override_weight TYPE DECIMAL(8,4);

COMMENT ON COLUMN templates.axis_weights IS
  'JSON map of axis/section name → weight percentage. When populated, all template_questions.override_weight values sum to 100 and scoring uses percentage mode.';
