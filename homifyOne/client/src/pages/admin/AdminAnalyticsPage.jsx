/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import api from '../../services/api';

const TEAL = '#1a4a45';
const PALETTE = ['#1a4a45', '#2d6b62', '#5a9c8f', '#9ccdc4', '#c9a24b', '#d97757', '#7a8bbf', '#b06a9b'];

const ORDER_STATUS_LABELS = {
  submitted: 'Awaiting Review',
  approved: 'Approved',
  rejected: 'Rejected',
};

const ORDER_STATUS_COLORS = {
  submitted: '#c9a24b',
  approved: '#2d6b62',
  rejected: '#d97757',
};

const monthLabel = (ym) => {
  if (!ym) return '';
  const [y, m] = ym.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
};

function StatCard({ label, value, sub, icon }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
        {icon && <span className="text-lg">{icon}</span>}
      </div>
      <p className="text-2xl font-extrabold text-gray-900 mt-2">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function SectionCard({ title, subtitle, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-bold text-gray-900">{title}</h3>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5 mb-3">{subtitle}</p>}
      {!subtitle && <div className="mb-3" />}
      {children}
    </div>
  );
}

const money = (n) => `£${Number(n || 0).toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;

export default function AdminAnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = () => {
    setLoading(true);
    setError('');
    api.get('/analytics/overview')
      .then((r) => setData(r.data.data))
      .catch(() => setError('Failed to load analytics data.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) return (
    <div className="min-h-screen bg-[#f8f8f6] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-[#1a4a45] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error || !data) return (
    <div className="min-h-screen bg-[#f8f8f6] p-6">
      <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2 max-w-md">
        {error || 'No data available.'}
      </p>
    </div>
  );

  const { plots, orders, products, suppliers, users } = data;

  return (
    <div>
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4 sticky top-0 z-10 flex items-center justify-between gap-3 flex-wrap">
        <div className='text-left'>
          <h1 className="text-xl font-bold text-gray-900">Analytics</h1>
          <p className="text-xs text-gray-400 mt-0.5">Platform-wide visibility into buyer progress, product trends, and supplier performance.</p>
        </div>
        <button
          onClick={fetchData}
          className="border border-gray-200 rounded-xl px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 whitespace-nowrap"
        >
          ↻ Refresh
        </button>
      </div>

      <div className="px-4 sm:px-6 py-6 max-w-full space-y-6">
        {/* KPI row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total Plots" value={plots.total} sub={`${plots.overdue} overdue`} icon="🏠" />
          <StatCard label="Approved Revenue" value={money(orders.totalRevenue)} sub={`Avg order ${money(orders.avgOrderValue)}`} icon="💷" />
          <StatCard label="Active Products" value={products.totalActive} icon="📦" />
          <StatCard label="Total Users" value={users.total} sub={`${users.questionnaireCompletionRate}% questionnaires done`} icon="👥" />
        </div>

        {/* Catalog composition & Orders by status */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SectionCard title="Product Catalog by Room" subtitle="Active products, split by which room they belong to">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={products.byRoom} dataKey="count" nameKey="room" cx="50%" cy="50%" outerRadius={85} label={({ room, count }) => `${room} (${count})`}>
                  {products.byRoom.map((entry, i) => (
                    <Cell key={entry.room} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </SectionCard>

          <SectionCard title="Orders by Status" subtitle="Every order ever submitted, by current status">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={orders.byStatus.map((d) => ({ ...d, label: ORDER_STATUS_LABELS[d.status] || d.status }))}
                margin={{ left: -20 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {orders.byStatus.map((entry) => (
                    <Cell key={entry.status} fill={ORDER_STATUS_COLORS[entry.status] || TEAL} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </SectionCard>
        </div>

        {/* Product trends */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SectionCard title="Top Chosen Product Categories" subtitle="From approved buyer orders">
            <ResponsiveContainer width="100%" height={Math.max(260, products.topChosenCategories.length * 42)}>
              <BarChart data={products.topChosenCategories} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eee" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="category" tick={{ fontSize: 11 }} width={110} interval={0} />
                <Tooltip />
                <Bar dataKey="timesChosen" fill="#2d6b62" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </SectionCard>

          <SectionCard title="Average Price by Category" subtitle="Active catalog products">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={products.avgPriceByCategory} margin={{ left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                <XAxis dataKey="category" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `£${v}`} />
                <Tooltip formatter={(v) => money(v)} />
                <Bar dataKey="avgPrice" fill="#9ccdc4" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </SectionCard>
        </div>

        {/* Supplier performance */}
        <SectionCard title="Supplier Performance" subtitle="Purchase order fulfillment and turnaround time by supplier">
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="bg-[#f0f8f7] rounded-xl px-4 py-3">
              <p className="text-xs text-gray-500">Overall fulfillment rate</p>
              <p className="text-lg font-bold text-[#1a4a45]">{suppliers.fulfillmentRate}%</p>
            </div>
            <div className="bg-[#f0f8f7] rounded-xl px-4 py-3">
              <p className="text-xs text-gray-500">Avg turnaround</p>
              <p className="text-lg font-bold text-[#1a4a45]">{suppliers.avgTurnaroundDays} days</p>
            </div>
            <div className="bg-[#f0f8f7] rounded-xl px-4 py-3">
              <p className="text-xs text-gray-500">Flagged invoices</p>
              <p className="text-lg font-bold text-[#1a4a45]">{suppliers.invoiceFlaggedRate}%</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-[#f0f8f7]">
                  <th className="text-left font-semibold text-gray-500 text-xs uppercase tracking-wide px-4 py-2.5">Supplier</th>
                  <th className="text-left font-semibold text-gray-500 text-xs uppercase tracking-wide px-4 py-2.5">Total POs</th>
                  <th className="text-left font-semibold text-gray-500 text-xs uppercase tracking-wide px-4 py-2.5">Fulfilled</th>
                  <th className="text-left font-semibold text-gray-500 text-xs uppercase tracking-wide px-4 py-2.5">Fulfillment Rate</th>
                  <th className="text-left font-semibold text-gray-500 text-xs uppercase tracking-wide px-4 py-2.5">Avg Turnaround</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.bySupplier.map((s) => (
                  <tr key={s.supplier} className="border-b border-gray-50 last:border-0">
                    <td className="text-left px-4 py-3 whitespace-nowrap font-medium text-gray-800">{s.supplier}</td>
                    <td className="text-left px-4 py-3 whitespace-nowrap text-gray-600">{s.total}</td>
                    <td className="text-left px-4 py-3 whitespace-nowrap text-gray-600">{s.fulfilled}</td>
                    <td className="text-left px-4 py-3 whitespace-nowrap text-gray-600">{s.fulfillmentRate}%</td>
                    <td className="text-left px-4 py-3 whitespace-nowrap text-gray-600">{s.avgTurnaroundDays ? `${s.avgTurnaroundDays} days` : '—'}</td>
                  </tr>
                ))}
                {suppliers.bySupplier.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400 text-sm">No purchase orders yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>

        {/* User growth & role mix */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SectionCard title="User Growth" subtitle="New accounts by month, last 6 months">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={users.growthByMonth.map((d) => ({ ...d, monthLabel: monthLabel(d.month) }))} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#d97757" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </SectionCard>

          <SectionCard title="User Role Mix" subtitle="All accounts on the platform">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={users.roleMix} dataKey="count" nameKey="role" cx="50%" cy="50%" outerRadius={80} label={({ role, count }) => `${role} (${count})`}>
                  {users.roleMix.map((entry, i) => (
                    <Cell key={entry.role} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
