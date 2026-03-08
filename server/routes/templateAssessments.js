/**
 * Template-based Assessment Routes
 * Create assessments from templates with automatic scoring
 */

import express from 'express';
import pool from '../database/db.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { logAudit } from '../utils/auditLog.js';

const router = express.Router();

/** مستخدم الجهة يمكنه الوصول فقط للجهات في institutions أو entity_id */
function entityUserCanAccess(req, entityId) {
  if (req.user.role !== 'entity_user') return true;
  const id = parseInt(entityId, 10);
  const allowed = req.user.institutions?.length > 0 ? req.user.institutions : (req.user.entity_id != null ? [req.user.entity_id] : []);
  return allowed.includes(id);
}

// ============================================
// REFERENCE FORMAT PARSER
// ============================================

/**
 * Parse answer into reference format for assessment_reference_values
 * يدعم: [{reference_id, quantity, attributes:[{attribute_type, reference_id}]}]
 * يُزيل: nulls, عناصر بدون reference_id, صفوف فارغة
 */
function parseReferenceFormat(answerValue, question) {
  if (!answerValue) return null;

  // الصيغة الجديدة: مصفوفة مراجع (قد تحتوي nulls من الصفوف الفارغة)
  if (Array.isArray(answerValue) && answerValue.length > 0) {
    const first = answerValue.find(Boolean);
    if (first && typeof first === 'object' && 'reference_id' in first) {
      return answerValue
        .filter(item => item && typeof item === 'object' && item.reference_id)
        .map(item => ({
          reference_id: parseInt(item.reference_id, 10),
          quantity: Math.max(1, parseInt(item.quantity, 10) || 1),
          attributes: Array.isArray(item.attributes)
            ? item.attributes
                .filter(a => a && a.attribute_type && a.reference_id)
                .map(a => ({
                  attribute_type: String(a.attribute_type),
                  reference_id: parseInt(a.reference_id, 10)
                }))
                .filter(a => !isNaN(a.reference_id))
            : []
        }))
        .filter(item => !isNaN(item.reference_id));
    }
  }

  // MultiSelect with options_from_reference
  const optsRef = question.options && (typeof question.options === 'string'
    ? (() => { try { return JSON.parse(question.options); } catch { return {}; } })()
    : question.options);
  if (optsRef?.__options_from_reference && typeof answerValue === 'object' && Array.isArray(answerValue.selected)) {
    return answerValue.selected
      .map(id => ({ reference_id: parseInt(id, 10), quantity: 1, attributes: [] }))
      .filter(item => !isNaN(item.reference_id));
  }
  return null;
}

// ============================================
// SCORING ENGINE
// ============================================

/** الوزن المستخدم في التقييم: من القالب (override) أو من بنك الأسئلة — حتى تكون النسبة المئوية صحيحة */
function getEffectiveWeight(question) {
  const w = question.effective_weight != null && question.effective_weight !== undefined
    ? question.effective_weight
    : question.weight;
  return parseFloat(w || 0);
}

/**
 * Evaluate a single answer based on question rules.
 * usePercentageMode: when true, override_weight IS the question's percentage share of 100.
 *   - YesNo/Composite/Manual: score = effective_weight (full) or 0
 *   - MultiChoice/MultiSelect: score = effective_weight × (selected / max) — proportional credit
 */
function evaluateAnswer(question, answerValue, staticDataValue, usePercentageMode = false) {
  const valueToEvaluate = staticDataValue || answerValue;

  // الأسئلة المركبة تُعالَج بدالة خاصة — لا نمنعها بـ "No value provided"
  if (question.question_type === 'Composite') {
    return evaluateComposite(question, answerValue);
  }

  // للأسئلة الأخرى: إذا لم تكن هناك قيمة تُعطى نتيجة "No value provided"
  if (!valueToEvaluate && question.question_type !== 'YesNo') {
    return {
      passed: false,
      score: 0,
      notes: 'No value provided'
    };
  }

  // Handle different question types - النظام الجديد
  switch (question.question_type) {
    case 'StaticData':
    case 'StaticDataLinked': // للحفاظ على التوافق
    case 'Manual':
      return evaluateRuleBased(question, valueToEvaluate);
    
    case 'YesNo':
      return evaluateYesNo(question, answerValue);
    
    case 'MultiChoice':
      return evaluateMultiChoice(question, answerValue, usePercentageMode);
    
    case 'MultiSelect':
      return evaluateMultiSelect(question, answerValue, usePercentageMode);
    
    case 'ParentChild': // للحفاظ على التوافق
      return evaluateRuleBased(question, valueToEvaluate);
    
    default:
      return {
        passed: true,
        score: getEffectiveWeight(question),
        notes: 'No evaluation rule - full credit given'
      };
  }
}

/**
 * Evaluate rule-based questions (>, <, =, etc.)
 */
function evaluateRuleBased(question, value) {
  const effectiveWeight = getEffectiveWeight(question);
  if (!question.evaluation_rule || !question.reference_value) {
    return {
      passed: true,
      score: effectiveWeight,
      notes: 'No evaluation rule - full credit given'
    };
  }

  let passed = false;
  const refValue = question.reference_value;
  const refValueMax = question.reference_value_max;

  // Convert to appropriate types for comparison
  const numValue = parseFloat(value);
  const numRef = parseFloat(refValue);
  const isNumeric = !isNaN(numValue) && !isNaN(numRef);

  switch (question.evaluation_rule) {
    case 'greater_than':
      passed = isNumeric ? numValue > numRef : false;
      break;
    
    case 'less_than':
      passed = isNumeric ? numValue < numRef : false;
      break;
    
    case 'equals':
      passed = isNumeric ? numValue === numRef : value.toString().toLowerCase() === refValue.toLowerCase();
      break;
    
    case 'not_equals':
      passed = isNumeric ? numValue !== numRef : value.toString().toLowerCase() !== refValue.toLowerCase();
      break;
    
    case 'greater_or_equal':
      passed = isNumeric ? numValue >= numRef : false;
      break;
    
    case 'less_or_equal':
      passed = isNumeric ? numValue <= numRef : false;
      break;
    
    case 'contains':
      passed = value.toString().toLowerCase().includes(refValue.toLowerCase());
      break;
    
    case 'exists':
      passed = value !== null && value !== undefined && value !== '';
      break;
    
    case 'in_range':
      if (isNumeric && refValueMax) {
        const numRefMax = parseFloat(refValueMax);
        passed = numValue >= numRef && numValue <= numRefMax;
      } else {
        passed = false;
      }
      break;
    
    default:
      passed = false;
  }

  return {
    passed,
    score: passed ? effectiveWeight : 0,
    notes: passed ? 'Evaluation passed' : `Failed: ${value} does not meet ${question.evaluation_rule} ${refValue}`
  };
}

/**
 * Evaluate Yes/No questions
 */
