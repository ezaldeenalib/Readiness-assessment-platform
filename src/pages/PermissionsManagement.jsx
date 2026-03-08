import React, { useState, useEffect, useCallback } from 'react';
import { usersService, entityService } from '../services';

// ─── ثوابت الصلاحيات (نسخة Frontend) ───────────────────────────
const PERMISSION_GROUPS = [
  {
    key: 'questions',
    label: 'بنك الأسئلة',
    color: 'blue',
    icon: '❓',
    permissions: [
      { key: 'view_questions',   label: 'عرض الأسئلة' },
      { key: 'create_question',  label: 'إنشاء سؤال' },
      { key: 'edit_question',    label: 'تعديل سؤال' },
      { key: 'delete_question',  label: 'حذف سؤال' },
    ],
  },
  {
    key: 'templates',
    label: 'القوالب',
    color: 'purple',
    icon: '📋',
    permissions: [
      { key: 'view_templates',   label: 'عرض القوالب' },
      { key: 'create_template',  label: 'إنشاء قالب' },
      { key: 'edit_template',    label: 'تعديل قالب' },
      { key: 'delete_template',  label: 'حذف قالب' },
    ],
  },
  {
    key: 'assessments',
    label: 'التقييمات',
    color: 'green',
    icon: '📝',
    permissions: [
      { key: 'view_assessments',    label: 'عرض التقييمات' },
      { key: 'fill_assessment',     label: 'تعبئة تقييم' },
      { key: 'submit_assessment',   label: 'تقديم تقييم' },
      { key: 'evaluate_assessment', label: 'مراجعة وتقييم' },
    ],
  },
  {
    key: 'reports',
    label: 'التقارير',
    color: 'orange',
    icon: '📊',
    permissions: [
      { key: 'view_reports',   label: 'عرض التقارير' },
      { key: 'export_reports', label: 'تصدير التقارير' },
    ],
  },
  {
    key: 'admin',
    label: 'إدارة النظام',
    color: 'red',
    icon: '⚙️',
    permissions: [
      { key: 'manage_users',       label: 'إدارة المستخدمين' },
      { key: 'view_entities',      label: 'عرض الجهات' },
      { key: 'manage_entities',    label: 'إدارة الجهات' },
      { key: 'manage_categories',  label: 'إدارة الفئات' },
      { key: 'manage_references',  label: 'قاموس المراجع' },
    ],
  },
];

// صلاحيات كل دور الافتراضية
const ROLE_DEFAULT_PERMISSIONS = {
  Admin:            'all',
  super_admin:      'all',
  QuestionManager:  ['view_questions','create_question','edit_question','delete_question','view_templates'],
  Evaluator:        ['view_templates','view_assessments','evaluate_assessment','view_reports','export_reports'],
  InstitutionUser:  ['view_templates','view_assessments','fill_assessment','submit_assessment'],
  entity_user:      ['view_templates','view_assessments','fill_assessment','submit_assessment'],
  ministry_admin:   ['view_questions','create_question','edit_question','delete_question','view_templates','create_template','edit_template','delete_template','view_assessments','fill_assessment','submit_assessment','evaluate_assessment','view_reports','export_reports','view_entities','manage_categories','manage_references'],
  Viewer:           ['view_questions','view_templates','view_assessments','view_reports'],
};

