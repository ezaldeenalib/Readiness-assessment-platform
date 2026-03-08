import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function Dashboard({ user }) {
  const [stats, setStats] = useState(null);
  const [recentAssessments, setRecentAssessments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('❌ No token found in localStorage');
        alert('يرجى تسجيل الدخول أولاً');
        window.location.href = '/login';
        return;
      }

      const params = user.role === 'entity_user' && user.entity_id ? { entity_id: user.entity_id } : {};
      const res = await api.get('/template-assessments', { params });
      const list = res.data.assessments || [];

      setRecentAssessments(list.slice(0, 5));

      const draft_count = list.filter((a) => a.status === 'draft').length;
      const submitted_count = list.filter((a) => a.status === 'submitted').length;
      const approved_count = list.filter((a) => a.status === 'approved').length;
      setStats({
        total_assessments: list.length,
        draft_count,
        submitted_count,
        approved_count,
      });
    } catch (error) {
      console.error('Failed to load dashboard:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      
      if (error.response?.status === 401 || error.response?.status === 403) {
        alert('انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى.');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      } else {
        alert('فشل تحميل البيانات. يرجى المحاولة مرة أخرى.');
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      draft: 'badge-secondary',
      submitted: 'badge-info',
      approved: 'badge-success',
      rejected: 'badge-danger',
    };
    const labels = {
      draft: 'مسودة',
      submitted: 'مقدم',
      approved: 'معتمد',
      rejected: 'مرفوض',
    };
    return <span className={`badge ${badges[status]}`}>{labels[status]}</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            مرحباً، {user.full_name}
          </h1>
          <p className="text-gray-600">
            {user.entity_name_ar || user.entity_name || 'لوحة التحكم الرئيسية'}
          </p>
        </div>
        
        <Link to="/template-assessments" className="btn btn-primary">
          + تقييم جديد
        </Link>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <h3 className="text-sm font-semibold opacity-90 mb-2">إجمالي التقييمات</h3>
            <p className="text-4xl font-bold">{stats.total_assessments || 0}</p>
          </div>

          <div className="card bg-gradient-to-br from-yellow-500 to-orange-600 text-white">
            <h3 className="text-sm font-semibold opacity-90 mb-2">قيد الإعداد</h3>
            <p className="text-4xl font-bold">{stats.draft_count || 0}</p>
          </div>

          <div className="card bg-gradient-to-br from-purple-500 to-pink-600 text-white">
            <h3 className="text-sm font-semibold opacity-90 mb-2">مقدمة</h3>
            <p className="text-4xl font-bold">{stats.submitted_count || 0}</p>
          </div>

          <div className="card bg-gradient-to-br from-green-500 to-teal-600 text-white">
            <h3 className="text-sm font-semibold opacity-90 mb-2">معتمدة</h3>
            <p className="text-4xl font-bold">{stats.approved_count || 0}</p>
          </div>
        </div>
      )}

      {/* Recent Assessments */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="card-header mb-0">التقييمات الأخيرة</h2>
          <Link to="/template-assessments" className="text-primary-600 hover:text-primary-700 font-semibold">
            عرض الكل ←
          </Link>
        </div>

        {recentAssessments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>الجهة</th>
                  <th>القالب</th>
                  <th>السنة</th>
                  <th>الربع</th>
                  <th>الحالة</th>
                  <th>النسبة %</th>
                  <th>التاريخ</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {recentAssessments.map((assessment) => (
                  <tr key={assessment.id}>
                    <td className="font-semibold">{assessment.entity_name_ar || assessment.entity_name}</td>
                    <td>{assessment.template_name_ar || assessment.template_name}</td>
                    <td>{assessment.year || '-'}</td>
                    <td>{assessment.quarter ? `Q${assessment.quarter}` : '-'}</td>
                    <td>{getStatusBadge(assessment.status)}</td>
                    <td>
                      {assessment.percentage_score != null ? (
                        <span className="font-bold text-primary-600">
                          {Number(assessment.percentage_score).toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td>{assessment.created_at ? new Date(assessment.created_at).toLocaleDateString('ar-IQ') : '-'}</td>
                    <td>
                      <Link
                        to={`/template-assessments/${assessment.id}`}
                        className="text-primary-600 hover:text-primary-800 font-semibold"
                      >
                        عرض
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>لا توجد تقييمات حالياً</p>
            {user.role !== 'super_admin' && (
              <Link to="/template-assessments" className="btn btn-primary mt-4">
                إنشاء تقييم جديد
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <Link to="/template-assessments" className="card hover:shadow-lg transition-shadow cursor-pointer">
          <h3 className="font-bold text-lg text-primary-700 mb-2">📋 إدارة التقييمات</h3>
          <p className="text-gray-600 text-sm">عرض وإدارة تقييمات القوالب</p>
        </Link>

        {(user.role === 'ministry_admin' || user.role === 'super_admin') && (
          <>
            <Link to="/ministry-dashboard" className="card hover:shadow-lg transition-shadow cursor-pointer">
              <h3 className="font-bold text-lg text-purple-700 mb-2">📊 لوحة الوزارة</h3>
              <p className="text-gray-600 text-sm">إحصائيات ومقارنات شاملة</p>
            </Link>

            <Link to="/entities" className="card hover:shadow-lg transition-shadow cursor-pointer">
              <h3 className="font-bold text-lg text-green-700 mb-2">🏢 إدارة الجهات</h3>
              <p className="text-gray-600 text-sm">إضافة وتعديل الجهات التابعة</p>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
