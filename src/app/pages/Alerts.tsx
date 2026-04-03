import { useState } from "react";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Switch } from "../components/ui/switch";
import { Label } from "../components/ui/label";
import {
  Bell,
  Plus,
  Trash2,
  Search,
  Filter,
  Mail,
  MessageSquare,
  Settings,
  AlertCircle,
  CheckCircle2,
  Info,
  TrendingUp,
} from "lucide-react";
import { motion } from "motion/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

interface Alert {
  id: string;
  title: string;
  description: string;
  type: "tender" | "bid" | "system" | "report";
  priority: "high" | "medium" | "low";
  timestamp: string;
  read: boolean;
}

interface SavedSearch {
  id: string;
  name: string;
  criteria: {
    sector: string;
    state: string;
    minValue: number;
    maxValue: number;
  };
  notifications: boolean;
  lastMatched: string;
}

const mockAlerts: Alert[] = [
  {
    id: "ALT-001",
    title: "New Tender Matching Your Criteria",
    description: "Cloud Infrastructure Modernization tender from Department of Technology matches your saved search for IT Services in NSW.",
    type: "tender",
    priority: "high",
    timestamp: "2024-03-25T10:30:00",
    read: false,
  },
  {
    id: "ALT-002",
    title: "Bid Deadline Approaching",
    description: "Healthcare Management System bid closes in 48 hours. Review your submission before the deadline.",
    type: "bid",
    priority: "high",
    timestamp: "2024-03-25T09:15:00",
    read: false,
  },
  {
    id: "ALT-003",
    title: "Weekly Report Generated",
    description: "Your weekly tender activity report is now available for download.",
    type: "report",
    priority: "low",
    timestamp: "2024-03-25T08:00:00",
    read: true,
  },
  {
    id: "ALT-004",
    title: "System Maintenance Scheduled",
    description: "Scheduled maintenance will occur on March 28th from 2:00 AM to 4:00 AM AEST.",
    type: "system",
    priority: "medium",
    timestamp: "2024-03-24T16:00:00",
    read: true,
  },
  {
    id: "ALT-005",
    title: "New Tender in Smart City Sector",
    description: "Smart City IoT Network tender has been published. Value: $3.5M",
    type: "tender",
    priority: "high",
    timestamp: "2024-03-24T14:30:00",
    read: false,
  },
  {
    id: "ALT-006",
    title: "Bid Status Updated",
    description: "Your bid for Environmental Monitoring System has been shortlisted for review.",
    type: "bid",
    priority: "medium",
    timestamp: "2024-03-24T11:00:00",
    read: true,
  },
];

const mockSavedSearches: SavedSearch[] = [
  {
    id: "SS-001",
    name: "IT Services NSW",
    criteria: {
      sector: "IT Services",
      state: "New South Wales",
      minValue: 1000000,
      maxValue: 5000000,
    },
    notifications: true,
    lastMatched: "2 hours ago",
  },
  {
    id: "SS-002",
    name: "Healthcare Victoria",
    criteria: {
      sector: "Healthcare",
      state: "Victoria",
      minValue: 2000000,
      maxValue: 10000000,
    },
    notifications: true,
    lastMatched: "1 day ago",
  },
  {
    id: "SS-003",
    name: "Smart City All States",
    criteria: {
      sector: "Smart City",
      state: "All States",
      minValue: 500000,
      maxValue: 5000000,
    },
    notifications: false,
    lastMatched: "3 days ago",
  },
];

