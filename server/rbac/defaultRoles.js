/**
 * RBAC - Default Role → Permission Mappings
 * خريطة الأدوار الافتراضية وصلاحياتها + النطاق
 * تُستخدم كـ Fallback عند غياب صفوف في جدول user_roles في DB.
 */

import { PERMISSIONS, ALL_PERMISSIONS } from './permissions.js';

export const DEFAULT_ROLE_PERMISSIONS = Object.freeze({
  super_admin: {
    permissions: ALL_PERMISSIONS,
    scope: 'all',
  },

  ministry_admin: {
    permissions: [
      PERMISSIONS.VIEW_QUESTIONS,
      PERMISSIONS.CREATE_QUESTION,
      PERMISSIONS.EDIT_QUESTION,
      PERMISSIONS.DELETE_QUESTION,
      PERMISSIONS.VIEW_TEMPLATES,
      PERMISSIONS.CREATE_TEMPLATE,
      PERMISSIONS.EDIT_TEMPLATE,
      PERMISSIONS.DELETE_TEMPLATE,
      PERMISSIONS.VIEW_ASSESSMENTS,
      PERMISSIONS.FILL_ASSESSMENT,
      PERMISSIONS.SUBMIT_ASSESSMENT,
      PERMISSIONS.EVALUATE_ASSESSMENT,
      PERMISSIONS.VIEW_REPORTS,
      PERMISSIONS.EXPORT_REPORTS,
      PERMISSIONS.VIEW_ENTITIES,
      PERMISSIONS.MANAGE_CATEGORIES,
      PERMISSIONS.MANAGE_REFERENCES,
    ],
    scope: 'assigned',
  },

  entity_user: {
    permissions: [
      PERMISSIONS.VIEW_TEMPLATES,
      PERMISSIONS.FILL_ASSESSMENT,
      PERMISSIONS.SUBMIT_ASSESSMENT,
    ],
    scope: 'own',
  },

  QuestionManager: {
    permissions: [
      PERMISSIONS.VIEW_QUESTIONS,
      PERMISSIONS.CREATE_QUESTION,
      PERMISSIONS.EDIT_QUESTION,
      PERMISSIONS.DELETE_QUESTION,
      PERMISSIONS.VIEW_TEMPLATES,
    ],
    scope: 'all',
  },

  Evaluator: {
    permissions: [
      PERMISSIONS.VIEW_TEMPLATES,
      PERMISSIONS.VIEW_ASSESSMENTS,
      PERMISSIONS.EVALUATE_ASSESSMENT,
      PERMISSIONS.VIEW_REPORTS,
      PERMISSIONS.EXPORT_REPORTS,
    ],
    scope: 'assigned',
  },

  InstitutionUser: {
    permissions: [
      PERMISSIONS.VIEW_TEMPLATES,
      PERMISSIONS.FILL_ASSESSMENT,
      PERMISSIONS.SUBMIT_ASSESSMENT,
    ],
    scope: 'own',
  },

  Viewer: {
    permissions: [
      PERMISSIONS.VIEW_QUESTIONS,
      PERMISSIONS.VIEW_TEMPLATES,
      PERMISSIONS.VIEW_ASSESSMENTS,
      PERMISSIONS.VIEW_REPORTS,
    ],
    scope: 'own',
  },
});

export function getDefaultPermissionsForRole(role) {
  return DEFAULT_ROLE_PERMISSIONS[role] ?? { permissions: [], scope: 'own' };
}