function evaluateYesNo(question, answer) {
  const effectiveWeight = getEffectiveWeight(question);
  const isYes = answer && (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'true' || answer === '1');
  
  return {
    passed: isYes,
    score: isYes ? effectiveWeight : 0,
    notes: isYes ? 'Yes selected' : 'No selected'
  };
}

/**
 * Evaluate Multi-Choice questions
 * usePercentageMode: score is normalized to effective_weight (the question's % share of 100)
 */
function evaluateMultiChoice(question, answer, usePercentageMode = false) {
  if (!question.options || answer === undefined || answer === null) {
    return {
      passed: false,
      score: 0,
      notes: 'No answer provided'
    };
  }

  const options = typeof question.options === 'string' ? JSON.parse(question.options) : question.options;
  const mainOpts = options && typeof options === 'object' ? Object.entries(options).filter(([k]) => k !== '__other_options' && k !== '__otherOptionKey' && typeof options[k] === 'number') : [];
  const optsObj = Object.fromEntries(mainOpts);
  const selectedKey = typeof answer === 'object' && answer !== null && 'selected' in answer ? answer.selected : answer;
  const otherText = typeof answer === 'object' && answer !== null && 'other_text' in answer ? (answer.other_text || '') : '';
  const rawScore = optsObj[selectedKey] ?? 0;
  const values = Object.values(optsObj);
  const maxScore = values.length > 0 ? Math.max(...values) : 0;

  // وضع النسبة المئوية: تحويل الدرجة إلى نسبة من effective_weight
  const effectiveWeight = getEffectiveWeight(question);
  const score = usePercentageMode && maxScore > 0
    ? Math.round((rawScore / maxScore) * effectiveWeight * 100) / 100
    : rawScore;

  let notes = `Selected: ${selectedKey} (${rawScore}/${maxScore} points)`;
  if (usePercentageMode) notes += ` → ${score}% contribution`;
  if (otherText.trim()) notes += ` — نص خارجي: ${otherText.trim()}`;

  return {
    passed: rawScore > 0,
    score,
    notes
  };
}

/**
 * Evaluate Multi-Select questions (اختيار أكثر من إجابة)
 * - إذا كانت الخيارات كلها 0 أو 1 (صحيح/خطأ): الدرجة = (عدد الخيارات الصحيحة المختارة ÷ إجمالي الخيارات الصحيحة) × وزن السؤال
 * - وإلا (تراجع): الدرجة كنسبة من مجموع النقاط المختارة من مجموع كل النقاط
 * usePercentageMode: score normalized to effective_weight
 */
function evaluateMultiSelect(question, answer, usePercentageMode = false) {
  if (!answer) {
    return {
      passed: false,
      score: 0,
      notes: 'No answer provided'
    };
  }

  const opts = question.options ? (typeof question.options === 'string' ? JSON.parse(question.options) : question.options) : {};
  const mainOpts = Object.entries(opts).filter(([k]) => k !== '__other_options' && k !== '__otherOptionKey' && (typeof opts[k] === 'number' || opts[k] === true));
  const optsObj = Object.fromEntries(mainOpts.map(([k, v]) => [k, v === true ? 1 : Number(v)]));
  const useRefOptions = opts?.__options_from_reference;

  const value = typeof answer === 'string' ? (answer.startsWith('{') ? JSON.parse(answer) : { selected: [], other_values: {} }) : answer;
  const selected = value?.selected || [];
  const effectiveWeight = getEffectiveWeight(question);

  // خيارات من مرجع خارجي: اختيار واحد أو أكثر = full weight
  if (useRefOptions) {
    const rawScore = selected.length > 0 ? effectiveWeight : 0;
    return {
      passed: selected.length > 0,
      score: rawScore,
      notes: `Selected ${selected.length} option(s)`
    };
  }

  const values = Object.values(optsObj);
  const allBinary = values.length > 0 && values.every(v => v === 0 || v === 1);

  if (allBinary) {
    // نظام الخيارات الصحيحة فقط: 100% موزعة على الصحيحة بالتساوي
    const totalCorrect = values.filter(v => v === 1).length;
    const correctKeys = mainOpts.filter(([, v]) => (v === true ? 1 : Number(v)) === 1).map(([k]) => k);
    const selectedCorrectCount = selected.filter(key => correctKeys.includes(key)).length;
    const score = totalCorrect > 0
      ? Math.round((selectedCorrectCount / totalCorrect) * effectiveWeight * 100) / 100
      : 0;
    const pctPerCorrect = totalCorrect > 0 ? (100 / totalCorrect).toFixed(1) : 0;
    return {
      passed: selectedCorrectCount > 0,
      score,
      notes: `Selected ${selectedCorrectCount}/${totalCorrect} correct (${pctPerCorrect}% per correct). Score: ${score}/${effectiveWeight}`
    };
  }

  // تراجع: خيارات بنقاط مختلفة — نسبة من المجموع
  let rawScore = 0;
  let maxScore = 0;
  for (const key of selected) {
    if (optsObj[key] !== undefined) rawScore += Number(optsObj[key]);
  }
  maxScore = Object.values(optsObj).reduce((s, n) => s + Number(n), 0);

  const score = maxScore > 0 && usePercentageMode
    ? Math.round((rawScore / maxScore) * effectiveWeight * 100) / 100
    : rawScore;

  return {
    passed: selected.length > 0,
    score,
    notes: `Selected ${selected.length} option(s)${maxScore ? ` (${rawScore}/${maxScore} points${usePercentageMode ? ` → ${score} contribution` : ''})` : ''}`
  };
}

/**
 * Evaluate Composite questions - النظام الجديد (reference_values أو JSON)
 */
function evaluateComposite(question, answer) {
  if (!answer) {
    return { passed: false, score: 0, notes: 'No answer provided' };
  }

  // تحويل القيمة إلى مصفوفة بأي صيغة وردت
  let answerArray;
  if (Array.isArray(answer)) {
    answerArray = answer;
  } else if (typeof answer === 'string') {
    try { answerArray = JSON.parse(answer); } catch { answerArray = []; }
  } else {
    answerArray = [];
  }

  // عدّ الصفوف المملوءة فقط (التي لها reference_id)
  const filledRows = Array.isArray(answerArray)
    ? answerArray.filter(item => item && item.reference_id != null)
    : [];

  if (filledRows.length > 0) {
    return {
      passed: true,
      score: getEffectiveWeight(question),
      notes: `Composite answer with ${filledRows.length} row(s)`
    };
  }

  return { passed: false, score: 0, notes: 'Composite: no rows provided' };
}

