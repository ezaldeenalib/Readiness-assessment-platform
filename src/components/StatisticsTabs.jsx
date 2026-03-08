import React from 'react';
import { Bar, Pie } from 'react-chartjs-2';

// Workforce Tab
export function WorkforceTab({ stats }) {
  const distributionData = {
    labels: ['ممتاز (≥2%)', 'جيد (1-2%)', 'مقبول (0.5-1%)', 'حرج (<0.5%)'],
    datasets: [
      {
        data: [
          stats.distribution.excellent,
          stats.distribution.good,
          stats.distribution.acceptable,
          stats.distribution.critical,
        ],
        backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'],
      },
    ],
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-600 font-semibold">متوسط نسبة موظفي الأمن السيبراني</p>
          <p className="text-3xl font-bold text-blue-700 mt-2">
            {stats.average_cyber_ratio.toFixed(2)}%
          </p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <p className="text-sm text-green-600 font-semibold">إجمالي موظفي الأمن السيبراني</p>
          <p className="text-3xl font-bold text-green-700 mt-2">
            {stats.total_cyber_staff}
          </p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <p className="text-sm text-red-600 font-semibold">جهات تعاني من عجز حاد</p>
          <p className="text-3xl font-bold text-red-700 mt-2">
            {stats.entities_with_deficit}
          </p>
        </div>
      </div>

      {/* Distribution Chart */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-bold mb-4">📊 توزيع الجهات حسب نسبة الكوادر</h3>
          <Pie data={distributionData} />
        </div>

        {/* Critical Deficit Entities */}
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-bold mb-4 text-red-600">
            ⚠️ جهات تعاني من نقص حاد (&lt; 0.5%)
          </h3>
          {stats.deficit_entities.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {stats.deficit_entities.map((entity, index) => (
                <div key={index} className="bg-red-50 p-3 rounded border border-red-200">
                  <p className="font-semibold text-sm">{entity.name}</p>
                  <div className="flex justify-between text-xs text-gray-600 mt-1">
                    <span>نسبة: {entity.ratio}%</span>
                    <span>عدد الموظفين: {entity.staff}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-green-600">✅ جميع الجهات تمتلك كوادر كافية</p>
          )}
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-yellow-50 border-r-4 border-yellow-500 p-4 rounded">
        <h4 className="font-bold text-yellow-800 mb-2">💡 توصيات:</h4>
        <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
          <li>إطلاق برنامج توظيف وطني مكثف لسد الفجوة في كوادر الأمن السيبراني</li>
          <li>تقديم حوافز ورواتب تنافسية لجذب الكفاءات</li>
          <li>إنشاء أكاديمية وطنية للأمن السيبراني لتأهيل الكوادر المحلية</li>
          <li>برامج تدريب وتطوير مستمرة للموظفين الحاليين</li>
        </ul>
      </div>
    </div>
  );
}

// Compliance Tab
export function ComplianceTab({ stats }) {
  const iso27001Data = {
    labels: ['كلي', 'جزئي', 'غير ممتثل'],
    datasets: [
      {
        label: 'ISO 27001',
        data: [stats.iso27001.full, stats.iso27001.partial, stats.iso27001.none],
        backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
      },
    ],
  };

  const nistData = {
    labels: ['كلي', 'جزئي', 'غير ممتثل'],
    datasets: [
      {
        label: 'NIST',
        data: [stats.nist.full, stats.nist.partial, stats.nist.none],
        backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
      },
    ],
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <p className="text-sm text-green-600 font-semibold">نسبة الامتثال ISO 27001</p>
          <p className="text-3xl font-bold text-green-700 mt-2">
            {stats.iso27001.percentage.toFixed(1)}%
          </p>
          <p className="text-xs text-gray-600 mt-1">{stats.iso27001.total} جهة</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-600 font-semibold">نسبة الامتثال NIST</p>
          <p className="text-3xl font-bold text-blue-700 mt-2">
            {stats.nist.percentage.toFixed(1)}%
          </p>
          <p className="text-xs text-gray-600 mt-1">{stats.nist.total} جهة</p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <p className="text-sm text-red-600 font-semibold">بدون معايير امتثال</p>
          <p className="text-3xl font-bold text-red-700 mt-2">
            {stats.no_compliance}
          </p>
          <p className="text-xs text-gray-600 mt-1">جهة</p>
        </div>
      </div>

      {/* Comparison Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-bold mb-4">📜 ISO 27001</h3>
          <Bar data={iso27001Data} options={{ indexAxis: 'y' }} />
          <div className="mt-4 text-sm space-y-1">
            <p>✅ كلي: {stats.iso27001.full} جهة</p>
            <p>⚠️ جزئي: {stats.iso27001.partial} جهة</p>
            <p>❌ غير ممتثل: {stats.iso27001.none} جهة</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-bold mb-4">🛡️ NIST Framework</h3>
          <Bar data={nistData} options={{ indexAxis: 'y' }} />
          <div className="mt-4 text-sm space-y-1">
            <p>✅ كلي: {stats.nist.full} جهة</p>
            <p>⚠️ جزئي: {stats.nist.partial} جهة</p>
            <p>❌ غير ممتثل: {stats.nist.none} جهة</p>
          </div>
        </div>
      </div>

      {/* Non-Compliant Entities */}
      {stats.entities_without_compliance.length > 0 && (
        <div className="bg-red-50 border-r-4 border-red-500 p-4 rounded">
          <h4 className="font-bold text-red-800 mb-2">
            ⚠️ جهات بدون أي معيار امتثال ({stats.no_compliance}):
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {stats.entities_without_compliance.map((entity, index) => (
              <div key={index} className="text-sm text-red-700">
                • {entity}
              </div>
            ))}
          </div>
          <p className="text-sm text-red-600 font-semibold mt-3">
            💡 توصية: إلزام جميع الجهات بالحصول على شهادة ISO 27001 خلال 12 شهراً
          </p>
        </div>
      )}
    </div>
  );
}

// Digital Transformation Tab
export function DigitalTab({ stats }) {
  const digitalData = {
    labels: ['تحول كامل', 'معظمها رقمي', 'مختلط', 'معظمها ورقي', 'ورقي جداً'],
    datasets: [
      {
        data: [
          stats.fully_digital,
          stats.mostly_digital,
          stats.mixed,
          stats.mostly_paper,
          stats.mostly_paper_low,
        ],
        backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#991b1b'],
      },
    ],
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <p className="text-sm text-green-600 font-semibold">متوسط النضج الرقمي</p>
          <p className="text-3xl font-bold text-green-700 mt-2">
            {stats.average_digital_score.toFixed(1)}%
          </p>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-600 font-semibold">جهات متقدمة رقمياً</p>
          <p className="text-3xl font-bold text-blue-700 mt-2">
            {stats.fully_digital + stats.mostly_digital}
          </p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <p className="text-sm text-red-600 font-semibold">فجوة رقمية (&lt;50%)</p>
          <p className="text-3xl font-bold text-red-700 mt-2">
            {stats.digital_gap}
          </p>
        </div>
      </div>

      {/* Distribution Chart */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-bold mb-4">🚀 توزيع مستوى التحول الرقمي</h3>
          <Pie data={digitalData} />
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-bold mb-4">📊 إحصائيات التحول</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-2 bg-green-50 rounded">
              <span>تحول رقمي كامل (100%)</span>
              <span className="font-bold text-green-600">{stats.fully_digital}</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
              <span>معظم العمليات رقمية (75-99%)</span>
              <span className="font-bold text-blue-600">{stats.mostly_digital}</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-yellow-50 rounded">
              <span>مختلط (50-74%)</span>
              <span className="font-bold text-yellow-600">{stats.mixed}</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-orange-50 rounded">
              <span>معظمها ورقية (25-49%)</span>
              <span className="font-bold text-orange-600">{stats.mostly_paper}</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-red-50 rounded">
              <span>ورقية جداً (&lt;25%)</span>
              <span className="font-bold text-red-600">{stats.mostly_paper_low}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Leaders and Laggards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {stats.leaders.length > 0 && (
          <div className="bg-green-50 border-r-4 border-green-500 p-4 rounded">
            <h4 className="font-bold text-green-800 mb-2">🏆 رواد التحول الرقمي (≥75%):</h4>
            <ul className="text-sm text-green-700 space-y-1">
              {stats.leaders.map((entity, index) => (
                <li key={index}>✅ {entity}</li>
              ))}
            </ul>
          </div>
        )}

        {stats.laggards.length > 0 && (
          <div className="bg-red-50 border-r-4 border-red-500 p-4 rounded">
            <h4 className="font-bold text-red-800 mb-2">⚠️ جهات تحتاج دعم عاجل (&lt;25%):</h4>
            <ul className="text-sm text-red-700 space-y-1">
              {stats.laggards.map((entity, index) => (
                <li key={index}>❌ {entity}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// Critical Gaps Tab
export function GapsTab({ stats }) {
  const gapsData = {
    labels: ['SOC', 'NOC', 'خطة التعافي', 'MFA', 'النسخ الاحتياطي', 'Firewall', 'التدريب'],
    datasets: [
      {
        label: 'نسبة الجهات التي تفتقر للأداة',
        data: [
          stats.soc.percentage,
          stats.noc.percentage,
          stats.disaster_recovery.percentage,
          stats.mfa.percentage,
          stats.backup.percentage,
          stats.firewall.percentage,
          stats.training.percentage,
        ],
        backgroundColor: '#ef4444',
      },
    ],
  };

  return (
    <div className="space-y-6">
      {/* Critical Alert */}
      {stats.critical_entities.length > 0 && (
        <div className="bg-red-100 border-2 border-red-500 p-6 rounded-lg">
          <h3 className="text-xl font-bold text-red-800 mb-3">
            🚨 تنبيه حرج: {stats.critical_entities.length} جهة تفتقر لـ 3+ متطلبات أساسية
          </h3>
          <div className="space-y-3">
            {stats.critical_entities.map((entity, index) => (
              <div key={index} className="bg-white p-3 rounded border border-red-300">
                <p className="font-bold text-red-700">{entity.name}</p>
                <p className="text-sm text-gray-600 mt-1">
                  الثغرات: {entity.gaps.map(g => g.replace('no_', '')).join(', ')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gaps Chart */}
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-bold mb-4">📊 تحليل الثغرات الحرجة</h3>
        <Bar 
          data={gapsData} 
          options={{
            scales: {
              y: {
                beginAtZero: true,
                max: 100,
                ticks: {
                  callback: (value) => value + '%'
                }
              }
            }
          }} 
        />
      </div>

      {/* Detailed Gaps */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <GapCard title="SOC - مركز العمليات الأمنية" stat={stats.soc} />
        <GapCard title="NOC - مركز عمليات الشبكة" stat={stats.noc} />
        <GapCard title="خطة التعافي من الكوارث" stat={stats.disaster_recovery} />
        <GapCard title="MFA - المصادقة متعددة العوامل" stat={{ missing: stats.mfa.missing, percentage: stats.mfa.percentage }} />
        <GapCard title="النسخ الاحتياطي" stat={{ missing: stats.backup.missing, percentage: stats.backup.percentage }} />
        <GapCard title="Firewall - جدار الحماية" stat={{ missing: stats.firewall.missing, percentage: stats.firewall.percentage }} />
        <GapCard title="برامج التدريب الأمني" stat={{ missing: stats.training.missing, percentage: stats.training.percentage }} />
      </div>
    </div>
  );
}

function GapCard({ title, stat }) {
  return (
    <div className="bg-red-50 p-4 rounded-lg border border-red-200">
      <h4 className="font-bold text-red-800 mb-2">{title}</h4>
      <div className="flex justify-between items-center">
        <span className="text-2xl font-bold text-red-600">{stat.missing}</span>
        <span className="text-sm text-gray-600">جهة ({stat.percentage.toFixed(1)}%)</span>
      </div>
      {stat.entities && stat.entities.length > 0 && stat.entities.length <= 5 && (
        <div className="mt-2 text-xs text-red-700">
          {stat.entities.map((e, i) => (
            <div key={i}>• {e}</div>
          ))}
        </div>
      )}
    </div>
  );
}

// Infrastructure Tab
export function InfrastructureTab({ stats }) {
  const managementData = {
    labels: ['داخلية', 'طرف ثالث', 'مشتركة'],
    datasets: [
      {
        data: [stats.management.internal, stats.management.third_party, stats.management.hybrid],
        backgroundColor: ['#3b82f6', '#f59e0b', '#8b5cf6'],
      },
    ],
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-600 font-semibold">مراكز البيانات</p>
          <p className="text-3xl font-bold text-blue-700 mt-2">{stats.total_data_centers}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <p className="text-sm text-green-600 font-semibold">الخوادم الفيزيائية</p>
          <p className="text-3xl font-bold text-green-700 mt-2">{stats.total_physical_servers}</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <p className="text-sm text-purple-600 font-semibold">الخوادم الافتراضية</p>
          <p className="text-3xl font-bold text-purple-700 mt-2">{stats.total_virtual_servers}</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <p className="text-sm text-yellow-600 font-semibold">سعة التخزين</p>
          <p className="text-2xl font-bold text-yellow-700 mt-2">
            {stats.total_storage_pb.toFixed(2)} PB
          </p>
          <p className="text-xs text-gray-600">{stats.total_storage_tb.toFixed(0)} TB</p>
        </div>
      </div>

      {/* Management & Virtualization */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-bold mb-4">🏢 إدارة البنية التحتية</h3>
          <Pie data={managementData} />
          <div className="mt-4 space-y-1 text-sm">
            <p>داخلية: {stats.management.internal} جهة</p>
            <p>طرف ثالث: {stats.management.third_party} جهة</p>
            <p>مشتركة: {stats.management.hybrid} جهة</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-bold mb-4">☁️ اعتماد المحاكاة الافتراضية</h3>
          <div className="flex items-center justify-center h-40">
            <div className="text-center">
              <div className="text-6xl font-bold text-blue-600">
                {stats.virtualization_adoption.toFixed(1)}%
              </div>
              <p className="text-gray-600 mt-2">نسبة الاعتماد</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Recommendations Tab
export function RecommendationsTab({ recommendations }) {
  const priorityColors = {
    critical: 'red',
    high: 'orange',
    medium: 'yellow',
    low: 'blue',
  };

  const priorityIcons = {
    critical: '🚨',
    high: '⚠️',
    medium: '💡',
    low: 'ℹ️',
  };

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 rounded-lg">
        <h2 className="text-2xl font-bold mb-2">💡 توصيات ذكية مبنية على التحليل</h2>
        <p>تم إنشاء {recommendations.length} توصية بناءً على تحليل البيانات الشامل</p>
      </div>

      {recommendations.length === 0 && (
        <div className="card text-center py-10">
          <p className="text-gray-600">✅ لا توجد توصيات حرجة حالياً</p>
        </div>
      )}

      {recommendations.map((rec, index) => (
        <div
          key={index}
          className={`bg-${priorityColors[rec.priority]}-50 border-r-4 border-${priorityColors[rec.priority]}-500 p-6 rounded-lg`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center mb-2">
                <span className="text-2xl ml-2">{priorityIcons[rec.priority]}</span>
                <h3 className="text-lg font-bold">{rec.title}</h3>
                <span className={`mr-3 px-3 py-1 rounded-full text-xs font-bold bg-${priorityColors[rec.priority]}-200 text-${priorityColors[rec.priority]}-800`}>
                  {rec.priority === 'critical' ? 'حرج' : rec.priority === 'high' ? 'عالي' : rec.priority === 'medium' ? 'متوسط' : 'منخفض'}
                </span>
              </div>
              <p className="text-gray-700 mb-3">{rec.description}</p>
              <div className="bg-white p-3 rounded border">
                <p className="font-semibold text-sm mb-1">🎯 الإجراء الموصى به:</p>
                <p className="text-sm">{rec.action}</p>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                📊 يؤثر على {rec.affected_entities} جهة
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