const ROLE_INFO = {
  Admin:            { label: 'مدير النظام',     badge: 'bg-purple-100 text-purple-800',  dot: 'bg-purple-500' },
  super_admin:      { label: 'مدير النظام',     badge: 'bg-purple-100 text-purple-800',  dot: 'bg-purple-500' },
  ministry_admin:   { label: 'مدير الوزارة',    badge: 'bg-blue-100 text-blue-800',      dot: 'bg-blue-500' },
  QuestionManager:  { label: 'مدير الأسئلة',    badge: 'bg-yellow-100 text-yellow-800',  dot: 'bg-yellow-500' },
  Evaluator:        { label: 'مقيِّم',            badge: 'bg-indigo-100 text-indigo-800',  dot: 'bg-indigo-500' },
  InstitutionUser:  { label: 'مستخدم مؤسسة',    badge: 'bg-green-100 text-green-800',    dot: 'bg-green-500' },
  entity_user:      { label: 'مستخدم جهة',      badge: 'bg-green-100 text-green-800',    dot: 'bg-green-500' },
  Viewer:           { label: 'مشاهد',            badge: 'bg-gray-100 text-gray-700',      dot: 'bg-gray-400' },
};

// أدوار الجدول القديم (users.role) — للإنشاء
const LEGACY_ROLES = [
  { value: 'entity_user',    label: 'مستخدم جهة' },
  { value: 'ministry_admin', label: 'مدير الوزارة' },
  { value: 'super_admin',   label: 'مدير النظام' },
];