// ============================================
// CREATE ASSESSMENT FROM TEMPLATE
// ============================================
router.post('/create', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const {
      entity_id,
      template_id,
      year,
      quarter
    } = req.body;

    // Validation
    if (!entity_id || !template_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        success: false, 
        message: 'Required fields: entity_id, template_id' 
      });
    }

    // Check permissions
    if (req.user.role === 'entity_user' && !entityUserCanAccess(req, entity_id)) {
      await client.query('ROLLBACK');
      return res.status(403).json({ 
        success: false, 
        message: 'You can only create assessments for your own entity' 
      });
    }

    // Get template with questions - النظام الجديد
    const templateResult = await client.query(`
      SELECT 
        t.*,
        json_agg(
          json_build_object(
            'id', q.id,
            'text_en', q.text_en,
            'text_ar', q.text_ar,
            'question_text', q.text_en,
            'question_text_ar', q.text_ar,
            'question_type', q.question_type,
            'parent_question_id', q.parent_question_id,
            'trigger_answer_value', q.trigger_answer_value,
            'composite_columns', q.composite_columns,
            'weight', COALESCE(tq.override_weight, q.weight),
            'category', q.category,
            'display_order', tq.display_order,
            'section_name', tq.section_name,
            'section_name_ar', tq.section_name_ar
          ) ORDER BY tq.display_order
        ) as questions
      FROM templates t
      JOIN template_questions tq ON t.id = tq.template_id
      JOIN Questions q ON tq.question_id = q.id
      WHERE t.id = $1 AND t.is_active = true AND q.is_active = true
      GROUP BY t.id
    `, [template_id]);

    if (templateResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ 
        success: false, 
        message: 'Template not found or inactive' 
      });
    }

    const template = templateResult.rows[0];

    // Parse questions if it's a string (JSONB from PostgreSQL)
    let questions = template.questions;
    if (typeof questions === 'string') {
      try {
        questions = JSON.parse(questions);
      } catch (e) {
        console.error('Error parsing questions JSON:', e);
        questions = [];
      }
    }
    
    if (!Array.isArray(questions) || questions.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        success: false, 
        message: 'Template has no questions' 
      });
    }

    template.questions = questions;

    // Calculate total possible score (only questions that include_in_evaluation = true)
    // Get include_in_evaluation from template_questions
    const questionsWithEvaluationFlag = await client.query(`
      SELECT q.id, tq.include_in_evaluation, COALESCE(tq.override_weight, q.weight) as effective_weight
      FROM template_questions tq
      JOIN Questions q ON tq.question_id = q.id
      WHERE tq.template_id = $1 AND q.is_active = true
    `, [template_id]);
    
    const evaluationMap = new Map();
    questionsWithEvaluationFlag.rows.forEach(row => {
      evaluationMap.set(row.id, row.include_in_evaluation !== false);
    });
    
    const totalPossibleScore = questions.reduce((sum, q) => {
      const includeInEval = evaluationMap.get(q.id) !== false; // Default to true if not found
      if (!includeInEval) return sum;
      return sum + parseFloat(q.weight || 0);
    }, 0);

    // Create main assessment record
    const assessmentResult = await client.query(`
      INSERT INTO assessments (
        entity_id, created_by, status, year, quarter
      ) VALUES ($1, $2, 'draft', $3, $4)
      RETURNING *
    `, [entity_id, req.user.id, year || new Date().getFullYear(), quarter || Math.ceil((new Date().getMonth() + 1) / 3)]);

    const assessment = assessmentResult.rows[0];

    // Create template_assessment link
    const templateAssessmentResult = await client.query(`
      INSERT INTO template_assessments (
        assessment_id, template_id, template_version, total_possible_score
      ) VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [assessment.id, template_id, template.version, totalPossibleScore]);

    const templateAssessment = templateAssessmentResult.rows[0];

    // Get active static data for this entity
    const staticDataResult = await client.query(`
      SELECT field_key, field_value
      FROM static_data_values
      WHERE institution_id = $1 AND is_active = true
    `, [entity_id]);

    const staticData = {};
    staticDataResult.rows.forEach(row => {
      staticData[row.field_key] = row.field_value;
    });

    // Pre-fill answers: StaticData من البيانات الثابتة، أو آخر إجابة للمؤسسة لنفس السؤال من تقييم سابق
    for (const question of template.questions) {
      let answerValue = null;
      let linkedStaticValue = null;
      let scoreAchieved = 0;
      let evaluationPassed = null;

      // دعم StaticData و StaticDataLinked (للتوافق)
      if ((question.question_type === 'StaticData' || question.question_type === 'StaticDataLinked') 
          && question.linked_static_data_field) {
        linkedStaticValue = staticData[question.linked_static_data_field] || null;
        
        if (linkedStaticValue) {
          const evaluation = evaluateAnswer(question, null, linkedStaticValue);
          answerValue = linkedStaticValue;
          scoreAchieved = evaluation.score;
          evaluationPassed = evaluation.passed;
        }
      }

      // إن لم تُملأ من StaticData: جلب آخر إجابة مفعلة للمؤسسة لنفس السؤال من أي تقييم سابق
      if (answerValue === null && linkedStaticValue === null) {
        const prevAnswer = await client.query(`
          SELECT qa.answer_value, qa.template_assessment_id
          FROM question_answers qa
          JOIN template_assessments ta ON qa.template_assessment_id = ta.id
          JOIN assessments a ON ta.assessment_id = a.id
          WHERE a.entity_id = $1 AND qa.question_id = $2 AND ta.id != $3
          ORDER BY COALESCE(a.submitted_at, a.created_at) DESC NULLS LAST, qa.answered_at DESC NULLS LAST
          LIMIT 1
        `, [entity_id, question.id, templateAssessment.id]);
        if (prevAnswer.rows.length > 0) {
          const prev = prevAnswer.rows[0];
          answerValue = prev.answer_value;
          // Get static data value from current static_data_values if needed for evaluation
          if (question.linked_static_data_field) {
            linkedStaticValue = staticData[question.linked_static_data_field] || null;
          }
          const evaluation = evaluateAnswer(question, answerValue, linkedStaticValue);
          scoreAchieved = evaluation.score;
          evaluationPassed = evaluation.passed;
        }
      }

      await client.query(`
        INSERT INTO question_answers (
          template_assessment_id, question_id, answer_value,
          score_achieved, max_possible_score,
          evaluation_passed
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        templateAssessment.id,
        question.id,
        answerValue ? (typeof answerValue === 'object' ? JSON.stringify(answerValue) : answerValue) : null,
        scoreAchieved,
        question.weight || 0,
        evaluationPassed
      ]);
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Assessment created successfully from template',
      assessment: {
        ...assessment,
        template_assessment_id: templateAssessment.id,
        template_name: template.name,
        template_name_ar: template.name_ar,
        total_possible_score: totalPossibleScore,
        question_count: template.questions.length
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating template assessment:', error);
    console.error('Error stack:', error.stack);
    console.error('Request body:', req.body);
    console.error('User:', req.user);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create assessment',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  } finally {
    client.release();
  }
});

