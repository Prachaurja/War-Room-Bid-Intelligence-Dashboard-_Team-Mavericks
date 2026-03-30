import { DollarSign, Users, ShoppingCart, TrendingUp, FileText } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from "recharts";
import { Card } from "../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { useState } from "react";
import { motion } from "motion/react";
import { Button } from "../components/ui/button";

const revenueData = [
  { month: "Jan", revenue: 45000, profit: 28000, expenses: 17000 },
  { month: "Feb", revenue: 52000, profit: 32000, expenses: 20000 },
  { month: "Mar", revenue: 48000, profit: 29000, expenses: 19000 },
  { month: "Apr", revenue: 61000, profit: 38000, expenses: 23000 },
  { month: "May", revenue: 55000, profit: 34000, expenses: 21000 },
  { month: "Jun", revenue: 67000, profit: 42000, expenses: 25000 },
  { month: "Jul", revenue: 72000, profit: 45000, expenses: 27000 },
  { month: "Aug", revenue: 68000, profit: 43000, expenses: 25000 },
  { month: "Sep", revenue: 75000, profit: 48000, expenses: 27000 },
  { month: "Oct", revenue: 82000, profit: 53000, expenses: 29000 },
  { month: "Nov", revenue: 79000, profit: 51000, expenses: 28000 },
  { month: "Dec", revenue: 88000, profit: 57000, expenses: 31000 },
];

const categoryData = [
  { name: "Electronics", value: 35 },
  { name: "Clothing", value: 25 },
  { name: "Food", value: 20 },
  { name: "Books", value: 12 },
  { name: "Other", value: 8 },
];

const COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"];

const userGrowthData = [
  { month: "Jan", users: 1200 },
  { month: "Feb", users: 1450 },
  { month: "Mar", users: 1680 },
  { month: "Apr", users: 2100 },
  { month: "May", users: 2450 },
  { month: "Jun", users: 2900 },
  { month: "Jul", users: 3200 },
  { month: "Aug", users: 3600 },
  { month: "Sep", users: 4100 },
  { month: "Oct", users: 4500 },
  { month: "Nov", users: 5000 },
  { month: "Dec", users: 5500 },
];

const bidTrendData = [
  { month: "Jan", count: 45, value: 12500, avgValue: 278 },
  { month: "Feb", count: 52, value: 15200, avgValue: 292 },
  { month: "Mar", count: 48, value: 14100, avgValue: 294 },
  { month: "Apr", count: 61, value: 18300, avgValue: 300 },
  { month: "May", count: 58, value: 17800, avgValue: 307 },
  { month: "Jun", count: 65, value: 21200, avgValue: 326 },
];

const sectorTrendData = [
  { sector: "IT Services", count: 45, value: 28500 },
  { sector: "Healthcare", count: 32, value: 42000 },
  { sector: "Transportation", count: 28, value: 18900 },
  { sector: "Smart City", count: 24, value: 35000 },
  { sector: "Education", count: 18, value: 9500 },
  { sector: "Finance", count: 22, value: 38000 },
];

const regionalTrendData = [
  { region: "NSW", count: 78, value: 45200 },
  { region: "VIC", count: 62, value: 38900 },
  { region: "QLD", count: 45, value: 28700 },
  { region: "SA", count: 34, value: 21200 },
  { region: "WA", count: 28, value: 18500 },
  { region: "ACT", count: 25, value: 32400 },
];

