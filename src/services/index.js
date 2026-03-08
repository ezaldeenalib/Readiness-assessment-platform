import api from './api';

export const authService = {
  async login(email, password) {
    const response = await api.post('/auth/login', { email, password });
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  async register(userData) {
    const response = await api.post('/auth/register', userData);
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  async getCurrentUser() {
    const response = await api.get('/auth/me');
    return response.data.user;
  },

  async changePassword(currentPassword, newPassword) {
    const response = await api.put('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
    return response.data;
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  },

  getCurrentUserFromStorage() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  isAuthenticated() {
    return !!localStorage.getItem('token');
  },
};

export const usersService = {
  async getAll() {
    const response = await api.get('/users');
    return response.data.users || [];
  },
  async create(userData) {
    const response = await api.post('/users', userData);
    return response.data;
  },
  async getRoles() {
    const response = await api.get('/users/roles');
    return response.data.roles || [];
  },
  async getUserRoles(userId) {
    const response = await api.get(`/users/${userId}/roles`);
    return response.data.roles || [];
  },
  async updateUserRoles(userId, roleIds) {
    const response = await api.put(`/users/${userId}/roles`, { role_ids: roleIds });
    return response.data;
  },
  async getUserInstitutions(userId) {
    const response = await api.get(`/users/${userId}/institutions`);
    return response.data.institutions || [];
  },
  async updateUserInstitutions(userId, institutionIds) {
    const response = await api.put(`/users/${userId}/institutions`, { institution_ids: institutionIds });
    return response.data;
  },
};

export const entityService = {
  async getAll(params = {}) {
    const response = await api.get('/entities', { params });
    return response.data.entities;
  },

  async getById(id) {
    const response = await api.get(`/entities/${id}`);
    return response.data.entity;
  },

  async create(entityData) {
    const response = await api.post('/entities', entityData);
    return response.data;
  },

  async update(id, entityData) {
    const response = await api.put(`/entities/${id}`, entityData);
    return response.data;
  },

  async getChildren(id) {
    const response = await api.get(`/entities/${id}/children`);
    return response.data.children;
  },

  async getDashboard(id) {
    const response = await api.get(`/entities/${id}/dashboard`);
    return response.data;
  },

  async delete(id) {
    const response = await api.delete(`/entities/${id}`);
    return response.data;
  },

  async exportPDF() {
    const response = await api.get('/entities/export/pdf', {
      responseType: 'blob',
    });
    return response.data;
  },
};

export const assessmentService = {
  async getAll(params = {}) {
    const response = await api.get('/assessments', { params });
    return response.data.assessments;
  },

  async getById(id) {
    const response = await api.get(`/assessments/${id}`);
    return response.data;
  },

  async create(assessmentData) {
    const response = await api.post('/assessments', assessmentData);
    return response.data;
  },

  async updateStep(assessmentId, stepNumber, data) {
    const response = await api.put(`/assessments/${assessmentId}/step/${stepNumber}`, { data });
    return response.data;
  },

  async submit(assessmentId) {
    const response = await api.post(`/assessments/${assessmentId}/submit`);
    return response.data;
  },

  async review(assessmentId, action, comments) {
    const response = await api.post(`/assessments/${assessmentId}/review`, { action, comments });
    return response.data;
  },

  async delete(assessmentId) {
    const response = await api.delete(`/assessments/${assessmentId}`);
    return response.data;
  },

  async exportPDF(assessmentId) {
    const response = await api.get(`/exports/pdf/${assessmentId}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  async exportExcel(params = {}) {
    const response = await api.get('/exports/excel', {
      params,
      responseType: 'blob',
    });
    return response.data;
  },
};

export const analyticsService = {
  async getMaturityScore(assessmentId) {
    const response = await api.get(`/analytics/maturity-score/${assessmentId}`);
    return response.data;
  },

  async getEntitySummary(entityId) {
    const response = await api.get(`/analytics/entity-summary/${entityId}`);
    return response.data;
  },

  async getComparison(params = {}) {
    const response = await api.get('/analytics/comparison', { params });
    return response.data.comparison;
  },

  async getMinistryDashboard(ministryId) {
    const response = await api.get(`/analytics/ministry-dashboard/${ministryId}`);
    return response.data;
  },

  async exportComparisonExcel(params = {}) {
    const response = await api.get('/exports/comparison-excel', {
      params,
      responseType: 'blob',
    });
    return response.data;
  },
};

export const statisticsService = {
  async getComprehensive() {
    const response = await api.get('/statistics/comprehensive');
    return response.data;
  },

  async getMinistryStatistics(ministryId) {
    const response = await api.get(`/statistics/ministry/${ministryId}`);
    return response.data;
  },

  async exportStatisticsPDF() {
    const response = await api.get('/statistics/export/pdf', {
      responseType: 'blob',
    });
    return response.data;
  },

  async exportStatisticsExcel() {
    const response = await api.get('/statistics/export/excel', {
      responseType: 'blob',
    });
    return response.data;
  },
};

// ============================================
// New System Services
// ============================================

export const questionsNewService = {
  async getAll(params = {}) {
    const response = await api.get('/questions-new', { params });
    return response.data.questions || [];
  },

  async getById(id, params = {}) {
    const response = await api.get(`/questions-new/${id}`, { params });
    return response.data.question;
  },

  async create(questionData) {
    const response = await api.post('/questions-new', questionData);
    return response.data;
  },

  async update(id, questionData) {
    const response = await api.put(`/questions-new/${id}`, questionData);
    return response.data;
  },

  async delete(id) {
    const response = await api.delete(`/questions-new/${id}`);
    return response.data;
  },

  async getCategories() {
    const response = await api.get('/questions-new/meta/categories');
    return response.data.categories || [];
  },
};

export const answersService = {
  async getByInstitution(institutionId, params = {}) {
    const response = await api.get(`/answers/institution/${institutionId}`, { params });
    return response.data.answers || [];
  },

  async getById(id) {
    const response = await api.get(`/answers/${id}`);
    return response.data.answer;
  },

  async save(answerData) {
    const response = await api.post('/answers', answerData);
    return response.data;
  },

  async delete(id) {
    const response = await api.delete(`/answers/${id}`);
    return response.data;
  },

  async getAuditLog(institutionId, params = {}) {
    const response = await api.get(`/answers/audit/${institutionId}`, { params });
    return response.data.audit_logs || [];
  },
};

export const assessmentNewService = {
  ...assessmentService,

  async createSnapshot(assessmentId) {
    const response = await api.post(`/assessments/${assessmentId}/snapshot`);
    return response.data;
  },

  async getAnswers(assessmentId) {
    const response = await api.get(`/assessments/${assessmentId}/answers`);
    return response.data.answers || [];
  },

  async getByIdWithSnapshot(assessmentId) {
    const response = await api.get(`/assessments/${assessmentId}`, {
      params: { include_snapshot: true }
    });
    return response.data;
  },
};

// ============================================
// Reference Dictionary (Composite/MultiSelect)
// ============================================

export const referencesService = {
  /** Fetch by type (string) or category_id (number) - backward compatible. When value is numeric, always use category_id. */
  async getByType(typeOrCategoryId) {
    const isNumeric = typeof typeOrCategoryId === 'number' || (typeof typeOrCategoryId === 'string' && typeOrCategoryId.trim() !== '' && !isNaN(Number(typeOrCategoryId)));
    const params = isNumeric
      ? { category_id: Number(typeOrCategoryId) }
      : { type: typeOrCategoryId };
    const response = await api.get('/references', { params });
    return response.data.references || [];
  },
  async getAll(params = {}) {
    const response = await api.get('/references', {
      params: { include_inactive: 'true', ...params }
    });
    return response.data.references || [];
  },
  async create(data) {
    const response = await api.post('/references', data);
    return response.data;
  },
  async update(id, data) {
    const response = await api.put(`/references/${id}`, data);
    return response.data;
  },
  async toggle(id) {
    const response = await api.patch(`/references/${id}/toggle`);
    return response.data;
  },
  async delete(id) {
    const response = await api.delete(`/references/${id}`);
    return response.data;
  },
};

// ============================================
// Central Category System Services
// ============================================

export const categoriesService = {
  async getAll(params = {}) {
    const response = await api.get('/categories', { params });
    return response.data.categories || [];
  },

  async getById(id) {
    const response = await api.get(`/categories/${id}`);
    return response.data.category;
  },

  async create(categoryData) {
    const response = await api.post('/categories', categoryData);
    return response.data;
  },

  async update(id, categoryData) {
    const response = await api.put(`/categories/${id}`, categoryData);
    return response.data;
  },

  async toggle(id) {
    const response = await api.patch(`/categories/${id}/toggle`);
    return response.data;
  },

  async delete(id) {
    const response = await api.delete(`/categories/${id}`);
    return response.data;
  },

  async getUsage(id) {
    const response = await api.get(`/categories/${id}/usage`);
    return response.data;
  },
};

// ============================================
// Template Assessment Evaluation Services
// ============================================

export const templateAssessmentService = {
  // Get evaluation for a specific question
  async getQuestionEvaluation(assessmentId, questionId) {
    const response = await api.get(`/template-assessments/${assessmentId}/questions/${questionId}/evaluation`);
    return response.data.evaluation;
  },

  // Update evaluation for a single question
  async updateQuestionEvaluation(assessmentId, questionId, evaluationData) {
    const response = await api.put(`/template-assessments/${assessmentId}/questions/${questionId}/evaluation`, evaluationData);
    return response.data;
  },

  // Update evaluations for multiple questions (batch)
  async updateEvaluations(assessmentId, evaluations) {
    const response = await api.put(`/template-assessments/${assessmentId}/evaluations`, { evaluations });
    return response.data;
  },
};