// ============================================
// GET ASSESSMENT WITH QUESTIONS AND ANSWERS
// ============================================
router.get('/:assessmentId', authenticateToken, async (req, res) => {
  try {
    const { assessmentId } = req.params;

    // Get assessment details
    const assessmentResult = await pool.query(`
      SELECT 
        a.*,
        ta.id as template_assessment_id,
        ta.template_id,
        ta.total_possible_score,
        ta.total_achieved_score,
        ta.percentage_score,
        t.name as template_name,
        t.name_ar as template_name_ar,
        t.category as template_category,
        e.name as entity_name,
        e.name_ar as entity_name_ar
      FROM assessments a
      JOIN template_assessments ta ON a.id = ta.assessment_id
      JOIN templates t ON ta.template_id = t.id
      JOIN entities e ON a.entity_id = e.id
      WHERE a.id = $1
    `, [assessmentId]);

    if (assessmentResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Assessment not found' 
      });
    }

    const assessment = assessmentResult.rows[0];

    // Check permissions
    if (req.user.role === 'entity_user' && !entityUserCanAccess(req, assessment.entity_id)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    // Get questions with answers - النظام الجديد
    const questionsResult = await pool.query(`
      SELECT 
        q.id,
        q.text_en,
        q.text_ar,
        q.question_type,
        q.parent_question_id,
        q.trigger_answer_value,
        q.composite_columns::text as composite_columns_raw,
        q.composite_columns,
        q.options,
        q.weight,
        q.category,
        q.is_active,
        qa.id as answer_id,
        qa.answer_value,
        qa.score_achieved,
        qa.max_possible_score,
        qa.evaluation_passed,
        qa.evaluation_notes,
        qa.answered_at,
        tq.display_order,
        tq.section_name,
        tq.section_name_ar,
        -- للحفاظ على التوافق مع النظام القديم
        q.text_en as question_text,
        q.text_ar as question_text_ar
      FROM question_answers qa
      JOIN Questions q ON qa.question_id = q.id
      JOIN template_questions tq ON q.id = tq.question_id AND tq.template_id = $2
      WHERE qa.template_assessment_id = $1
      ORDER BY tq.display_order
    `, [assessment.template_assessment_id, assessment.template_id]);

    // ── تحميل reference_values من الجداول العلائقية للأسئلة المركبة ──────────
    const compositeQaIds = questionsResult.rows
      .filter(r => r.question_type === 'Composite' && r.answer_id)
      .map(r => parseInt(r.answer_id));

    const rvByAnswerId = {};
    if (compositeQaIds.length > 0) {
      try {
        const rvResult = await pool.query(`
          SELECT
            arv.assessment_answer_id,
            arv.id          AS rv_id,
            arv.reference_id,
            arv.quantity,
            COALESCE(
              json_agg(
                json_build_object(
                  'id',             ara.id,
                  'attribute_type', ara.attribute_type,
                  'reference_id',   ara.reference_id
                )
              ) FILTER (WHERE ara.id IS NOT NULL),
              '[]'::json
            ) AS attributes
          FROM assessment_reference_values arv
          LEFT JOIN assessment_reference_attributes ara
            ON ara.assessment_reference_value_id = arv.id
          WHERE arv.assessment_answer_id = ANY($1::int[])
          GROUP BY arv.assessment_answer_id, arv.id, arv.reference_id, arv.quantity
          ORDER BY arv.id
        `, [compositeQaIds]);

        rvResult.rows.forEach(row => {
          const key = row.assessment_answer_id;
          if (!rvByAnswerId[key]) rvByAnswerId[key] = [];
          rvByAnswerId[key].push({
            id: row.rv_id,
            reference_id: row.reference_id,
            quantity: row.quantity,
            attributes: typeof row.attributes === 'string'
              ? JSON.parse(row.attributes)
              : (Array.isArray(row.attributes) ? row.attributes : [])
          });
        });
      } catch (rvErr) {
        console.warn('Could not load reference_values for composite questions:', rvErr.message);
      }
    }

    // ربط reference_values بكل صف سؤال مركب
    questionsResult.rows.forEach(r => {
      if (r.question_type === 'Composite' && r.answer_id && rvByAnswerId[r.answer_id]) {
        r.reference_values = rvByAnswerId[r.answer_id];
      }
    });
    // ─────────────────────────────────────────────────────────────────────────

    // تجميع الأسئلة الفرعية مع الأب (شجرة كاملة — دعم فرع فرعي)
    const questionsMap = new Map();
    const rootQuestions = [];

    // إضافة كل الأسئلة إلى الخريطة مع مصفوفة أطفال فارغة
    questionsResult.rows.forEach(row => {
      // معالجة composite_columns للتأكد من أنها array وأن الصفات موجودة
      if (row.composite_columns != null) {
        let cols = row.composite_columns;
        if (typeof cols === 'string') {
          try {
            cols = JSON.parse(cols);
          } catch (e) {
            console.error('Error parsing composite_columns for question', row.id, e);
            cols = null;
          }
        }
        if (cols && typeof cols === 'object' && !Array.isArray(cols)) {
          const keys = Object.keys(cols);
          const isNumericKeys = keys.every(k => !isNaN(parseInt(k, 10)));
          row.composite_columns = isNumericKeys
            ? keys.sort((a, b) => parseInt(a, 10) - parseInt(b, 10)).map(k => cols[k]).filter(Boolean)
            : Object.values(cols).filter(Boolean);
        } else if (Array.isArray(cols)) {
          row.composite_columns = cols.filter(Boolean);
        } else {
          row.composite_columns = null;
        }
      }
      questionsMap.set(row.id, { ...row, child_questions: [] });
    });

    // تحديد الجذور فقط
    rootQuestions.push(...questionsResult.rows.filter(row => !row.parent_question_id).map(row => questionsMap.get(row.id)));

    // ربط كل سؤال فرعي بأبيه (أي عمق)
    questionsResult.rows.forEach(row => {
      if (row.parent_question_id) {
        const parent = questionsMap.get(row.parent_question_id);
        const childNode = questionsMap.get(row.id);
        if (parent && childNode) {
          parent.child_questions.push(childNode);
        }
      }
    });

    assessment.questions = rootQuestions;

    res.json({
      success: true,
      assessment
    });

  } catch (error) {
    console.error('Error fetching assessment:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch assessment',
      error: error.message 
    });
  }
});