export default function Alerts() {
  const [alerts, setAlerts] = useState<Alert[]>(mockAlerts);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>(mockSavedSearches);
  const [filterType, setFilterType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredAlerts = alerts.filter((alert) => {
    const matchesType = filterType === "all" || alert.type === filterType;
    const matchesSearch =
      alert.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const unreadCount = alerts.filter((a) => !a.read).length;

  const markAsRead = (id: string) => {
    setAlerts(alerts.map((alert) => (alert.id === id ? { ...alert, read: true } : alert)));
  };

  const markAllAsRead = () => {
    setAlerts(alerts.map((alert) => ({ ...alert, read: true })));
  };

  const deleteAlert = (id: string) => {
    setAlerts(alerts.filter((alert) => alert.id !== id));
  };

  const toggleNotifications = (id: string) => {
    setSavedSearches(
      savedSearches.map((search) =>
        search.id === id ? { ...search, notifications: !search.notifications } : search
      )
    );
  };

  const createAlert = () => {
    const now = new Date();
    const id = `ALT-${String(alerts.length + 1).padStart(3, "0")}`;
    const newAlert: Alert = {
      id,
      title: "Manual Alert",
      description: "New alert created from dashboard.",
      type: "system",
      priority: "low",
      timestamp: now.toISOString(),
      read: false,
    };

    setAlerts((prev) => [newAlert, ...prev]);
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "tender":
        return <AlertCircle className="w-5 h-5" />;
      case "bid":
        return <TrendingUp className="w-5 h-5" />;
      case "report":
        return <CheckCircle2 className="w-5 h-5" />;
      case "system":
        return <Info className="w-5 h-5" />;
      default:
        return <Bell className="w-5 h-5" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "text-red-600 bg-red-50 border-red-200";
      case "medium":
        return "text-orange-600 bg-orange-50 border-orange-200";
      case "low":
        return "text-blue-600 bg-blue-50 border-blue-200";
      default:
        return "text-slate-600 bg-slate-50 border-slate-200";
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl">Alerts & Notifications</h1>
          <p className="text-slate-600 mt-1">
            Manage your alerts and saved search criteria
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={markAllAsRead}>
            Mark All Read
          </Button>
          <Button className="bg-gradient-to-r from-blue-600 to-purple-600" onClick={createAlert}>
            <Plus className="w-4 h-4 mr-2" />
            Create Alert
          </Button>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 border-0 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-red-500 to-pink-600">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl">{unreadCount}</p>
              <p className="text-sm text-slate-600">Unread Alerts</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-0 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600">
              <Search className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl">{savedSearches.length}</p>
              <p className="text-sm text-slate-600">Saved Searches</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-0 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl">24</p>
              <p className="text-sm text-slate-600">Email Sent</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-0 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl">12</p>
              <p className="text-sm text-slate-600">Matches Today</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alerts List */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-6 border-0 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg">Recent Alerts</h3>
              <div className="flex gap-2">
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="tender">Tenders</SelectItem>
                    <SelectItem value="bid">Bids</SelectItem>
                    <SelectItem value="report">Reports</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search alerts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="space-y-3">
              {filteredAlerts.map((alert, index) => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`p-4 rounded-xl border transition-all hover:shadow-md ${
                    alert.read ? "bg-slate-50" : "bg-white border-blue-200"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`p-2 rounded-lg ${
                        alert.read ? "bg-slate-200 text-slate-600" : "bg-blue-100 text-blue-600"
                      }`}
                    >
                      {getAlertIcon(alert.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-1">
                        <h4 className={alert.read ? "text-slate-700" : ""}>{alert.title}</h4>
                        <Badge className={`${getPriorityColor(alert.priority)} border text-xs`}>
                          {alert.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600 mb-2">{alert.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">
                          {new Date(alert.timestamp).toLocaleString()}
                        </span>
                        <div className="flex gap-2">
                          {!alert.read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markAsRead(alert.id)}
                            >
                              Mark Read
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteAlert(alert.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </Card>
        </div>

        {/* Saved Searches */}
        <div className="space-y-4">
          <Card className="p-6 border-0 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg">Saved Searches</h3>
              <Button variant="ghost" size="sm">
                <Settings className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-3">
              {savedSearches.map((search, index) => (
                <motion.div
                  key={search.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 rounded-xl border border-slate-200 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="text-sm mb-1">{search.name}</h4>
                      <p className="text-xs text-slate-500">Last match: {search.lastMatched}</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-xs text-slate-600 mb-3">
                    <div className="flex justify-between">
                      <span>Sector:</span>
                      <span>{search.criteria.sector}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>State:</span>
                      <span>{search.criteria.state}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Value Range:</span>
                      <span>
                        ${search.criteria.minValue / 1000000}M - $
                        {search.criteria.maxValue / 1000000}M
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                    <Label htmlFor={`notify-${search.id}`} className="text-xs cursor-pointer">
                      Notifications
                    </Label>
                    <Switch
                      id={`notify-${search.id}`}
                      checked={search.notifications}
                      onCheckedChange={() => toggleNotifications(search.id)}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </Card>

          {/* Notification Settings */}
          <Card className="p-6 border-0 shadow-lg">
            <h3 className="text-lg mb-4">Notification Preferences</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-slate-600" />
                  <Label htmlFor="email-notif" className="cursor-pointer">
                    Email Notifications
                  </Label>
                </div>
                <Switch id="email-notif" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-4 h-4 text-slate-600" />
                  <Label htmlFor="sms-notif" className="cursor-pointer">
                    SMS Notifications
                  </Label>
                </div>
                <Switch id="sms-notif" />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="w-4 h-4 text-slate-600" />
                  <Label htmlFor="push-notif" className="cursor-pointer">
                    Push Notifications
                  </Label>
                </div>
                <Switch id="push-notif" defaultChecked />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
