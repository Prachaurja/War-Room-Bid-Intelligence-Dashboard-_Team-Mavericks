import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Download, Calendar, TrendingUp, TrendingDown, FileText } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { motion } from "motion/react";

const reportSummaries = [
  {
    title: "Monthly Sales Report",
    period: "November 2026",
    status: "completed",
    generated: "2 hours ago",
    size: "2.4 MB",
  },
  {
    title: "Quarterly Performance",
    period: "Q4 2026",
    status: "processing",
    generated: "In progress",
    size: "-",
  },
  {
    title: "Customer Insights",
    period: "October 2026",
    status: "completed",
    generated: "1 day ago",
    size: "1.8 MB",
  },
  {
    title: "Revenue Analysis",
    period: "November 2026",
    status: "completed",
    generated: "3 days ago",
    size: "3.2 MB",
  },
];

const topProducts = [
  { name: "Premium Headphones", sales: 1245, revenue: 124500, change: 12.5, trend: "up" },
  { name: "Wireless Mouse", sales: 2156, revenue: 86240, change: 8.3, trend: "up" },
  { name: "Laptop Stand", sales: 892, revenue: 71360, change: -2.1, trend: "down" },
  { name: "USB-C Hub", sales: 1567, revenue: 62680, change: 15.7, trend: "up" },
  { name: "Monitor 27\"", sales: 432, revenue: 172800, change: 5.4, trend: "up" },
];

const regionalPerformance = [
  { region: "North America", revenue: 245000, orders: 3456, growth: 12.3 },
  { region: "Europe", revenue: 198000, orders: 2890, growth: 8.7 },
  { region: "Asia Pacific", revenue: 167000, orders: 4120, growth: 18.5 },
  { region: "Latin America", revenue: 89000, orders: 1234, growth: 6.2 },
  { region: "Middle East", revenue: 93000, orders: 890, growth: 14.8 },
];

export default function Reports() {
  const exportToPDF = () => {
    alert("PDF export functionality would be implemented here");
  };

  const exportReportData = () => {
    const headers = ["Product", "Sales", "Revenue", "Change"];
    const rows = topProducts.map(p => [
      p.name,
      p.sales,
      p.revenue,
      p.change
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${new Date().toISOString().split("T")[0]}.csv`;
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
          <h1 className="text-3xl">Reports</h1>
          <p className="text-slate-600 mt-1">Generate and view detailed business reports</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportReportData}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={exportToPDF} className="bg-gradient-to-r from-blue-600 to-purple-600">
            <FileText className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </motion.div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Total Reports", value: "247", detail: "Generated this year" },
          { label: "Downloads", value: "1,854", detail: "Last 30 days" },
          { label: "Storage Used", value: "47.2 GB", detail: "156 GB available" },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="p-4 border-0 shadow-lg hover:shadow-xl transition-shadow">
              <p className="text-sm text-slate-600">{stat.label}</p>
              <p className="text-3xl mt-2">{stat.value}</p>
              <p className="text-sm text-slate-500 mt-1">{stat.detail}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Recent Reports */}
      <Card className="p-6">
        <h3 className="text-lg mb-4">Recent Reports</h3>
        <div className="space-y-4">
          {reportSummaries.map((report, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h4>{report.title}</h4>
                  <Badge
                    variant={report.status === "completed" ? "default" : "secondary"}
                  >
                    {report.status}
                  </Badge>
                </div>
                <p className="text-sm text-slate-500 mt-1">{report.period}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm text-slate-600">{report.generated}</p>
                  <p className="text-xs text-slate-500">{report.size}</p>
                </div>
                {report.status === "completed" && (
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Top Products */}
      <Card className="p-6">
        <h3 className="text-lg mb-4">Top Products</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead className="text-right">Sales</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="text-right">Change</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {topProducts.map((product, index) => (
              <TableRow key={index}>
                <TableCell>{product.name}</TableCell>
                <TableCell className="text-right">{product.sales.toLocaleString()}</TableCell>
                <TableCell className="text-right">
                  ${product.revenue.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {product.trend === "up" ? (
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-600" />
                    )}
                    <span
                      className={
                        product.trend === "up" ? "text-green-600" : "text-red-600"
                      }
                    >
                      {product.change}%
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Regional Performance */}
      <Card className="p-6">
        <h3 className="text-lg mb-4">Regional Performance</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Region</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="text-right">Orders</TableHead>
              <TableHead className="text-right">Growth</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {regionalPerformance.map((region, index) => (
              <TableRow key={index}>
                <TableCell>{region.region}</TableCell>
                <TableCell className="text-right">
                  ${region.revenue.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">{region.orders.toLocaleString()}</TableCell>
                <TableCell className="text-right">
                  <span className="text-green-600">+{region.growth}%</span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}