// ============================================
// SUBMIT ANSWERS (Update and calculate score)
// ============================================
router.post('/:assessmentId/answers', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { assessmentId } = req.params;
    const { answers } = req.body; // Array of { question_id, answer_value }

    // Get assessment and verify permissions (do not select axis_weights here — column may not exist)
    const assessmentCheck = await client.query(`
      SELECT a.*, ta.id as template_assessment_id, ta.template_id
      FROM assessments a
      JOIN template_assessments ta ON a.id = ta.assessment_id
      WHERE a.id = $1
    `, [assessmentId]);

    if (assessmentCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ 
        success: false, 
        message: 'Assessment not found' 
      });
    }

    const assessment = assessmentCheck.rows[0];

    // Check permissions
    if (req.user.role === 'entity_user' && !entityUserCanAccess(req, assessment.entity_id)) {
      await client.query('ROLLBACK');
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    if (assessment.status !== 'draft') {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        success: false, 
        message: 'Can only update answers for draft assessments' 
      });
    }

    // Optional: get axis_weights for percentage mode (column may not exist)
    let usePercentageMode = false;
    try {
      const axisResult = await client.query(
        `SELECT axis_weights FROM templates WHERE id = $1`,
        [assessment.template_id]
      );
      if (axisResult.rows.length > 0) {
        const aw = axisResult.rows[0].axis_weights;
        usePercentageMode = aw && typeof aw === 'object' && Object.keys(aw).length > 0;
      }
    } catch (_) {
      // عمود axis_weights قد يكون غير موجود — ننهي المعاملة الحالية ونبدأ معاملة جديدة
      await client.query('ROLLBACK');
      await client.query('BEGIN');
    }

    // Update each answer
    let totalScore = 0;
    
    for (const ans of answers) {
      // Get question details - النظام الجديد
      const questionResult = await client.query(`
        SELECT q.*, tq.override_weight,
          COALESCE(tq.override_weight, q.weight) as effective_weight
        FROM Questions q
        JOIN template_questions tq ON q.id = tq.question_id
        WHERE q.id = $1 AND tq.template_id = $2 AND q.is_active = true
      `, [ans.question_id, assessment.template_id]);

      if (questionResult.rows.length === 0) continue;

      const question = questionResult.rows[0];

      // Get existing answer record
      const existingAnswer = await client.query(`
        SELECT * FROM question_answers
        WHERE template_assessment_id = $1 AND question_id = $2
      `, [assessment.template_assessment_id, ans.question_id]);

      const existingRow = existingAnswer.rows[0];
      
      // Get static data value from current static_data_values if needed for evaluation
      let linkedStaticValue = null;
      if (question.linked_static_data_field) {
        const staticDataResult = await client.query(`
          SELECT field_value
          FROM static_data_values
          WHERE institution_id = $1 AND field_key = $2 AND is_active = true
          LIMIT 1
        `, [assessment.entity_id, question.linked_static_data_field]);
        if (staticDataResult.rows.length > 0) {
          linkedStaticValue = staticDataResult.rows[0].field_value;
        }
      }

      // ── تحديد قيمة الإجابة الفعلية ─────────────────────────────────────────
      // الأسئلة المركبة الجديدة ترسل reference_values (مصفوفة) بدلاً من answer_value
      // الأسئلة العادية ترسل answer_value (نص أو كائن)
      const isCompositeNew = Array.isArray(ans.reference_values) && ans.reference_values.length > 0;
      const rawAnswerValue = isCompositeNew ? ans.reference_values : ans.answer_value;

      // القيمة المُخزَّنة في عمود answer_value (نص دائماً)
      let storedValue;
      if (isCompositeNew) {
        // للأسئلة المركبة: نحفظ JSON في answer_value للتوافق مع أنظمة العرض القديمة
        const cleanedItems = ans.reference_values.filter(item => item && item.reference_id != null);
        storedValue = cleanedItems.length > 0 ? JSON.stringify(cleanedItems) : null;
      } else if (Array.isArray(ans.answer_value)) {
        storedValue = JSON.stringify(ans.answer_value);
      } else if (typeof ans.answer_value === 'object' && ans.answer_value !== null) {
        storedValue = JSON.stringify(ans.answer_value);
      } else {
        storedValue = ans.answer_value;
      }

      // تقييم الإجابة باستخدام rawAnswerValue (يشمل reference_values للمركّب)
      const evaluation = evaluateAnswer(question, rawAnswerValue, linkedStaticValue, usePercentageMode);

      const oldValueForAudit = existingRow ? {
        answer_value: existingRow.answer_value,
        score_achieved: existingRow.score_achieved,
        evaluation_passed: existingRow.evaluation_passed,
        question_id: existingRow.question_id,
        template_assessment_id: existingRow.template_assessment_id
      } : null;
      const newValueForAudit = {
        answer_value: storedValue,
        score_achieved: evaluation.score,
        evaluation_passed: evaluation.passed,
        evaluation_notes: evaluation.notes,
        question_id: ans.question_id,
        template_assessment_id: assessment.template_assessment_id,
        answered_by: req.user.id
      };

      // Update answer
      const maxPossibleForQuestion = parseFloat(question.effective_weight != null ? question.effective_weight : question.weight) || 0;
      await client.query(`
        UPDATE question_answers SET
          answer_value = $1,
          score_achieved = $2,
          max_possible_score = $3,
          evaluation_passed = $4,
          evaluation_notes = $5,
          answered_by = $6,
          answered_at = CURRENT_TIMESTAMP
        WHERE template_assessment_id = $7 AND question_id = $8
      `, [
        storedValue,
        evaluation.score,
        maxPossibleForQuestion,
        evaluation.passed,
        evaluation.notes,
        req.user.id,
        assessment.template_assessment_id,
        ans.question_id
      ]);

      // ── حفظ البيانات العلائقية (assessment_reference_values & assessment_reference_attributes) ──
      if (existingRow?.id) {
        try {
          // استخدام rawAnswerValue: يحتوي reference_values للمركّب أو answer_value للعادي
          const refItems = parseReferenceFormat(rawAnswerValue, question);
          if (refItems && refItems.length > 0) {
            // حذف القديم وإعادة الإدراج
            await client.query(
              `DELETE FROM assessment_reference_values WHERE assessment_answer_id = $1`,
              [existingRow.id]
            );
            for (const item of refItems) {
              const rv = await client.query(`
                INSERT INTO assessment_reference_values (assessment_answer_id, reference_id, quantity, extra_json)
                VALUES ($1, $2, $3, $4)
                RETURNING id
              `, [existingRow.id, item.reference_id, item.quantity ?? 1, item.extra_json ? JSON.stringify(item.extra_json) : null]);
              const arvId = rv.rows[0]?.id;
              if (arvId && item.attributes?.length) {
                for (const att of item.attributes) {
                  await client.query(`
                    INSERT INTO assessment_reference_attributes (assessment_reference_value_id, attribute_type, reference_id)
                    VALUES ($1, $2, $3)
                  `, [arvId, att.attribute_type, att.reference_id]);
                }
              }
            }
          } else if (isCompositeNew) {
            // المستخدم أفرغ كل الصفوف — نحذف السجلات القديمة
            await client.query(
              `DELETE FROM assessment_reference_values WHERE assessment_answer_id = $1`,
              [existingRow.id]
            );
          }
        } catch (refErr) {
          console.warn('Reference persistence skipped:', refErr.message, refErr.stack);
        }
      }

      // تسجيل العملية في AuditLog (فقط عند وجود سجل - التحديث يُنفّذ على صف موجود)
      if (existingRow?.id) {
        const performedBy = req.user.email || req.user.full_name || String(req.user.id);
        await logAudit(
          client,
          'question_answers',
          existingRow.id,
          'UPDATE',
          oldValueForAudit,
          newValueForAudit,
          performedBy
        );
      }

      totalScore += evaluation.score;
    }

    // Recalculate total score from all answers (only questions that include_in_evaluation = true)
    const scoreResult = await client.query(`
      SELECT 
        SUM(CASE WHEN tq.include_in_evaluation = true THEN qa.score_achieved ELSE 0 END) as total_achieved,
        SUM(CASE WHEN tq.include_in_evaluation = true THEN qa.max_possible_score ELSE 0 END) as total_possible
      FROM question_answers qa
      JOIN template_questions tq ON qa.question_id = tq.question_id AND tq.template_id = $2
      WHERE qa.template_assessment_id = $1
    `, [assessment.template_assessment_id, assessment.template_id]);

    const totalAchieved = parseFloat(scoreResult.rows[0].total_achieved) || 0;
    const totalPossible = parseFloat(scoreResult.rows[0].total_possible) || 1;
    const percentageScore = (totalAchieved / totalPossible) * 100;

    // Update template_assessment scores
    await client.query(`
      UPDATE template_assessments SET
        total_achieved_score = $1,
        percentage_score = $2
      WHERE id = $3
    `, [totalAchieved, percentageScore, assessment.template_assessment_id]);

    // Determine risk level based on percentage
    let riskLevel;
    if (percentageScore >= 80) riskLevel = 'Low';
    else if (percentageScore >= 60) riskLevel = 'Medium';
    else if (percentageScore >= 40) riskLevel = 'High';
    else riskLevel = 'Critical';

    // Update main assessment
    await client.query(`
      UPDATE assessments SET
        maturity_score = $1,
        risk_level = $2
      WHERE id = $3
    `, [percentageScore, riskLevel, assessmentId]);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Answers saved and scored successfully',
      scoring: {
        total_achieved: totalAchieved,
        total_possible: totalPossible,
        percentage: percentageScore,
        risk_level: riskLevel
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error submitting answers:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to submit answers',
      error: error.message 
    });
  } finally {
    client.release();
  }
});

