import React, { useState, useEffect } from 'react';
import { statisticsService } from '../services';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';
import {
  WorkforceTab,
  ComplianceTab,
  DigitalTab,
  GapsTab,
  InfrastructureTab,
  RecommendationsTab,
} from '../components/StatisticsTabs';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

export default function ComprehensiveStatistics({ user }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('summary');

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      const data = await statisticsService.getComprehensive();
      setStats(data);
    } catch (error) {
      console.error('Failed to load statistics:', error);
      alert('فشل تحميل الإحصائيات');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      setLoading(true);
      const blob = await statisticsService.exportStatisticsPDF();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `التقرير_الإحصائي_الشامل_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export PDF:', error);
      alert('فشل تصدير PDF: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setLoading(true);
      const blob = await statisticsService.exportStatisticsExcel();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `التقرير_الإحصائي_التفصيلي_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export Excel:', error);
      alert('فشل تصدير Excel: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="spinner"></div>
        <span className="mr-3">جارٍ تحميل التحليل الشامل...</span>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="card">
        <p className="text-gray-600 text-center py-10">
          لا توجد بيانات كافية لإنشاء التقرير الإحصائي
        </p>
      </div>
    );
  }

  const tabs = [
    { id: 'summary', label: '📊 الملخص التنفيذي', icon: '📊' },
    { id: 'workforce', label: '👥 القوى البشرية', icon: '👥' },
    { id: 'compliance', label: '📜 الامتثال', icon: '📜' },
    { id: 'digital', label: '🚀 التحول الرقمي', icon: '🚀' },
    { id: 'gaps', label: '⚠️ الثغرات الحرجة', icon: '⚠️' },
    { id: 'infrastructure', label: '🖥️ البنية التحتية', icon: '🖥️' },
    { id: 'recommendations', label: '💡 التوصيات', icon: '💡' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-lg p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">
          🎯 التقرير الإحصائي الشامل للنضج الرقمي والأمن السيبراني
        </h1>
        <p className="text-blue-100">
          تحليل متقدم لجميع الجهات الحكومية المسجلة في النظام
        </p>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="إجمالي الجهات"
          value={stats.summary.total_entities}
          icon="🏛️"
          color="blue"
          subtitle={`${stats.summary.total_ministries} وزارة | ${stats.summary.total_branches} فرع`}
        />
        <StatCard
          title="التقييمات المكتملة"
          value={stats.summary.total_completed}
          icon="✅"
          color="green"
          subtitle={`من أصل ${stats.summary.total_assessments} تقييم`}
        />
        <StatCard
          title="متوسط النضج الرقمي"
          value={`${stats.summary.average_maturity_score != null ? Number(stats.summary.average_maturity_score).toFixed(1) : '0.0'}/100`}
          icon="📈"
          color="purple"
          subtitle={getRiskLabel(stats.summary.average_maturity_score)}
        />
        <StatCard
          title="الجهات عالية المخاطر"
          value={stats.riskDistribution.high + stats.riskDistribution.critical}
          icon="🔴"
          color="red"
          subtitle="تتطلب تدخل عاجل"
        />
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-2 space-x-reverse px-4" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  py-4 px-6 text-sm font-medium border-b-2 transition-colors
                  ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <span className="ml-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'summary' && <SummaryTab stats={stats} />}
          {activeTab === 'workforce' && <WorkforceTab stats={stats.workforce} />}
          {activeTab === 'compliance' && <ComplianceTab stats={stats.compliance} />}
          {activeTab === 'digital' && <DigitalTab stats={stats.digitalTransformation} />}
          {activeTab === 'gaps' && <GapsTab stats={stats.criticalGaps} />}
          {activeTab === 'infrastructure' && <InfrastructureTab stats={stats.infrastructure} />}
          {activeTab === 'recommendations' && <RecommendationsTab recommendations={stats.recommendations} />}
        </div>
      </div>

      {/* Export Options */}
      <div className="card">
        <h3 className="text-lg font-bold mb-4">📥 تصدير التقرير</h3>
        <div className="flex space-x-4 space-x-reverse">
          <button 
            onClick={handleExportPDF}
            disabled={loading}
            className="btn btn-primary"
          >
            <span className="ml-2">📄</span>
            {loading ? 'جارٍ التصدير...' : 'تصدير PDF شامل'}
          </button>
          <button 
            onClick={handleExportExcel}
            disabled={loading}
            className="btn btn-success"
          >
            <span className="ml-2">📊</span>
            {loading ? 'جارٍ التصدير...' : 'تصدير Excel تفصيلي'}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          💡 ملاحظة: قد يستغرق التصدير بضع ثوانٍ حسب حجم البيانات
        </p>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({ title, value, icon, color, subtitle }) {
  const colors = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    red: 'from-red-500 to-red-600',
    yellow: 'from-yellow-500 to-yellow-600',
  };

  return (
    <div className={`bg-gradient-to-r ${colors[color]} rounded-lg shadow-lg p-6 text-white`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm opacity-90 mb-1">{title}</p>
          <p className="text-3xl font-bold">{value}</p>
          {subtitle && <p className="text-xs opacity-75 mt-1">{subtitle}</p>}
        </div>
        <div className="text-4xl opacity-80">{icon}</div>
      </div>
    </div>
  );
}

// Summary Tab
function SummaryTab({ stats }) {
  const riskData = {
    labels: ['منخفض', 'متوسط', 'عالي', 'حرج'],
    datasets: [
      {
        data: [
          stats.riskDistribution.low,
          stats.riskDistribution.medium,
          stats.riskDistribution.high,
          stats.riskDistribution.critical,
        ],
        backgroundColor: ['#10b981', '#f59e0b', '#ef4444', '#991b1b'],
        borderWidth: 0,
      },
    ],
  };

  const comparisonData = {
    labels: stats.entitiesComparison.slice(0, 10).map(e => e.name),
    datasets: [
      {
        label: 'درجة النضج',
        data: stats.entitiesComparison.slice(0, 10).map(e => e.score),
        backgroundColor: '#3b82f6',
      },
    ],
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Risk Distribution Pie Chart */}
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-bold mb-4">🎯 توزيع مستويات المخاطر</h3>
          <Pie data={riskData} options={{ maintainAspectRatio: true }} />
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full ml-2"></div>
              <span>منخفض: {stats.riskDistribution.low}</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-yellow-500 rounded-full ml-2"></div>
              <span>متوسط: {stats.riskDistribution.medium}</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-500 rounded-full ml-2"></div>
              <span>عالي: {stats.riskDistribution.high}</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-900 rounded-full ml-2"></div>
              <span>حرج: {stats.riskDistribution.critical}</span>
            </div>
          </div>
        </div>

        {/* Top Entities */}
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-bold mb-4">🏆 أفضل 10 جهات (حسب النضج)</h3>
          <Bar 
            data={comparisonData} 
            options={{
              indexAxis: 'y',
              scales: {
                x: {
                  beginAtZero: true,
                  max: 100,
                },
              },
            }} 
          />
        </div>
      </div>

      {/* High Risk Entities Alert */}
      {stats.riskDistribution.high_risk_entities.length > 0 && (
        <div className="bg-red-50 border-r-4 border-red-500 p-4 rounded">
          <h4 className="font-bold text-red-800 mb-2">⚠️ جهات تتطلب تدخل عاجل:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {stats.riskDistribution.high_risk_entities.map((entity, index) => (
              <div key={index} className="text-sm text-red-700">
                • {entity.name} - درجة: {entity.score || 'غير محدد'} ({entity.level})
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trends if available */}
      {stats.trends && stats.trends.yearly_trends.length > 1 && (
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-bold mb-4">📈 التطور السنوي</h3>
          <Line
            data={{
              labels: stats.trends.yearly_trends.map(t => t.year),
              datasets: [
                {
                  label: 'متوسط النضج الرقمي',
                  data: stats.trends.yearly_trends.map(t => t.average_score),
                  borderColor: '#3b82f6',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  tension: 0.4,
                },
              ],
            }}
            options={{
              scales: {
                y: {
                  beginAtZero: true,
                  max: 100,
                },
              },
            }}
          />
          {stats.trends.improvements.length > 0 && (
            <div className="mt-4 text-sm">
              <p className="font-semibold">📊 التحسن السنوي:</p>
              {stats.trends.improvements.map((imp, index) => (
                <p key={index} className={imp.score_change > 0 ? 'text-green-600' : 'text-red-600'}>
                  {imp.from_year} → {imp.to_year}: 
                  {imp.score_change > 0 ? ' +' : ' '}
                  {imp.score_change != null ? Number(imp.score_change).toFixed(2) : '0.00'} نقطة
                  ({imp.percentage_change > 0 ? '+' : ''}{imp.percentage_change != null ? Number(imp.percentage_change).toFixed(1) : '0.0'}%)
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Continue in next message...
function getRiskLabel(score) {
  if (score >= 80) return 'منخفض - ممتاز';
  if (score >= 60) return 'متوسط - جيد';
  if (score >= 40) return 'عالي - يحتاج تحسين';
  return 'حرج - تدخل عاجل';
}

export { StatCard, SummaryTab, getRiskLabel };
