import React, { useState, useEffect } from 'react';
import { analyticsService } from '../services';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

export default function MinistryDashboard({ user }) {
  const [dashboardData, setDashboardData] = useState(null);
  const [comparisonData, setComparisonData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const [dashboard, comparison] = await Promise.all([
        analyticsService.getMinistryDashboard(user.entity_id),
        analyticsService.getComparison({ parent_entity_id: user.entity_id }),
      ]);
      setDashboardData(dashboard);
      setComparisonData(comparison);
    } catch (error) {
      alert('فشل تحميل لوحة التحكم: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleExportComparison = async () => {
    try {
      const blob = await analyticsService.exportComparisonExcel({ parent_entity_id: user.entity_id });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `entity_comparison_${Date.now()}.xlsx`;
      link.click();
    } catch (error) {
      alert('فشل التصدير: ' + (error.response?.data?.error || error.message));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!dashboardData) {
    return <div className="card">لا توجد بيانات متاحة</div>;
  }

  const stats = dashboardData.ministry_statistics;
  const riskData = [
    { name: 'منخفض', value: parseInt(stats.low_count) || 0, color: '#10b981' },
    { name: 'متوسط', value: parseInt(stats.medium_count) || 0, color: '#f59e0b' },
    { name: 'عالي', value: parseInt(stats.high_count) || 0, color: '#ef4444' },
    { name: 'حرج', value: parseInt(stats.critical_count) || 0, color: '#991b1b' },
  ];

  const maturityChartData = comparisonData
    .filter(e => e.avg_maturity_score)
    .map(e => ({
      name: e.name_ar || e.name,
      score: parseFloat(e.avg_maturity_score).toFixed(1),
    }))
    .slice(0, 10);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">لوحة الوزارة</h1>
          <p className="text-gray-600">
            نظرة شاملة على جميع الجهات التابعة
          </p>
        </div>
        <button onClick={handleExportComparison} className="btn btn-primary">
          📊 تصدير المقارنة
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <h3 className="text-sm font-semibold opacity-90 mb-2">إجمالي الجهات</h3>
          <p className="text-4xl font-bold">{dashboardData.entities.length}</p>
        </div>

        <div className="card bg-gradient-to-br from-purple-500 to-pink-600 text-white">
          <h3 className="text-sm font-semibold opacity-90 mb-2">إجمالي التقييمات</h3>
          <p className="text-4xl font-bold">{stats.total_assessments || 0}</p>
        </div>

        <div className="card bg-gradient-to-br from-green-500 to-teal-600 text-white">
          <h3 className="text-sm font-semibold opacity-90 mb-2">متوسط درجة النضج</h3>
          <p className="text-4xl font-bold">
            {stats.avg_maturity_score ? parseFloat(stats.avg_maturity_score).toFixed(1) : '0'}
          </p>
        </div>

        <div className="card bg-gradient-to-br from-red-500 to-orange-600 text-white">
          <h3 className="text-sm font-semibold opacity-90 mb-2">مخاطر عالية/حرجة</h3>
          <p className="text-4xl font-bold">
            {(parseInt(stats.high_count) || 0) + (parseInt(stats.critical_count) || 0)}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Risk Distribution */}
        <div className="card">
          <h2 className="card-header">توزيع مستويات المخاطر</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={riskData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name}: ${entry.value}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {riskData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Maturity Scores Comparison */}
        <div className="card">
          <h2 className="card-header">مقارنة درجات النضج</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={maturityChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Bar dataKey="score" fill="#2196f3" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Entities Table */}
      <div className="card">
        <h2 className="card-header">الجهات التابعة</h2>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>الجهة</th>
                <th>النوع</th>
                <th>عدد التقييمات</th>
                <th>درجة النضج</th>
                <th>مستوى المخاطر</th>
                <th>آخر تقييم</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {dashboardData.entities.map((entity) => (
                <tr key={entity.id}>
                  <td className="font-semibold">{entity.name_ar || entity.name}</td>
                  <td>
                    <span className="badge badge-info text-xs">
                      {entity.activity_type === 'government' ? 'حكومي' : entity.activity_type}
                    </span>
                  </td>
                  <td>{entity.total_assessments || 0}</td>
                  <td>
                    {entity.maturity_score ? (
                      <div className="flex items-center">
                        <span className="font-bold text-primary-600">
                          {parseFloat(entity.maturity_score).toFixed(1)}
                        </span>
                        <span className="text-gray-400 text-sm ml-1">/100</span>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td>
                    {entity.risk_level ? (
                      <span
                        className={`badge ${
                          entity.risk_level === 'low'
                            ? 'badge-success'
                            : entity.risk_level === 'medium'
                            ? 'badge-warning'
                            : entity.risk_level === 'high'
                            ? 'badge-danger'
                            : 'bg-red-600 text-white'
                        }`}
                      >
                        {entity.risk_level === 'low' && 'منخفض'}
                        {entity.risk_level === 'medium' && 'متوسط'}
                        {entity.risk_level === 'high' && 'عالي'}
                        {entity.risk_level === 'critical' && 'حرج'}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="text-sm">
                    {entity.last_assessment_date
                      ? new Date(entity.last_assessment_date).toLocaleDateString('ar-IQ')
                      : '-'}
                  </td>
                  <td>
                    {entity.last_assessment_status ? (
                      <span
                        className={`badge ${
                          entity.last_assessment_status === 'approved'
                            ? 'badge-success'
                            : entity.last_assessment_status === 'submitted'
                            ? 'badge-info'
                            : 'badge-secondary'
                        }`}
                      >
                        {entity.last_assessment_status === 'approved' && 'معتمد'}
                        {entity.last_assessment_status === 'submitted' && 'مقدم'}
                        {entity.last_assessment_status === 'draft' && 'مسودة'}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {stats.critical_count > 0 && (
          <div className="card bg-red-50 border-2 border-red-300">
            <h3 className="font-bold text-red-900 mb-3 text-lg">⚠️ تحذير - مخاطر حرجة</h3>
            <p className="text-red-800 mb-2">
              يوجد <strong>{stats.critical_count}</strong> جهة بمستوى مخاطر حرج تتطلب اهتماماً فورياً
            </p>
            <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
              <li>مراجعة فورية للأمن السيبراني</li>
              <li>تطبيق الحلول الأمنية الحرجة</li>
              <li>زيادة الموظفين المتخصصين</li>
            </ul>
          </div>
        )}

        {parseFloat(stats.avg_maturity_score || 0) < 60 && (
          <div className="card bg-yellow-50 border-2 border-yellow-300">
            <h3 className="font-bold text-yellow-900 mb-3 text-lg">📈 توصيات للتحسين</h3>
            <p className="text-yellow-800 mb-2">
              متوسط النضج الرقمي أقل من المستوى المطلوب (60%)
            </p>
            <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
              <li>تطوير البنية التحتية الرقمية</li>
              <li>تطبيق معايير الامتثال (ISO, NIST)</li>
              <li>تدريب الموظفين على الأمن السيبراني</li>
              <li>تطبيق المصادقة متعددة العوامل (MFA)</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