// ============================================
// UPDATE EVALUATIONS FOR MULTIPLE QUESTIONS (Batch manual evaluation entry)
// ============================================
router.put('/:assessmentId/evaluations', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { assessmentId } = req.params;
    const { evaluations } = req.body; // Array of { question_id, score_achieved, evaluation_passed, evaluation_notes }

    if (!Array.isArray(evaluations) || evaluations.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        success: false, 
        message: 'evaluations must be a non-empty array' 
      });
    }

    // Get assessment and verify permissions
    const assessmentCheck = await client.query(`
      SELECT a.*, ta.id as template_assessment_id, ta.template_id
      FROM assessments a
      JOIN template_assessments ta ON a.id = ta.assessment_id
      WHERE a.id = $1
    `, [assessmentId]);

    if (assessmentCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ 
        success: false, 
        message: 'Assessment not found' 
      });
    }

    const assessment = assessmentCheck.rows[0];

    // Check permissions
    if (req.user.role === 'entity_user' && !entityUserCanAccess(req, assessment.entity_id)) {
      await client.query('ROLLBACK');
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    // Get all question answers with max scores
    const answersResult = await client.query(`
      SELECT qa.*, q.weight, tq.override_weight,
        COALESCE(tq.override_weight, q.weight) as max_possible_score
      FROM question_answers qa
      JOIN Questions q ON qa.question_id = q.id
      LEFT JOIN template_questions tq ON q.id = tq.question_id AND tq.template_id = $1
      WHERE qa.template_assessment_id = $2
    `, [assessment.template_id, assessment.template_assessment_id]);

    const answersMap = new Map();
    answersResult.rows.forEach(row => {
      answersMap.set(row.question_id, row);
    });

    const updatedEvaluations = [];
    const performedBy = req.user.email || req.user.full_name || String(req.user.id);

    // Update each evaluation
    for (const evalData of evaluations) {
      const { question_id, score_achieved, evaluation_passed, evaluation_notes } = evalData;
      
      if (!question_id) {
        continue; // Skip invalid entries
      }

      const answer = answersMap.get(question_id);
      if (!answer) {
        continue; // Skip if answer not found
      }

      const maxPossibleScore = answer.max_possible_score || answer.weight || 0;
      
      // Validate and prepare score
      const finalScore = score_achieved !== undefined && score_achieved !== null 
        ? parseFloat(score_achieved) 
        : answer.score_achieved;
      
      if (finalScore < 0 || finalScore > maxPossibleScore) {
        continue; // Skip invalid scores
      }

      // Prepare old value for audit
      const oldValueForAudit = {
        score_achieved: answer.score_achieved,
        evaluation_passed: answer.evaluation_passed,
        evaluation_notes: answer.evaluation_notes,
        question_id: answer.question_id,
        template_assessment_id: answer.template_assessment_id
      };

      // Update evaluation
      const updateResult = await client.query(`
        UPDATE question_answers SET
          score_achieved = COALESCE($1, score_achieved),
          evaluation_passed = COALESCE($2, evaluation_passed),
          evaluation_notes = COALESCE($3, evaluation_notes),
          answered_by = $4,
          answered_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE template_assessment_id = $5 AND question_id = $6
        RETURNING *
      `, [
        finalScore,
        evaluation_passed !== undefined ? evaluation_passed : answer.evaluation_passed,
        evaluation_notes !== undefined ? evaluation_notes : answer.evaluation_notes,
        req.user.id,
        assessment.template_assessment_id,
        question_id
      ]);

      const updatedAnswer = updateResult.rows[0];
      updatedEvaluations.push({
        question_id: parseInt(question_id),
        score_achieved: updatedAnswer.score_achieved,
        max_possible_score: updatedAnswer.max_possible_score,
        evaluation_passed: updatedAnswer.evaluation_passed,
        evaluation_notes: updatedAnswer.evaluation_notes
      });

      // Log audit
      const newValueForAudit = {
        score_achieved: updatedAnswer.score_achieved,
        evaluation_passed: updatedAnswer.evaluation_passed,
        evaluation_notes: updatedAnswer.evaluation_notes,
        question_id: updatedAnswer.question_id,
        template_assessment_id: updatedAnswer.template_assessment_id,
        answered_by: req.user.id
      };

      await logAudit(
        client,
        'question_answers',
        updatedAnswer.id,
        'UPDATE',
        oldValueForAudit,
        newValueForAudit,
        performedBy
      );
    }

    // Recalculate total score from all answers (only questions that include_in_evaluation = true)
    const scoreResult = await client.query(`
      SELECT 
        SUM(CASE WHEN tq.include_in_evaluation = true THEN qa.score_achieved ELSE 0 END) as total_achieved,
        SUM(CASE WHEN tq.include_in_evaluation = true THEN qa.max_possible_score ELSE 0 END) as total_possible
      FROM question_answers qa
      JOIN template_questions tq ON qa.question_id = tq.question_id AND tq.template_id = $2
      WHERE qa.template_assessment_id = $1
    `, [assessment.template_assessment_id, assessment.template_id]);

    const totalAchieved = parseFloat(scoreResult.rows[0].total_achieved) || 0;
    const totalPossible = parseFloat(scoreResult.rows[0].total_possible) || 1;
    const percentageScore = (totalAchieved / totalPossible) * 100;

    // Update template_assessment scores
    await client.query(`
      UPDATE template_assessments SET
        total_achieved_score = $1,
        percentage_score = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [totalAchieved, percentageScore, assessment.template_assessment_id]);

    // Determine risk level
    let riskLevel;
    if (percentageScore >= 80) riskLevel = 'Low';
    else if (percentageScore >= 60) riskLevel = 'Medium';
    else if (percentageScore >= 40) riskLevel = 'High';
    else riskLevel = 'Critical';

    // Update main assessment
    await client.query(`
      UPDATE assessments SET
        maturity_score = $1,
        risk_level = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [percentageScore, riskLevel, assessmentId]);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Updated ${updatedEvaluations.length} evaluation(s) successfully`,
      evaluations: updatedEvaluations,
      updated_scoring: {
        total_achieved: totalAchieved,
        total_possible: totalPossible,
        percentage: percentageScore,
        risk_level: riskLevel
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating evaluations:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update evaluations',
      error: error.message 
    });
  } finally {
    client.release();
  }
});

// ============================================
// GET EVALUATION FOR A QUESTION
// ============================================
router.get('/:assessmentId/questions/:questionId/evaluation', authenticateToken, async (req, res) => {
  try {
    const { assessmentId, questionId } = req.params;

    // Get assessment and verify permissions
    const assessmentCheck = await pool.query(`
      SELECT a.*, ta.id as template_assessment_id, ta.template_id
      FROM assessments a
      JOIN template_assessments ta ON a.id = ta.assessment_id
      WHERE a.id = $1
    `, [assessmentId]);

    if (assessmentCheck.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Assessment not found' 
      });
    }

    const assessment = assessmentCheck.rows[0];

    // Check permissions
    if (req.user.role === 'entity_user' && !entityUserCanAccess(req, assessment.entity_id)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    // Get question answer with evaluation data
    const answerResult = await pool.query(`
      SELECT 
        qa.id,
        qa.question_id,
        qa.answer_value,
        qa.score_achieved,
        qa.max_possible_score,
        qa.evaluation_passed,
        qa.evaluation_notes,
        qa.answered_by,
        qa.answered_at,
        q.text_en,
        q.text_ar,
        q.question_type,
        q.weight,
        u.full_name as answered_by_name
      FROM question_answers qa
      JOIN Questions q ON qa.question_id = q.id
      LEFT JOIN users u ON qa.answered_by = u.id
      WHERE qa.template_assessment_id = $1 AND qa.question_id = $2
    `, [assessment.template_assessment_id, questionId]);

    if (answerResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Question answer not found' 
      });
    }

    const answer = answerResult.rows[0];

    res.json({
      success: true,
      evaluation: {
        question_id: answer.question_id,
        question_id: answer.question_id,
        question_text_en: answer.text_en,
        question_text_ar: answer.text_ar,
        question_type: answer.question_type,
        answer_value: answer.answer_value,
        score_achieved: answer.score_achieved,
        max_possible_score: answer.max_possible_score,
        evaluation_passed: answer.evaluation_passed,
        evaluation_notes: answer.evaluation_notes,
        answered_by: answer.answered_by,
        answered_by_name: answer.answered_by_name,
        answered_at: answer.answered_at,
        percentage_score: answer.max_possible_score > 0 
          ? (answer.score_achieved / answer.max_possible_score) * 100 
          : 0
      }
    });

  } catch (error) {
    console.error('Error fetching evaluation:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch evaluation',
      error: error.message 
    });
  }
});

// ============================================
// UPDATE EVALUATION FOR A QUESTION (Manual evaluation entry)
// ============================================
router.put('/:assessmentId/questions/:questionId/evaluation', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { assessmentId, questionId } = req.params;
    const { 
      score_achieved, 
      evaluation_passed, 
      evaluation_notes 
    } = req.body;

    // Get assessment and verify permissions
    const assessmentCheck = await client.query(`
      SELECT a.*, ta.id as template_assessment_id, ta.template_id
      FROM assessments a
      JOIN template_assessments ta ON a.id = ta.assessment_id
      WHERE a.id = $1
    `, [assessmentId]);

    if (assessmentCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ 
        success: false, 
        message: 'Assessment not found' 
      });
    }

    const assessment = assessmentCheck.rows[0];

    // Check permissions - allow admins and entity users
    if (req.user.role === 'entity_user' && !entityUserCanAccess(req, assessment.entity_id)) {
      await client.query('ROLLBACK');
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    // Get question answer record
    const answerResult = await client.query(`
      SELECT qa.*, q.weight, tq.override_weight,
        COALESCE(tq.override_weight, q.weight) as max_possible_score
      FROM question_answers qa
      JOIN Questions q ON qa.question_id = q.id
      LEFT JOIN template_questions tq ON q.id = tq.question_id AND tq.template_id = $2
      WHERE qa.template_assessment_id = $1 AND qa.question_id = $3
    `, [assessment.template_assessment_id, assessment.template_id, questionId]);

    if (answerResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ 
        success: false, 
        message: 'Question answer not found' 
      });
    }

    const answer = answerResult.rows[0];
    const maxPossibleScore = answer.max_possible_score || answer.weight || 0;

    // Validate score_achieved
    const finalScore = score_achieved !== undefined && score_achieved !== null 
      ? parseFloat(score_achieved) 
      : answer.score_achieved;
    
    if (finalScore < 0 || finalScore > maxPossibleScore) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        success: false, 
        message: `Score must be between 0 and ${maxPossibleScore}` 
      });
    }

    // Prepare old value for audit
    const oldValueForAudit = {
      score_achieved: answer.score_achieved,
      evaluation_passed: answer.evaluation_passed,
      evaluation_notes: answer.evaluation_notes,
      question_id: answer.question_id,
      template_assessment_id: answer.template_assessment_id
    };

    // Update evaluation
    const updateResult = await client.query(`
      UPDATE question_answers SET
        score_achieved = COALESCE($1, score_achieved),
        evaluation_passed = COALESCE($2, evaluation_passed),
        evaluation_notes = COALESCE($3, evaluation_notes),
        answered_by = $4,
        answered_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE template_assessment_id = $5 AND question_id = $6
      RETURNING *
    `, [
      finalScore,
      evaluation_passed !== undefined ? evaluation_passed : answer.evaluation_passed,
      evaluation_notes !== undefined ? evaluation_notes : answer.evaluation_notes,
      req.user.id,
      assessment.template_assessment_id,
      questionId
    ]);

    const updatedAnswer = updateResult.rows[0];

    // Prepare new value for audit
    const newValueForAudit = {
      score_achieved: updatedAnswer.score_achieved,
      evaluation_passed: updatedAnswer.evaluation_passed,
      evaluation_notes: updatedAnswer.evaluation_notes,
      question_id: updatedAnswer.question_id,
      template_assessment_id: updatedAnswer.template_assessment_id,
      answered_by: req.user.id
    };

    // Log audit
    const performedBy = req.user.email || req.user.full_name || String(req.user.id);
    await logAudit(
      client,
      'question_answers',
      updatedAnswer.id,
      'UPDATE',
      oldValueForAudit,
      newValueForAudit,
      performedBy
    );

    // Recalculate total score from all answers (only questions that include_in_evaluation = true)
    const scoreResult = await client.query(`
      SELECT 
        SUM(CASE WHEN tq.include_in_evaluation = true THEN qa.score_achieved ELSE 0 END) as total_achieved,
        SUM(CASE WHEN tq.include_in_evaluation = true THEN qa.max_possible_score ELSE 0 END) as total_possible
      FROM question_answers qa
      JOIN template_questions tq ON qa.question_id = tq.question_id AND tq.template_id = $2
      WHERE qa.template_assessment_id = $1
    `, [assessment.template_assessment_id, assessment.template_id]);

    const totalAchieved = parseFloat(scoreResult.rows[0].total_achieved) || 0;
    const totalPossible = parseFloat(scoreResult.rows[0].total_possible) || 1;
    const percentageScore = (totalAchieved / totalPossible) * 100;

    // Update template_assessment scores
    await client.query(`
      UPDATE template_assessments SET
        total_achieved_score = $1,
        percentage_score = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [totalAchieved, percentageScore, assessment.template_assessment_id]);

    // Determine risk level based on percentage
    let riskLevel;
    if (percentageScore >= 80) riskLevel = 'Low';
    else if (percentageScore >= 60) riskLevel = 'Medium';
    else if (percentageScore >= 40) riskLevel = 'High';
    else riskLevel = 'Critical';

    // Update main assessment
    await client.query(`
      UPDATE assessments SET
        maturity_score = $1,
        risk_level = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [percentageScore, riskLevel, assessmentId]);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Evaluation updated successfully',
      evaluation: {
        question_id: parseInt(questionId),
        score_achieved: updatedAnswer.score_achieved,
        max_possible_score: updatedAnswer.max_possible_score,
        evaluation_passed: updatedAnswer.evaluation_passed,
        evaluation_notes: updatedAnswer.evaluation_notes
      },
      updated_scoring: {
        total_achieved: totalAchieved,
        total_possible: totalPossible,
        percentage: percentageScore,
        risk_level: riskLevel
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating evaluation:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update evaluation',
      error: error.message 
    });
  } finally {
    client.release();
  }
});

// ============================================
// SUBMIT ASSESSMENT (Final submission)
// ============================================
router.post('/:assessmentId/submit', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { assessmentId } = req.params;

    // Get assessment
    const assessmentResult = await client.query(`
      SELECT a.*, ta.percentage_score
      FROM assessments a
      JOIN template_assessments ta ON a.id = ta.assessment_id
      WHERE a.id = $1
    `, [assessmentId]);

    if (assessmentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ 
        success: false, 
        message: 'Assessment not found' 
      });
    }

    const assessment = assessmentResult.rows[0];

    // Check permissions
    if (req.user.role === 'entity_user' && !entityUserCanAccess(req, assessment.entity_id)) {
      await client.query('ROLLBACK');
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    if (assessment.status !== 'draft') {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        success: false, 
        message: 'Assessment already submitted' 
      });
    }

    // Update status to submitted (submitted_at column may not exist in some DBs)
    try {
      await client.query(`
        UPDATE assessments SET
          status = 'submitted',
          submitted_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [assessmentId]);
    } catch (updateErr) {
      const msg = (updateErr.message || '').toLowerCase();
      if (msg.includes('submitted_at') || (msg.includes('column') && msg.includes('does not exist'))) {
        await client.query(`
          UPDATE assessments SET status = 'submitted' WHERE id = $1
        `, [assessmentId]);
      } else {
        throw updateErr;
      }
    }

    // تسجيل إرسال التقييم في AuditLog (لا نوقف الطلب إذا فشل السجل)
    try {
      const performedBy = req.user.email || req.user.full_name || String(req.user.id);
      await logAudit(
        client,
        'assessments',
        parseInt(assessmentId),
        'UPDATE',
        { status: assessment.status, entity_id: assessment.entity_id },
        { status: 'submitted', submitted_at: new Date().toISOString(), entity_id: assessment.entity_id },
        performedBy
      );
    } catch (_) {
      // AuditLog قد يكون غير متوفر — لا نوقف الإرسال
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Assessment submitted successfully',
      assessment_id: assessmentId,
      final_score: assessment.percentage_score
    });

  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error submitting assessment:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to submit assessment',
      error: error.message 
    });
  } finally {
    client.release();
  }
});

