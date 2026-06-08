import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { 
  Users, 
  Building2, 
  Wallet, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight,
  FileText,
  Clock
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { PlusCircle, CheckSquare, Receipt, UserPlus } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, trend, trendValue, isCurrency = false }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-slate-800">
          {isCurrency ? `₹${value.toLocaleString('en-IN')}` : value}
        </h3>
      </div>
      <div className="p-3 bg-slate-50 rounded-lg">
        <Icon className="w-5 h-5 text-teal-600" />
      </div>
    </div>
    {trend && (
      <div className="mt-4 flex items-center text-sm">
        {trend === 'up' ? (
          <ArrowUpRight className="w-4 h-4 text-emerald-500 mr-1" />
        ) : (
          <ArrowDownRight className="w-4 h-4 text-red-500 mr-1" />
        )}
        <span className={trend === 'up' ? 'text-emerald-600 font-medium' : 'text-red-600 font-medium'}>
          {trendValue}
        </span>
        <span className="text-slate-400 ml-2">vs last month</span>
      </div>
    )}
  </div>
);

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await api.get('/dashboard');
        setData(response.data);
      } catch (error) {
        console.error('Failed to fetch dashboard data', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  if (!data) return <div>Failed to load dashboard</div>;

  const { kpis, revenue_trend, recent_invoices, expense_by_category } = data;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
          <p className="text-slate-500 text-sm mt-1">Welcome back, {user?.full_name}. Here's what's happening today.</p>
        </div>
        <div className="text-sm font-medium text-slate-500 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm flex items-center gap-2">
          <Clock className="w-4 h-4" />
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Revenue (This Month)" 
          value={kpis.revenue.billed} 
          icon={Wallet} 
          isCurrency={true}
          trend="up"
          trendValue="12.5%"
        />
        <StatCard 
          title="Pending Collections" 
          value={kpis.revenue.outstanding} 
          icon={TrendingUp} 
          isCurrency={true}
        />
        <StatCard 
          title="Active Clients" 
          value={kpis.clients.active} 
          icon={Building2} 
        />
        <StatCard 
          title="Active Watchmen" 
          value={kpis.employees.active} 
          icon={Users} 
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link to="/invoices" className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-teal-50 hover:border-teal-100 hover:text-teal-700 transition-colors group">
            <PlusCircle className="w-6 h-6 text-slate-400 group-hover:text-teal-600 mb-2" />
            <span className="text-sm font-medium">Create Invoice</span>
          </Link>
          <Link to="/attendance" className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-teal-50 hover:border-teal-100 hover:text-teal-700 transition-colors group">
            <CheckSquare className="w-6 h-6 text-slate-400 group-hover:text-teal-600 mb-2" />
            <span className="text-sm font-medium">Mark Attendance</span>
          </Link>
          <Link to="/employees" className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-teal-50 hover:border-teal-100 hover:text-teal-700 transition-colors group">
            <UserPlus className="w-6 h-6 text-slate-400 group-hover:text-teal-600 mb-2" />
            <span className="text-sm font-medium">Add Watchman</span>
          </Link>
          <Link to="/expenses" className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-teal-50 hover:border-teal-100 hover:text-teal-700 transition-colors group">
            <Receipt className="w-6 h-6 text-slate-400 group-hover:text-teal-600 mb-2" />
            <span className="text-sm font-medium">Record Expense</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">Revenue Trend (Last 6 Months)</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenue_trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorBilled" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(val) => `₹${val/1000}k`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value) => [`₹${value.toLocaleString()}`, 'Billed']}
                />
                <Area type="monotone" dataKey="billed" stroke="#14b8a6" strokeWidth={3} fillOpacity={1} fill="url(#colorBilled)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expenses Donut/Bar Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">Expenses by Category</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={expense_by_category} layout="vertical" margin={{ top: 0, right: 0, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" hide />
                <YAxis dataKey="category" type="category" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 12}} width={100} />
                <Tooltip 
                  cursor={{fill: '#f1f5f9'}}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value) => [`₹${value.toLocaleString()}`, 'Amount']}
                />
                <Bar dataKey="total" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Invoices Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
          <h3 className="text-lg font-semibold text-slate-800">Recent Invoices</h3>
          <button className="text-sm font-medium text-teal-600 hover:text-teal-700">View All</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-semibold">Invoice #</th>
                <th className="px-6 py-4 font-semibold">Client</th>
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold">Amount</th>
                <th className="px-6 py-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {recent_invoices.map((inv) => (
                <tr key={inv.invoice_number} className="bg-white border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400" />
                    {inv.invoice_number}
                  </td>
                  <td className="px-6 py-4 text-slate-600">{inv.client_name}</td>
                  <td className="px-6 py-4 text-slate-600">{format(new Date(inv.invoice_date), 'MMM dd, yyyy')}</td>
                  <td className="px-6 py-4 font-medium text-slate-900">₹{parseFloat(inv.final_amount).toLocaleString('en-IN')}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize
                      ${inv.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 
                        inv.status === 'overdue' ? 'bg-red-100 text-red-700' : 
                        inv.status === 'sent' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>
                      {inv.status.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
              {recent_invoices.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-slate-500">No recent invoices found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