const COLOR = {
  blue:   { bg: 'bg-blue-50',   border: 'border-blue-200',   title: 'text-blue-700',   check: 'accent-blue-600' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', title: 'text-purple-700', check: 'accent-purple-600' },
  green:  { bg: 'bg-green-50',  border: 'border-green-200',  title: 'text-green-700',  check: 'accent-green-600' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', title: 'text-orange-700', check: 'accent-orange-600' },
  red:    { bg: 'bg-red-50',    border: 'border-red-200',    title: 'text-red-700',    check: 'accent-red-600' },
};

function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed bottom-6 left-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-sm font-medium transition-all
      ${type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
      <span>{type === 'success' ? '✓' : '✗'}</span>
      <span>{msg}</span>
    </div>
  );
}

export default function PermissionsManagement() {
  const [users, setUsers]                 = useState([]);
  const [roles, setRoles]                 = useState([]);
  const [entities, setEntities]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [selectedUser, setSelectedUser]   = useState(null);
  const [userRoles, setUserRoles]         = useState([]);
  const [userInstitutions, setUserInstitutions] = useState([]);
  const [saving, setSaving]               = useState(false);
  const [search, setSearch]               = useState('');
  const [activeTab, setActiveTab]         = useState('roles');   // 'roles' | 'institutions'
  const [toast, setToast]                 = useState(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm]       = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'entity_user',
    entity_id: '',
    role_ids: [],
  });
  const [createSubmitting, setCreateSubmitting] = useState(false);

  const showToast = useCallback((msg, type = 'success') => setToast({ msg, type }), []);

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (selectedUser) loadUserDetails(selectedUser.id);
    else { setUserRoles([]); setUserInstitutions([]); }
  }, [selectedUser]);

  const load = async () => {
    try {
      setLoading(true);
      const [u, r, e] = await Promise.all([
        usersService.getAll(),
        usersService.getRoles(),
        entityService.getAll(),
      ]);
      setUsers(u);
      setRoles(r);
      setEntities(Array.isArray(e) ? e : []);
    } catch (err) {
      showToast('فشل التحميل: ' + (err.response?.data?.error || err.message), 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadUserDetails = async (userId) => {
    setLoadingDetails(true);
    try {
      const [r, i] = await Promise.all([
        usersService.getUserRoles(userId),
        usersService.getUserInstitutions(userId),
      ]);
      setUserRoles(r);
      setUserInstitutions(i);
    } catch (err) {
      showToast('فشل تحميل تفاصيل المستخدم', 'error');
    } finally {
      setLoadingDetails(false);
    }
  };

  const toggleRole = (role) => {
    const has = userRoles.some(r => r.id === role.id);
    setUserRoles(prev => has ? prev.filter(r => r.id !== role.id) : [...prev, role]);
  };

  const toggleInstitution = (entity) => {
    const has = userInstitutions.some(e => e.id === entity.id);
    setUserInstitutions(prev => has ? prev.filter(e => e.id !== entity.id) : [...prev, entity]);
  };

  const handleSaveRoles = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      await usersService.updateUserRoles(selectedUser.id, userRoles.map(r => r.id));
      showToast('تم حفظ الأدوار بنجاح');
      await loadUserDetails(selectedUser.id);
    } catch (err) {
      showToast('فشل حفظ الأدوار: ' + (err.response?.data?.error || err.message), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveInstitutions = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      await usersService.updateUserInstitutions(selectedUser.id, userInstitutions.map(e => e.id));
      showToast('تم حفظ المؤسسات بنجاح');
      await loadUserDetails(selectedUser.id);
    } catch (err) {
      showToast('فشل حفظ المؤسسات: ' + (err.response?.data?.error || err.message), 'error');
    } finally {
      setSaving(false);
    }
  };

  const openCreateModal = () => {
    setCreateForm({
      email: '',
      password: '',
      full_name: '',
      role: 'entity_user',
      entity_id: '',
      role_ids: [],
    });
    setShowCreateModal(true);
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!createForm.email.trim() || !createForm.password || !createForm.full_name.trim()) {
      showToast('أدخل البريد وكلمة المرور والاسم الكامل', 'error');
      return;
    }
    if (createForm.password.length < 6) {
      showToast('كلمة المرور 6 أحرف على الأقل', 'error');
      return;
    }
    setCreateSubmitting(true);
    try {
      const payload = {
        email: createForm.email.trim(),
        password: createForm.password,
        full_name: createForm.full_name.trim(),
        role: createForm.role,
        entity_id: createForm.entity_id ? parseInt(createForm.entity_id, 10) : null,
        role_ids: createForm.role_ids,
      };
      const { user: newUser } = await usersService.create(payload);
      await load();
      setSelectedUser({ ...newUser, entity_name: newUser.entity_name, entity_name_ar: newUser.entity_name_ar });
      setActiveTab('roles');
      setShowCreateModal(false);
      showToast('تم إنشاء المستخدم وتعيين الصلاحيات بنجاح');
    } catch (err) {
      showToast(err.response?.data?.error || 'فشل إنشاء المستخدم', 'error');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const toggleCreateRole = (role) => {
    const ids = createForm.role_ids || [];
    const has = ids.includes(role.id);
    setCreateForm(prev => ({
      ...prev,
      role_ids: has ? ids.filter(id => id !== role.id) : [...ids, role.id],
    }));
  };

  // الصلاحيات الفعلية من الأدوار المُعيَّنة (للعرض فقط)
  const effectivePermissions = (() => {
    const perms = new Set();
    userRoles.forEach(role => {
      const defaults = ROLE_DEFAULT_PERMISSIONS[role.name];
      if (defaults === 'all') {
        PERMISSION_GROUPS.forEach(g => g.permissions.forEach(p => perms.add(p.key)));
      } else if (Array.isArray(defaults)) {
        defaults.forEach(p => perms.add(p));
      }
    });
    return perms;
  })();

  const filteredUsers = users.filter(u =>
    (u.full_name || '').includes(search) ||
    u.email.includes(search) ||
    (u.entity_name_ar || '').includes(search)
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3" dir="rtl">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        <p className="text-gray-500">جاري تحميل بيانات المستخدمين...</p>
      </div>
    );
  }

  const roleInfo = selectedUser ? (ROLE_INFO[selectedUser.role] || { label: selectedUser.role, badge: 'bg-gray-100 text-gray-700', dot: 'bg-gray-400' }) : null;

  return (
    <div className="space-y-6 pb-10" dir="rtl">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* ─── نافذة إنشاء مستخدم جديد ─── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => !createSubmitting && setShowCreateModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">إنشاء مستخدم جديد</h3>
              <button type="button" onClick={() => !createSubmitting && setShowCreateModal(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="p-5 overflow-y-auto flex-1 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الاسم الكامل *</label>
                <input
                  type="text"
                  value={createForm.full_name}
                  onChange={e => setCreateForm(prev => ({ ...prev, full_name: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
                  placeholder="أحمد محمد"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني *</label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={e => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
                  placeholder="user@example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور * (6 أحرف على الأقل)</label>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={e => setCreateForm(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
                  placeholder="••••••••"
                  minLength={6}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الدور (الجدول القديم)</label>
                <select
                  value={createForm.role}
                  onChange={e => setCreateForm(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
                >
                  {LEGACY_ROLES.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الجهة (اختياري)</label>
                <select
                  value={createForm.entity_id}
                  onChange={e => setCreateForm(prev => ({ ...prev, entity_id: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
                >
                  <option value="">— لا جهة —</option>
                  {entities.map(ent => (
                    <option key={ent.id} value={ent.id}>{ent.name_ar || ent.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">أدوار RBAC (صلاحيات الوصول)</label>
                <p className="text-xs text-gray-500 mb-2">اختر دوراً أو أكثر. الصلاحيات تُستمد تلقائياً من الأدوار.</p>
                <div className="flex flex-wrap gap-2">
                  {roles.map(role => {
                    const info = ROLE_INFO[role.name] || { label: role.label_ar || role.name, badge: 'bg-gray-100 text-gray-700' };
                    const checked = (createForm.role_ids || []).includes(role.id);
                    return (
                      <label
                        key={role.id}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer text-sm transition-all
                          ${checked ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-gray-200 hover:bg-gray-50'}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCreateRole(role)}
                          className="rounded accent-blue-600"
                        />
                        {info.label}
                      </label>
                    );
                  })}
                </div>
                {roles.length === 0 && (
                  <p className="text-amber-600 text-xs">لا توجد أدوار. شغّل migrate_rbac.js أولاً.</p>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => !createSubmitting && setShowCreateModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {createSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      جاري الإنشاء...
                    </>
                  ) : (
                    'إنشاء المستخدم'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">إدارة الصلاحيات</h1>
          <p className="text-sm text-gray-500 mt-1">تعيين الأدوار والوصول للمستخدمين عبر نظام RBAC</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 shadow-sm transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            إنشاء مستخدم جديد
          </button>
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 text-sm">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            <span className="text-blue-700 font-medium">{users.length} مستخدم</span>
            <span className="text-blue-400 mx-1">·</span>
            <span className="text-blue-700 font-medium">{roles.length} دور</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ─── عمود المستخدمين ─── */}
        <div className="lg:col-span-4 xl:col-span-3 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800 mb-3">المستخدمون</h2>
            <div className="relative">
              <input
                type="text"
                placeholder="بحث باسم أو بريد..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-4 pr-9 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          <ul className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {filteredUsers.length === 0 && (
              <li className="p-6 text-center text-gray-400 text-sm">لا يوجد مستخدمون</li>
            )}
            {filteredUsers.map(u => {
              const info = ROLE_INFO[u.role] || { label: u.role, badge: 'bg-gray-100 text-gray-700', dot: 'bg-gray-400' };
              const isActive = selectedUser?.id === u.id;
              return (
                <li key={u.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedUser(u)}
                    className={`w-full text-right px-4 py-3.5 flex items-center gap-3 transition-all
                      ${isActive ? 'bg-blue-50 border-r-4 border-blue-600' : 'hover:bg-gray-50 border-r-4 border-transparent'}`}
                  >
                    {/* أفاتار */}
                    <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white font-semibold text-sm
                      ${isActive ? 'bg-blue-600' : 'bg-gradient-to-br from-gray-400 to-gray-600'}`}>
                      {(u.full_name || u.email).charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate text-sm">{u.full_name || '—'}</div>
                      <div className="text-xs text-gray-500 truncate">{u.email}</div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`inline-block w-1.5 h-1.5 rounded-full ${info.dot}`}></span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${info.badge}`}>{info.label}</span>
                      </div>
                    </div>
                    {isActive && (
                      <svg className="w-4 h-4 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* ─── لوحة التفاصيل ─── */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-4">

          {!selectedUser ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center min-h-[420px] text-center p-8">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">اختر مستخدماً</h3>
              <p className="text-gray-500 text-sm max-w-xs">اختر مستخدماً من القائمة على اليمين لعرض وتعديل أدواره وصلاحياته ونطاق وصوله.</p>
            </div>
          ) : loadingDetails ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center min-h-[300px]">
              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* ─── بطاقة المستخدم ─── */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                    {(selectedUser.full_name || selectedUser.email).charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-bold text-gray-900">{selectedUser.full_name || '—'}</h2>
                    <p className="text-sm text-gray-500">{selectedUser.email}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${roleInfo.badge}`}>
                        {roleInfo.label}
                      </span>
                      {selectedUser.entity_name_ar && (
                        <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 font-medium">
                          {selectedUser.entity_name_ar}
                        </span>
                      )}
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${selectedUser.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {selectedUser.is_active ? 'نشط' : 'معطّل'}
                      </span>
                    </div>
                  </div>
                  {/* ملخص الصلاحيات */}
                  <div className="hidden sm:flex flex-col items-center bg-blue-50 rounded-xl px-5 py-3 text-center flex-shrink-0">
                    <span className="text-3xl font-bold text-blue-600">{effectivePermissions.size}</span>
                    <span className="text-xs text-blue-500 mt-0.5">صلاحية فعّالة</span>
                  </div>
                </div>
              </div>

              {/* ─── تبويبات ─── */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex border-b border-gray-100">
                  {[
                    { id: 'roles', label: 'الأدوار المعيَّنة', icon: '🎭' },
                    { id: 'permissions', label: 'الصلاحيات الفعّالة', icon: '🔐' },
                    { id: 'institutions', label: 'المؤسسات المسندة', icon: '🏢' },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex-1 sm:flex-none px-5 py-3.5 text-sm font-medium flex items-center justify-center gap-2 transition-all border-b-2
                        ${activeTab === tab.id
                          ? 'border-blue-600 text-blue-700 bg-blue-50/60'
                          : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}
                    >
                      <span>{tab.icon}</span>
                      <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                  ))}
                </div>

                <div className="p-5">

                  {/* ─── TAB: الأدوار ─── */}
                  {activeTab === 'roles' && (
                    <div className="space-y-4">
                      <p className="text-sm text-gray-500">
                        الصلاحيات الفعلية تُستمد تلقائياً من الأدوار المعيّنة. اختر دوراً أو أكثر ثم اضغط «حفظ».
                      </p>

                      {roles.length === 0 ? (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
                          ⚠️ لا توجد أدوار في النظام. شغّل <code className="bg-amber-100 px-1 rounded">node server/database/migrate_rbac.js</code> أولاً.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {roles.map(role => {
                            const isSelected = userRoles.some(r => r.id === role.id);
                            const info = ROLE_INFO[role.name] || { label: role.label_ar || role.name, badge: 'bg-gray-100 text-gray-700', dot: 'bg-gray-400' };
                            const permsCount = (() => {
                              const d = ROLE_DEFAULT_PERMISSIONS[role.name];
                              if (d === 'all') return 'كل الصلاحيات';
                              return Array.isArray(d) ? `${d.length} صلاحية` : '0 صلاحية';
                            })();
                            return (
                              <button
                                key={role.id}
                                type="button"
                                onClick={() => toggleRole(role)}
                                className={`text-right p-4 rounded-xl border-2 transition-all flex flex-col gap-2 cursor-pointer
                                  ${isSelected
                                    ? 'border-blue-500 bg-blue-50 shadow-sm shadow-blue-100'
                                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'}`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${info.badge}`}>
                                    {info.label}
                                  </span>
                                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
                                    ${isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}>
                                    {isSelected && (
                                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                      </svg>
                                    )}
                                  </div>
                                </div>
                                <div className="font-semibold text-gray-800 text-sm">{role.label_ar || role.name}</div>
                                <div className="text-xs text-gray-500">{permsCount}</div>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <span className="text-sm text-gray-500">
                          {userRoles.length > 0
                            ? `${userRoles.length} دور محدد`
                            : 'لم يُحدد أي دور'}
                        </span>
                        <button
                          type="button"
                          onClick={handleSaveRoles}
                          disabled={saving || roles.length === 0}
                          className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                        >
                          {saving ? (
                            <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                          حفظ الأدوار
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ─── TAB: الصلاحيات الفعّالة ─── */}
                  {activeTab === 'permissions' && (
                    <div className="space-y-4">
                      <p className="text-sm text-gray-500">
                        هذه الصلاحيات الفعلية المستمدة من الأدوار المعيّنة. لتغييرها، عدّل الأدوار من تبويب «الأدوار المعيّنة».
                      </p>

                      {userRoles.length === 0 ? (
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center text-gray-500 text-sm">
                          لا توجد أدوار معيّنة — لا صلاحيات فعّالة.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {PERMISSION_GROUPS.map(group => {
                            const c = COLOR[group.color];
                            const groupPerms = group.permissions;
                            const activeCount = groupPerms.filter(p => effectivePermissions.has(p.key)).length;
                            return (
                              <div key={group.key} className={`rounded-xl border ${c.border} ${c.bg} overflow-hidden`}>
                                <div className={`flex items-center justify-between px-4 py-2.5`}>
                                  <div className="flex items-center gap-2">
                                    <span>{group.icon}</span>
                                    <span className={`font-semibold text-sm ${c.title}`}>{group.label}</span>
                                  </div>
                                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c.title} bg-white/70`}>
                                    {activeCount}/{groupPerms.length}
                                  </span>
                                </div>
                                <div className="px-4 pb-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                  {groupPerms.map(perm => {
                                    const has = effectivePermissions.has(perm.key);
                                    return (
                                      <div key={perm.key} className={`flex items-center gap-2 text-sm px-2 py-1 rounded-lg
                                        ${has ? 'text-gray-800' : 'text-gray-400'}`}>
                                        {has ? (
                                          <span className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                          </span>
                                        ) : (
                                          <span className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                                            <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                          </span>
                                        )}
                                        {perm.label}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ─── TAB: المؤسسات ─── */}
                  {activeTab === 'institutions' && (
                    <div className="space-y-4">
                      <p className="text-sm text-gray-500">
                        للمستخدمين ذوي النطاق <strong>assigned</strong>، حدّد الجهات التي يمكنهم الوصول إليها.
                      </p>

                      {entities.length === 0 ? (
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center text-gray-500 text-sm">
                          لا توجد جهات في النظام.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto">
                          {entities.map(entity => {
                            const isChecked = userInstitutions.some(e => e.id === entity.id);
                            return (
                              <label
                                key={entity.id}
                                className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all
                                  ${isChecked
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleInstitution(entity)}
                                  className="w-4 h-4 accent-blue-600 rounded"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm text-gray-800 truncate">{entity.name_ar || entity.name}</div>
                                  {entity.name_ar && entity.name !== entity.name_ar && (
                                    <div className="text-xs text-gray-400 truncate">{entity.name}</div>
                                  )}
                                </div>
                                {isChecked && (
                                  <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </label>
                            );
                          })}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <span className="text-sm text-gray-500">
                          {userInstitutions.length > 0
                            ? `${userInstitutions.length} جهة محددة`
                            : 'لم تُحدد أي جهة'}
                        </span>
                        <button
                          type="button"
                          onClick={handleSaveInstitutions}
                          disabled={saving}
                          className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                        >
                          {saving ? (
                            <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                          حفظ المؤسسات
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