// ============================================
// GET ALL ASSESSMENTS (with template info)
// ============================================
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { entity_id, status, template_id } = req.query;

    let query = `
      SELECT 
        a.*,
        ta.template_id,
        ta.total_possible_score,
        ta.total_achieved_score,
        ta.percentage_score,
        t.name as template_name,
        t.name_ar as template_name_ar,
        e.name as entity_name,
        e.name_ar as entity_name_ar,
        u.full_name as created_by_name
      FROM assessments a
      JOIN template_assessments ta ON a.id = ta.assessment_id
      JOIN templates t ON ta.template_id = t.id
      JOIN entities e ON a.entity_id = e.id
      JOIN users u ON a.created_by = u.id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    // Entity user: جهته فقط أو قائمة الجهات المسندة له
    if (req.user.role === 'entity_user') {
      const allowedIds = req.user.institutions && req.user.institutions.length > 0
        ? req.user.institutions
        : (req.user.entity_id != null ? [req.user.entity_id] : []);
      if (allowedIds.length === 0) {
        query += ` AND 1=0`;
      } else if (allowedIds.length === 1) {
        query += ` AND a.entity_id = $${paramCount}`;
        params.push(allowedIds[0]);
        paramCount++;
      } else {
        query += ` AND a.entity_id = ANY($${paramCount}::int[])`;
        params.push(allowedIds);
        paramCount++;
      }
    } else if (entity_id) {
      query += ` AND a.entity_id = $${paramCount}`;
      params.push(entity_id);
      paramCount++;
    }

    if (status) {
      query += ` AND a.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (template_id) {
      query += ` AND ta.template_id = $${paramCount}`;
      params.push(template_id);
      paramCount++;
    }

    query += ' ORDER BY a.created_at DESC';

    const result = await pool.query(query, params);

    res.json({
      success: true,
      count: result.rows.length,
      assessments: result.rows
    });

  } catch (error) {
    console.error('Error fetching assessments:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch assessments',
      error: error.message 
    });
  }
});

export default router;
