import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Search, Mail, Phone, MapPin, MoreVertical } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { useState } from "react";
import { motion } from "motion/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";

const customersData = [
  {
    id: "CUS-001",
    name: "Sarah Johnson",
    email: "sarah.j@email.com",
    phone: "+1 (555) 123-4567",
    location: "New York, USA",
    totalOrders: 24,
    totalSpent: 12450,
    status: "active",
    lastOrder: "2 days ago",
  },
  {
    id: "CUS-002",
    name: "Michael Chen",
    email: "m.chen@email.com",
    phone: "+1 (555) 234-5678",
    location: "San Francisco, USA",
    totalOrders: 18,
    totalSpent: 8920,
    status: "active",
    lastOrder: "5 days ago",
  },
  {
    id: "CUS-003",
    name: "Emma Wilson",
    email: "emma.w@email.com",
    phone: "+44 20 1234 5678",
    location: "London, UK",
    totalOrders: 31,
    totalSpent: 15670,
    status: "vip",
    lastOrder: "1 day ago",
  },
  {
    id: "CUS-004",
    name: "James Brown",
    email: "james.b@email.com",
    phone: "+1 (555) 345-6789",
    location: "Chicago, USA",
    totalOrders: 12,
    totalSpent: 6540,
    status: "active",
    lastOrder: "1 week ago",
  },
  {
    id: "CUS-005",
    name: "Sophia Martinez",
    email: "sophia.m@email.com",
    phone: "+34 91 234 5678",
    location: "Madrid, Spain",
    totalOrders: 8,
    totalSpent: 4230,
    status: "inactive",
    lastOrder: "3 weeks ago",
  },
  {
    id: "CUS-006",
    name: "David Lee",
    email: "david.lee@email.com",
    phone: "+65 1234 5678",
    location: "Singapore",
    totalOrders: 42,
    totalSpent: 21890,
    status: "vip",
    lastOrder: "Today",
  },
  {
    id: "CUS-007",
    name: "Olivia Taylor",
    email: "olivia.t@email.com",
    phone: "+61 2 1234 5678",
    location: "Sydney, Australia",
    totalOrders: 15,
    totalSpent: 7650,
    status: "active",
    lastOrder: "4 days ago",
  },
  {
    id: "CUS-008",
    name: "Lucas Garcia",
    email: "lucas.g@email.com",
    phone: "+55 11 1234 5678",
    location: "São Paulo, Brazil",
    totalOrders: 19,
    totalSpent: 9830,
    status: "active",
    lastOrder: "6 days ago",
  },
];

export default function Customers() {
  const [searchQuery, setSearchQuery] = useState("");
  const [customers, setCustomers] = useState(customersData);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [draftCustomer, setDraftCustomer] = useState({
    name: "",
    email: "",
    phone: "",
    location: "",
    status: "active",
  });

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "vip":
        return "bg-purple-100 text-purple-700";
      case "active":
        return "bg-green-100 text-green-700";
      case "inactive":
        return "bg-slate-100 text-slate-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const addCustomer = () => {
    if (!draftCustomer.name || !draftCustomer.email) return;

    const nextId = `CUS-${String(customers.length + 1).padStart(3, "0")}`;
    const newCustomer = {
      id: nextId,
      name: draftCustomer.name,
      email: draftCustomer.email,
      phone: draftCustomer.phone || "N/A",
      location: draftCustomer.location || "Unknown",
      totalOrders: 0,
      totalSpent: 0,
      status: draftCustomer.status,
      lastOrder: "Never",
    };

    setCustomers((prev) => [newCustomer, ...prev]);
    setDraftCustomer({ name: "", email: "", phone: "", location: "", status: "active" });
    setIsCreateOpen(false);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl">Customers</h1>
          <p className="text-slate-600 mt-1">Manage and view customer information</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">Add Customer</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Customer</DialogTitle>
              <DialogDescription>Fill customer details before adding.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                placeholder="Full name"
                value={draftCustomer.name}
                onChange={(e) => setDraftCustomer((prev) => ({ ...prev, name: e.target.value }))}
              />
              <Input
                type="email"
                placeholder="Email"
                value={draftCustomer.email}
                onChange={(e) => setDraftCustomer((prev) => ({ ...prev, email: e.target.value }))}
              />
              <Input
                placeholder="Phone"
                value={draftCustomer.phone}
                onChange={(e) => setDraftCustomer((prev) => ({ ...prev, phone: e.target.value }))}
              />
              <Input
                placeholder="Location"
                value={draftCustomer.location}
                onChange={(e) => setDraftCustomer((prev) => ({ ...prev, location: e.target.value }))}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={addCustomer} disabled={!draftCustomer.name || !draftCustomer.email}>Confirm Add</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Total Customers", value: "5,500", detail: "+12% from last month", detailClass: "text-green-600" },
          { label: "Active Customers", value: "4,234", detail: "77% of total", detailClass: "text-slate-500 dark:text-slate-400" },
          { label: "VIP Customers", value: "156", detail: "High value", detailClass: "text-purple-600" },
          { label: "Avg. Order Value", value: "$487", detail: "+8% this month", detailClass: "text-green-600" },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="p-4 border-0 shadow-lg hover:shadow-xl transition-shadow">
              <p className="text-sm text-slate-600 dark:text-slate-300">{stat.label}</p>
              <p className="text-3xl mt-2">{stat.value}</p>
              <p className={`text-sm mt-1 ${stat.detailClass}`}>{stat.detail}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search customers by name, email, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {/* Customers Table */}
      <Card className="p-6">
        <h3 className="text-lg mb-4">Customer List</h3>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Total Spent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Order</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-blue-100 text-blue-600">
                          {getInitials(customer.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p>{customer.name}</p>
                        <p className="text-xs text-slate-500">{customer.id}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="w-3 h-3 text-slate-400" />
                        {customer.email}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {customer.phone}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span className="text-sm">{customer.location}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{customer.totalOrders}</TableCell>
                  <TableCell className="text-right">
                    ${customer.totalSpent.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(customer.status)}>
                      {customer.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-slate-500">
                    {customer.lastOrder}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>View Details</DropdownMenuItem>
                        <DropdownMenuItem>Send Email</DropdownMenuItem>
                        <DropdownMenuItem>View Orders</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">
                          Delete Customer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
