import { useState } from "react";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Search,
  Filter,
  Download,
  Clock,
  DollarSign,
  MapPin,
  Building2,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { motion } from "motion/react";

interface Tender {
  id: string;
  title: string;
  organization: string;
  sector: string;
  state: string;
  value: number;
  publishDate: string;
  closeDate: string;
  status: "active" | "upcoming" | "closed";
  description: string;
}

const mockTenders: Tender[] = [
  {
    id: "TND-2024-001",
    title: "Cloud Infrastructure Modernization",
    organization: "Department of Technology",
    sector: "IT Services",
    state: "New South Wales",
    value: 2500000,
    publishDate: "2024-03-15",
    closeDate: "2024-04-15",
    status: "active",
    description: "Modernize existing cloud infrastructure with enhanced security features.",
  },
  {
    id: "TND-2024-002",
    title: "Healthcare Management System",
    organization: "Health Department",
    sector: "Healthcare",
    state: "Victoria",
    value: 4200000,
    publishDate: "2024-03-18",
    closeDate: "2024-04-20",
    status: "active",
    description: "Implementation of comprehensive healthcare management software.",
  },
  {
    id: "TND-2024-003",
    title: "Public Transport Analytics Platform",
    organization: "Transport Authority",
    sector: "Transportation",
    state: "Queensland",
    value: 1800000,
    publishDate: "2024-03-20",
    closeDate: "2024-04-25",
    status: "active",
    description: "Real-time analytics for public transportation optimization.",
  },
  {
    id: "TND-2024-004",
    title: "Smart City IoT Network",
    organization: "City Council",
    sector: "Smart City",
    state: "South Australia",
    value: 3500000,
    publishDate: "2024-04-01",
    closeDate: "2024-05-10",
    status: "upcoming",
    description: "Deploy IoT sensors across the city for smart infrastructure management.",
  },
  {
    id: "TND-2024-005",
    title: "Education Portal Development",
    organization: "Education Department",
    sector: "Education",
    state: "Western Australia",
    value: 950000,
    publishDate: "2024-04-05",
    closeDate: "2024-05-15",
    status: "upcoming",
    description: "Online learning platform for K-12 education.",
  },
  {
    id: "TND-2024-006",
    title: "Cybersecurity Framework Implementation",
    organization: "Defense Department",
    sector: "Cybersecurity",
    state: "Australian Capital Territory",
    value: 5200000,
    publishDate: "2024-02-10",
    closeDate: "2024-03-10",
    status: "closed",
    description: "Enhanced cybersecurity measures for government networks.",
  },
  {
    id: "TND-2024-007",
    title: "Environmental Monitoring System",
    organization: "Environment Agency",
    sector: "Environment",
    state: "Tasmania",
    value: 1200000,
    publishDate: "2024-02-15",
    closeDate: "2024-03-15",
    status: "closed",
    description: "Real-time environmental monitoring and reporting system.",
  },
  {
    id: "TND-2024-008",
    title: "Financial Management Suite",
    organization: "Treasury Department",
    sector: "Finance",
    state: "New South Wales",
    value: 3800000,
    publishDate: "2024-03-22",
    closeDate: "2024-04-22",
    status: "active",
    description: "Comprehensive financial management and reporting platform.",
  },
];

const sectors = ["All Sectors", "IT Services", "Healthcare", "Transportation", "Smart City", "Education", "Cybersecurity", "Environment", "Finance"];
const states = ["All States", "New South Wales", "Victoria", "Queensland", "South Australia", "Western Australia", "Australian Capital Territory", "Tasmania"];

