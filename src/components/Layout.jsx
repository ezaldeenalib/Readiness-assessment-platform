import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

// Icons as SVG components for better control
const Icons = {
  Dashboard: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ),
  Assessment: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
  Template: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
    </svg>
  ),
  QuestionBank: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  StaticData: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
    </svg>
  ),
  Entities: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  Statistics: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  Ministry: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
    </svg>
  ),
  Menu: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  ),
  Close: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Logout: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  ),
  User: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  ChevronDown: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  ),
  ChevronUp: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    </svg>
  ),
};

export default function Layout({ user, onLogout, children }) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState(['management']);
  const [showMyPermissions, setShowMyPermissions] = useState(false);

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const toggleMenu = (menuKey) => {
    setExpandedMenus(prev => 
      prev.includes(menuKey) 
        ? prev.filter(k => k !== menuKey)
        : [...prev, menuKey]
    );
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'super_admin': return 'مدير النظام';
      case 'ministry_admin': return 'مدير الوزارة';
      case 'entity_user': return 'مستخدم جهة';
      default: return role;
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'super_admin': return 'bg-purple-100 text-purple-800';
      case 'ministry_admin': return 'bg-blue-100 text-blue-800';
      case 'entity_user': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const permissionLabels = {
    view_questions: 'عرض الأسئلة',
    create_question: 'إنشاء سؤال',
    edit_question: 'تعديل سؤال',
    delete_question: 'حذف سؤال',
    view_templates: 'عرض القوالب',
    create_template: 'إنشاء قالب',
    edit_template: 'تعديل قالب',
    delete_template: 'حذف قالب',
    view_assessments: 'عرض التقييمات',
    fill_assessment: 'تعبئة تقييم',
    submit_assessment: 'تقديم تقييم',
    evaluate_assessment: 'مراجعة التقييمات',
    view_reports: 'عرض التقارير',
    export_reports: 'تصدير التقارير',
    manage_users: 'إدارة المستخدمين',
    view_entities: 'عرض الجهات',
    manage_entities: 'إدارة الجهات',
    manage_categories: 'إدارة الفئات',
    manage_references: 'قاموس المراجع',
  };
  const userPermissions = user.permissions || [];
  const institutionNames = user.institution_names?.length > 0
    ? user.institution_names.map(e => e.name_ar || e.name)
    : (user.entity_name_ar ? [user.entity_name_ar] : []);

  // Menu configuration
  const menuItems = [
    {
      key: 'dashboard',
      label: 'لوحة التحكم',
      path: '/dashboard',
      icon: Icons.Dashboard,
      roles: ['super_admin', 'ministry_admin', 'entity_user']
    },
    {
      key: 'evaluations',
      label: 'التقييمات',
      path: '/template-assessments',
      icon: Icons.Assessment,
      roles: ['super_admin', 'ministry_admin', 'entity_user']
    },
    {
      key: 'management',
      label: 'إدارة النظام',
      icon: Icons.Template,
      roles: ['super_admin', 'ministry_admin'],
      submenu: [
        { label: 'القوالب', path: '/templates', roles: ['super_admin', 'ministry_admin'] },
        { label: 'بنك الأسئلة', path: '/question-bank', roles: ['super_admin', 'ministry_admin'] },
        { label: 'إدارة الفئات', path: '/categories', roles: ['super_admin', 'ministry_admin'] },
        { label: 'قاموس المراجع', path: '/references-dictionary', roles: ['super_admin', 'ministry_admin'] },
      ]
    },
    {
      key: 'entities',
      label: 'إدارة الجهات',
      path: '/entities',
      icon: Icons.Entities,
      roles: ['super_admin', 'ministry_admin']
    },
    {
      key: 'ministry',
      label: 'لوحة الوزارة',
      path: '/ministry-dashboard',
      icon: Icons.Ministry,
      roles: ['super_admin', 'ministry_admin']
    },
    {
      key: 'statistics',
      label: 'التقارير والإحصائيات',
      path: '/statistics',
      icon: Icons.Statistics,
      roles: ['super_admin']
    },
    {
      key: 'permissions',
      label: 'إدارة الصلاحيات',
      path: '/permissions',
      icon: Icons.User,
      roles: ['super_admin']
    },
  ];

  const filteredMenuItems = menuItems.filter(item => item.roles.includes(user.role));

  const NavItem = ({ item, mobile = false }) => {
    const hasSubmenu = item.submenu && item.submenu.length > 0;
    const isExpanded = expandedMenus.includes(item.key);
    const Icon = item.icon;

    if (hasSubmenu) {
      const filteredSubmenu = item.submenu.filter(sub => sub.roles.includes(user.role));
      const isSubmenuActive = filteredSubmenu.some(sub => isActive(sub.path));

      return (
        <div className="mb-1">
          <button
            onClick={() => toggleMenu(item.key)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 ${
              isSubmenuActive 
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <Icon />
              <span className="font-medium">{item.label}</span>
            </div>
            {isExpanded ? <Icons.ChevronUp /> : <Icons.ChevronDown />}
          </button>
          
          {isExpanded && (
            <div className="mt-1 mr-4 pr-4 border-r-2 border-gray-200 space-y-1">
              {filteredSubmenu.map((subItem, idx) => (
                <Link
                  key={idx}
                  to={subItem.path}
                  onClick={() => mobile && setSidebarOpen(false)}
                  className={`block px-4 py-2.5 rounded-lg transition-all duration-200 ${
                    isActive(subItem.path)
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  {subItem.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        to={item.path}
        onClick={() => mobile && setSidebarOpen(false)}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-1 transition-all duration-200 ${
          isActive(item.path)
            ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        <Icon />
        <span className="font-medium">{item.label}</span>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 right-0 h-full w-72 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
      }`}>
        {/* Logo Section */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">ت</span>
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-sm">نظام التقييم</h1>
              <p className="text-xs text-gray-500">النضج الرقمي</p>
            </div>
          </div>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
          >
            <Icons.Close />
          </button>
        </div>

        {/* User Profile Section */}
        <div className="p-4 border-b border-gray-100">
          <button
            type="button"
            onClick={() => setShowMyPermissions(!showMyPermissions)}
            className="w-full flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors text-right"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-lg">
                {user.full_name?.charAt(0) || 'م'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 truncate">{user.full_name}</p>
              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                {getRoleLabel(user.role)}
              </span>
            </div>
            {showMyPermissions ? <Icons.ChevronUp /> : <Icons.ChevronDown />}
          </button>
          {showMyPermissions && (
            <div className="mt-2 p-3 bg-white border border-gray-100 rounded-xl text-sm space-y-3 max-h-64 overflow-y-auto">
              <div>
                <p className="font-medium text-gray-700 mb-1.5">صلاحياتي</p>
                {userPermissions.length > 0 ? (
                  <ul className="space-y-1 text-gray-600">
                    {userPermissions.map(p => (
                      <li key={p} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0" />
                        {permissionLabels[p] || p}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-400 text-xs">لا توجد صلاحيات محملة. سجّل الخروج ثم الدخول مرة أخرى.</p>
                )}
              </div>
              <div>
                <p className="font-medium text-gray-700 mb-1.5">الجهات التي يمكنني تقييمها</p>
                {institutionNames.length > 0 ? (
                  <ul className="space-y-1 text-gray-600">
                    {institutionNames.map((name, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0" />
                        {name}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-400 text-xs">لا توجد جهة معيّنة.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="p-4 flex-1 overflow-y-auto h-[calc(100vh-280px)]">
          <div className="space-y-1">
            {filteredMenuItems.map((item) => (
              <NavItem key={item.key} item={item} />
            ))}
          </div>
        </nav>

        {/* Logout Button */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100 bg-white">
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors font-medium"
          >
            <Icons.Logout />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="lg:mr-72">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100">
          <div className="flex items-center justify-between h-16 px-4 lg:px-8">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
              >
                <Icons.Menu />
              </button>
              <div>
                <h2 className="font-bold text-gray-900">
                  {location.pathname === '/dashboard' && 'لوحة التحكم'}
                  {location.pathname === '/template-assessments' && 'تقييمات القوالب'}
                  {location.pathname === '/templates' && 'إدارة القوالب'}
                  {location.pathname.startsWith('/templates/') && 'منشئ القوالب'}
                  {location.pathname === '/question-bank' && 'بنك الأسئلة'}
                  {location.pathname === '/categories' && 'إدارة الفئات'}
                  {location.pathname === '/references-dictionary' && 'قاموس المراجع'}
                  {location.pathname === '/entities' && 'إدارة الجهات'}
                  {location.pathname === '/ministry-dashboard' && 'لوحة الوزارة'}
                  {location.pathname === '/statistics' && 'التقارير والإحصائيات'}
                  {location.pathname === '/permissions' && 'إدارة الصلاحيات'}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Quick Stats or Notifications can go here */}
              <div className="hidden md:flex items-center gap-2 text-sm text-gray-500">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span>متصل</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-8">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-gray-100 bg-white mt-8">
          <div className="px-4 lg:px-8 py-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-sm text-gray-500">
                © {new Date().getFullYear()} نظام تقييم النضج الرقمي والأمن السيبراني
              </p>
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <span>الإصدار 2.0</span>
                <span>•</span>
                <span>جميع الحقوق محفوظة</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
