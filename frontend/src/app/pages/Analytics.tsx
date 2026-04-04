import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from "recharts";
import { Card } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Button } from "../components/ui/button";
import { Download, Filter } from "lucide-react";
import { motion } from "motion/react";

const performanceData = [
  { date: "2024-01-01", visitors: 2400, pageviews: 4800, bounceRate: 45, avgSession: 180 },
  { date: "2024-02-01", visitors: 2800, pageviews: 5200, bounceRate: 42, avgSession: 195 },
  { date: "2024-03-01", visitors: 3200, pageviews: 6100, bounceRate: 40, avgSession: 210 },
  { date: "2024-04-01", visitors: 3600, pageviews: 7200, bounceRate: 38, avgSession: 225 },
  { date: "2024-05-01", visitors: 3800, pageviews: 7800, bounceRate: 36, avgSession: 240 },
  { date: "2024-06-01", visitors: 4200, pageviews: 8900, bounceRate: 35, avgSession: 255 },
  { date: "2024-07-01", visitors: 4500, pageviews: 9400, bounceRate: 33, avgSession: 270 },
  { date: "2024-08-01", visitors: 4800, pageviews: 10200, bounceRate: 31, avgSession: 285 },
  { date: "2024-09-01", visitors: 5200, pageviews: 11100, bounceRate: 30, avgSession: 300 },
  { date: "2024-10-01", visitors: 5600, pageviews: 12000, bounceRate: 28, avgSession: 315 },
  { date: "2024-11-01", visitors: 6000, pageviews: 13200, bounceRate: 27, avgSession: 330 },
  { date: "2024-12-01", visitors: 6500, pageviews: 14500, bounceRate: 25, avgSession: 345 },
];

const trafficSourceData = [
  { source: "Organic Search", sessions: 12450, conversion: 3.2, revenue: 156000 },
  { source: "Direct", sessions: 8900, conversion: 4.1, revenue: 145000 },
  { source: "Social Media", sessions: 6700, conversion: 2.8, revenue: 89000 },
  { source: "Referral", sessions: 4200, conversion: 3.5, revenue: 67000 },
  { source: "Email", sessions: 3800, conversion: 5.2, revenue: 98000 },
  { source: "Paid Ads", sessions: 5600, conversion: 2.9, revenue: 78000 },
];

const deviceData = [
  { month: "Jan", desktop: 4200, mobile: 3800, tablet: 1200 },
  { month: "Feb", desktop: 4500, mobile: 4200, tablet: 1400 },
  { month: "Mar", desktop: 4800, mobile: 4600, tablet: 1500 },
  { month: "Apr", desktop: 5100, mobile: 5100, tablet: 1700 },
  { month: "May", desktop: 5400, mobile: 5600, tablet: 1800 },
  { month: "Jun", desktop: 5700, mobile: 6200, tablet: 2000 },
];

const conversionFunnelData = [
  { stage: "Visits", count: 10000, rate: 100 },
  { stage: "Product View", count: 6500, rate: 65 },
  { stage: "Add to Cart", count: 3200, rate: 32 },
  { stage: "Checkout", count: 1800, rate: 18 },
  { stage: "Purchase", count: 950, rate: 9.5 },
];

export default function Analytics() {
  const exportToCSV = () => {
    const headers = ["Date", "Visitors", "Page Views", "Bounce Rate", "Avg Session"];
    const rows = performanceData.map(d => [
      d.date,
      d.visitors,
      d.pageviews,
      d.bounceRate,
      d.avgSession
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
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
          <h1 className="text-3xl">Analytics</h1>
          <p className="text-slate-600 mt-1">Deep dive into your business metrics</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
          <Button
            size="sm"
            onClick={exportToCSV}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </motion.div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Visitors", value: "54.2K", change: "+12.5%" },
          { label: "Page Views", value: "108.7K", change: "+8.3%" },
          { label: "Avg. Session", value: "4m 45s", change: "+15.2%" },
          { label: "Bounce Rate", value: "28.4%", change: "-5.1%" },
        ].map((metric, index) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="p-4 border-0 shadow-lg hover:shadow-xl transition-shadow">
              <p className="text-sm text-slate-600">{metric.label}</p>
              <p className="text-2xl mt-1">{metric.value}</p>
              <p className="text-sm text-green-600 mt-1">{metric.change}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Performance Chart */}
      <Card className="p-6 border-0 shadow-lg">
        <h3 className="text-lg mb-4">Performance Overview</h3>
        <Tabs defaultValue="visitors" className="w-full">
          <TabsList>
            <TabsTrigger value="visitors">Visitors</TabsTrigger>
            <TabsTrigger value="pageviews">Page Views</TabsTrigger>
            <TabsTrigger value="bounce">Bounce Rate</TabsTrigger>
            <TabsTrigger value="session">Avg. Session</TabsTrigger>
          </TabsList>
          <TabsContent value="visitors" className="mt-4">
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="visitors"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </TabsContent>
          <TabsContent value="pageviews" className="mt-4">
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="pageviews"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </TabsContent>
          <TabsContent value="bounce" className="mt-4">
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="bounceRate"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ fill: "#ef4444", r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>
          <TabsContent value="session" className="mt-4">
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="avgSession"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={{ fill: "#8b5cf6", r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Traffic Sources */}
        <Card className="p-6">
          <h3 className="text-lg mb-4">Traffic Sources</h3>
          <div className="space-y-4">
            {trafficSourceData.map((source, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>{source.source}</span>
                  <span>{source.sessions.toLocaleString()} sessions</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${(source.sessions / 12450) * 100}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Conversion: {source.conversion}%</span>
                  <span>Revenue: ${(source.revenue / 1000).toFixed(0)}K</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Device Breakdown */}
        <Card className="p-6">
          <h3 className="text-lg mb-4">Device Breakdown</h3>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={deviceData}>
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
              <Bar dataKey="desktop" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              <Bar dataKey="mobile" fill="#10b981" radius={[8, 8, 0, 0]} />
              <Bar dataKey="tablet" fill="#f59e0b" radius={[8, 8, 0, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Conversion Funnel */}
      <Card className="p-6">
        <h3 className="text-lg mb-4">Conversion Funnel</h3>
        <div className="space-y-3">
          {conversionFunnelData.map((stage, index) => (
            <div key={index} className="relative">
              <div className="flex items-center justify-between mb-2">
                <span>{stage.stage}</span>
                <div className="flex items-center gap-3">
                  <span className="text-slate-600">{stage.count.toLocaleString()}</span>
                  <span className="text-sm text-slate-500">{stage.rate}%</span>
                </div>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-8 flex items-center">
                <div
                  className="bg-gradient-to-r from-blue-600 to-purple-600 h-8 rounded-full flex items-center justify-end px-4 text-white text-sm transition-all"
                  style={{ width: `${stage.rate * 10}%` }}
                >
                  {index < conversionFunnelData.length - 1 && (
                    <span className="text-xs">
                      {(
                        ((conversionFunnelData[index + 1].count / stage.count) * 100)
                      ).toFixed(1)}
                      % →
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}