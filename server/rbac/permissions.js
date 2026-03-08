/**
 * RBAC - Permission Constants
 * جميع صلاحيات النظام - المصدر الوحيد للحقيقة
 */

export const PERMISSIONS = Object.freeze({
  VIEW_QUESTIONS:   'view_questions',
  CREATE_QUESTION:  'create_question',
  EDIT_QUESTION:    'edit_question',
  DELETE_QUESTION:  'delete_question',

  VIEW_TEMPLATES:   'view_templates',
  CREATE_TEMPLATE:  'create_template',
  EDIT_TEMPLATE:    'edit_template',
  DELETE_TEMPLATE:  'delete_template',

  VIEW_ASSESSMENTS:     'view_assessments',
  FILL_ASSESSMENT:      'fill_assessment',
  SUBMIT_ASSESSMENT:    'submit_assessment',
  EVALUATE_ASSESSMENT:  'evaluate_assessment',

  VIEW_REPORTS:    'view_reports',
  EXPORT_REPORTS:  'export_reports',

  MANAGE_USERS:    'manage_users',
  VIEW_ENTITIES:   'view_entities',
  MANAGE_ENTITIES: 'manage_entities',
  MANAGE_CATEGORIES: 'manage_categories',
  MANAGE_REFERENCES: 'manage_references',
});

export const ALL_PERMISSIONS = Object.values(PERMISSIONS);

export const PERMISSION_CATEGORIES = {
  questions:   [PERMISSIONS.VIEW_QUESTIONS, PERMISSIONS.CREATE_QUESTION, PERMISSIONS.EDIT_QUESTION, PERMISSIONS.DELETE_QUESTION],
  templates:   [PERMISSIONS.VIEW_TEMPLATES, PERMISSIONS.CREATE_TEMPLATE, PERMISSIONS.EDIT_TEMPLATE, PERMISSIONS.DELETE_TEMPLATE],
  assessments: [PERMISSIONS.VIEW_ASSESSMENTS, PERMISSIONS.FILL_ASSESSMENT, PERMISSIONS.SUBMIT_ASSESSMENT, PERMISSIONS.EVALUATE_ASSESSMENT],
  reports:     [PERMISSIONS.VIEW_REPORTS, PERMISSIONS.EXPORT_REPORTS],
  admin:       [PERMISSIONS.MANAGE_USERS, PERMISSIONS.VIEW_ENTITIES, PERMISSIONS.MANAGE_ENTITIES, PERMISSIONS.MANAGE_CATEGORIES, PERMISSIONS.MANAGE_REFERENCES],
};