export default function Tenders() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSector, setSelectedSector] = useState("All Sectors");
  const [selectedState, setSelectedState] = useState("All States");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [activeTab, setActiveTab] = useState("active");

  const filteredTenders = mockTenders.filter((tender) => {
    const matchesSearch =
      tender.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tender.organization.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tender.id.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSector = selectedSector === "All Sectors" || tender.sector === selectedSector;
    const matchesState = selectedState === "All States" || tender.state === selectedState;
    const matchesStatus = tender.status === activeTab;

    return matchesSearch && matchesSector && matchesState && matchesStatus;
  });

  const exportToCSV = () => {
    const headers = ["ID", "Title", "Organization", "Sector", "State", "Value", "Close Date", "Status"];
    const rows = filteredTenders.map(t => [
      t.id,
      t.title,
      t.organization,
      t.sector,
      t.state,
      t.value,
      t.closeDate,
      t.status
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tenders-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <AlertCircle className="w-4 h-4" />;
      case "upcoming":
        return <Clock className="w-4 h-4" />;
      case "closed":
        return <CheckCircle2 className="w-4 h-4" />;
      default:
        return <XCircle className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-700 border-green-200";
      case "upcoming":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "closed":
        return "bg-slate-100 text-slate-700 border-slate-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const statsData = [
    {
      label: "Active Bids",
      value: mockTenders.filter(t => t.status === "active").length,
      icon: AlertCircle,
      color: "from-green-500 to-emerald-600",
      change: "+12%",
    },
    {
      label: "Upcoming Bids",
      value: mockTenders.filter(t => t.status === "upcoming").length,
      icon: Clock,
      color: "from-blue-500 to-cyan-600",
      change: "+8%",
    },
    {
      label: "Recently Closed",
      value: mockTenders.filter(t => t.status === "closed").length,
      icon: CheckCircle2,
      color: "from-purple-500 to-pink-600",
      change: "15 this month",
    },
    {
      label: "Total Value",
      value: `$${(mockTenders.reduce((sum, t) => sum + t.value, 0) / 1000000).toFixed(1)}M`,
      icon: DollarSign,
      color: "from-orange-500 to-red-600",
      change: "+23%",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl">Tender Management</h1>
          <p className="text-slate-600 mt-1">Track and manage government tenders</p>
        </div>
        <Button
          onClick={exportToCSV}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          <Download className="w-4 h-4 mr-2" />
          Export to CSV
        </Button>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsData.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="h-full"
          >
            <Card className="h-full min-h-[150px] p-6 border-0 shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">{stat.label}</p>
                  <p className="text-3xl mt-2">{stat.value}</p>
                  <p className="text-sm text-slate-500 mt-2">{stat.change}</p>
                </div>
                <div className={`p-4 rounded-2xl bg-gradient-to-br ${stat.color} shadow-lg`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <Card className="p-6 border-0 shadow-lg">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-slate-600" />
          <h3 className="text-lg">Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search tenders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedSector} onValueChange={setSelectedSector}>
            <SelectTrigger>
              <SelectValue placeholder="Select sector" />
            </SelectTrigger>
            <SelectContent>
              {sectors.map((sector) => (
                <SelectItem key={sector} value={sector}>
                  {sector}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedState} onValueChange={setSelectedState}>
            <SelectTrigger>
              <SelectValue placeholder="Select state" />
            </SelectTrigger>
            <SelectContent>
              {states.map((state) => (
                <SelectItem key={state} value={state}>
                  {state}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={() => {
              setSearchQuery("");
              setSelectedSector("All Sectors");
              setSelectedState("All States");
              setDateFrom("");
              setDateTo("");
            }}
          >
            Clear Filters
          </Button>
        </div>
      </Card>

      {/* Tenders List */}
      <Card className="p-6 border-0 shadow-lg">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="active" className="gap-2">
              <AlertCircle className="w-4 h-4" />
              Active Bids
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="gap-2">
              <Clock className="w-4 h-4" />
              Upcoming
            </TabsTrigger>
            <TabsTrigger value="closed" className="gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Closed
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4">
            {filteredTenders.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <XCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No tenders found matching your criteria</p>
              </div>
            ) : (
              filteredTenders.map((tender, index) => (
                <motion.div
                  key={tender.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-6 border border-slate-200 rounded-xl hover:shadow-lg transition-all hover:border-blue-300"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="text-lg">{tender.title}</h4>
                            <Badge className={`${getStatusColor(tender.status)} border`}>
                              <span className="flex items-center gap-1">
                                {getStatusIcon(tender.status)}
                                {tender.status}
                              </span>
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-600 mb-3">{tender.description}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center gap-2 text-slate-600">
                          <Building2 className="w-4 h-4" />
                          <span>{tender.organization}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600">
                          <MapPin className="w-4 h-4" />
                          <span>{tender.state}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600">
                          <DollarSign className="w-4 h-4" />
                          <span>${(tender.value / 1000000).toFixed(2)}M</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600">
                          <Calendar className="w-4 h-4" />
                          <span>Close: {new Date(tender.closeDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                      <Button size="sm" className="bg-gradient-to-r from-blue-600 to-purple-600">
                        Submit Bid
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