export default function Overview() {
  const [timeRange, setTimeRange] = useState("12m");

  const exportToPDF = () => {
    // Mock PDF export
    alert("PDF export functionality would be implemented here");
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl">Overview</h1>
          <p className="text-slate-600 mt-1">Welcome back to your dashboard</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportToPDF}>
            <FileText className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="3m">Last 3 months</SelectItem>
              <SelectItem value="12m">Last 12 months</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            title: "Total Revenue",
            value: "$792K",
            change: 12.5,
            icon: DollarSign,
            iconColor: "bg-gradient-to-br from-blue-500 to-cyan-600",
          },
          {
            title: "Total Customers",
            value: "5,500",
            change: 8.2,
            icon: Users,
            iconColor: "bg-gradient-to-br from-purple-500 to-pink-600",
          },
          {
            title: "Total Orders",
            value: "8,234",
            change: -3.1,
            icon: ShoppingCart,
            iconColor: "bg-gradient-to-br from-orange-500 to-red-600",
          },
          {
            title: "Conversion Rate",
            value: "3.24%",
            change: 5.7,
            icon: TrendingUp,
            iconColor: "bg-gradient-to-br from-green-500 to-emerald-600",
          },
        ].map((kpi, index) => (
          <motion.div
            key={kpi.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <div className="bg-white rounded-xl border-0 shadow-lg p-6 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm text-slate-600">{kpi.title}</p>
                  <p className="text-3xl mt-2">{kpi.value}</p>
                  <div className="flex items-center gap-1 mt-3">
                    <span
                      className={`text-sm ${
                        kpi.change >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {kpi.change >= 0 ? "↑" : "↓"} {Math.abs(kpi.change)}%
                    </span>
                    <span className="text-sm text-slate-500">vs last month</span>
                  </div>
                </div>
                <div className={`${kpi.iconColor} p-4 rounded-2xl shadow-lg`}>
                  <kpi.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Bid Trends Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bid Count and Value Trends */}
        <Card className="p-6 border-0 shadow-lg">
          <h3 className="text-lg mb-4">Bid Count & Value Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={bidTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" stroke="#64748b" />
              <YAxis yAxisId="left" stroke="#64748b" />
              <YAxis yAxisId="right" orientation="right" stroke="#64748b" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} name="Bid Count" />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="value"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: "#10b981", r: 4 }}
                name="Value ($K)"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>

        {/* Sector Distribution */}
        <Card className="p-6 border-0 shadow-lg">
          <h3 className="text-lg mb-4">Bids by Sector</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={sectorTrendData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" stroke="#64748b" />
              <YAxis dataKey="sector" type="category" width={100} stroke="#64748b" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Bar dataKey="count" fill="#8b5cf6" radius={[0, 8, 8, 0]} name="Count" />
              <Bar dataKey="value" fill="#ec4899" radius={[0, 8, 8, 0]} name="Value ($K)" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Regional Trends */}
      <Card className="p-6 border-0 shadow-lg">
        <h3 className="text-lg mb-4">Regional Bid Distribution</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={regionalTrendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="region" stroke="#64748b" />
            <YAxis stroke="#64748b" />
            <Tooltip
              contentStyle={{
                backgroundColor: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
              }}
            />
            <Legend />
            <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} name="Bid Count" />
            <Bar dataKey="value" fill="#10b981" radius={[8, 8, 0, 0]} name="Value ($K)" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card className="p-6">
          <h3 className="text-lg mb-4">Revenue Overview</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="revenue"
                stackId="1"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.6}
              />
              <Area
                type="monotone"
                dataKey="profit"
                stackId="2"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.6}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Sales by Category */}
        <Card className="p-6">
          <h3 className="text-lg mb-4">Sales by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth */}
        <Card className="p-6">
          <h3 className="text-lg mb-4">User Growth</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={userGrowthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="users"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={{ fill: "#8b5cf6", r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Monthly Comparison */}
        <Card className="p-6">
          <h3 className="text-lg mb-4">Monthly Comparison</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueData.slice(-6)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Bar dataKey="revenue" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              <Bar dataKey="expenses" fill="#ef4444" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="p-6">
        <h3 className="text-lg mb-4">Recent Activity</h3>
        <div className="space-y-4">
          {[
            {
              action: "New order received",
              details: "Order #8234 - $1,250.00",
              time: "2 minutes ago",
              color: "bg-green-100 text-green-600",
            },
            {
              action: "Customer registered",
              details: "Sarah Johnson joined the platform",
              time: "15 minutes ago",
              color: "bg-blue-100 text-blue-600",
            },
            {
              action: "Payment processed",
              details: "Order #8233 - $890.00",
              time: "1 hour ago",
              color: "bg-purple-100 text-purple-600",
            },
            {
              action: "Report generated",
              details: "Monthly sales report - November 2026",
              time: "2 hours ago",
              color: "bg-orange-100 text-orange-600",
            },
          ].map((activity, index) => (
            <div key={index} className="flex items-center gap-4 pb-4 border-b last:border-b-0 last:pb-0">
              <div className={`w-10 h-10 rounded-full ${activity.color} flex items-center justify-center flex-shrink-0`}>
                <div className="w-2 h-2 bg-current rounded-full" />
              </div>
              <div className="flex-1">
                <p>{activity.action}</p>
                <p className="text-sm text-slate-500">{activity.details}</p>
              </div>
              <span className="text-sm text-slate-500">{activity.time}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}