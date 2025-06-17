"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  TrendingUp, 
  TrendingDown,
  Users, 
  DollarSign, 
  Target,
  Award,
  Briefcase,
  Globe,
  ArrowUp,
  ArrowDown,
  Building2,
  Rocket,
  Star,
  ChevronRight,
  Calendar,
  BarChart3
} from "lucide-react";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// KPI Data
const kpiData = [
  {
    title: "Annual Recurring Revenue",
    value: "$2.4M",
    change: "+32%",
    trend: "up",
    icon: DollarSign,
    color: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-950/20",
  },
  {
    title: "Enterprise Customers",
    value: "127",
    change: "+18%",
    trend: "up",
    icon: Building2,
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-950/20",
  },
  {
    title: "Net Retention Rate",
    value: "142%",
    change: "+7%",
    trend: "up",
    icon: Target,
    color: "text-purple-600",
    bgColor: "bg-purple-50 dark:bg-purple-950/20",
  },
  {
    title: "Customer Satisfaction",
    value: "4.8/5",
    change: "+0.2",
    trend: "up",
    icon: Star,
    color: "text-yellow-600",
    bgColor: "bg-yellow-50 dark:bg-yellow-950/20",
  },
];

// Revenue Growth Data
const revenueGrowth = [
  { month: "Jan", revenue: 180000, growth: 0 },
  { month: "Feb", revenue: 195000, growth: 8.3 },
  { month: "Mar", revenue: 215000, growth: 10.3 },
  { month: "Apr", revenue: 228000, growth: 6.0 },
  { month: "May", revenue: 245000, growth: 7.5 },
  { month: "Jun", revenue: 268000, growth: 9.4 },
];

// Customer Segments
const customerSegments = [
  { segment: "Enterprise", value: 45, count: 127, color: "#3b82f6" },
  { segment: "Mid-Market", value: 30, count: 243, color: "#10b981" },
  { segment: "SMB", value: 20, count: 512, color: "#f59e0b" },
  { segment: "Startup", value: 5, count: 89, color: "#8b5cf6" },
];

// Strategic Initiatives
const initiatives = [
  {
    title: "European Expansion",
    status: "on-track",
    progress: 65,
    dueDate: "Q3 2024",
    impact: "$800K ARR",
    owner: "Sarah Chen",
  },
  {
    title: "Healthcare Vertical Launch",
    status: "on-track",
    progress: 45,
    dueDate: "Q4 2024",
    impact: "$1.2M ARR",
    owner: "Dr. Michael Ross",
  },
  {
    title: "Partner Ecosystem",
    status: "at-risk",
    progress: 30,
    dueDate: "Q3 2024",
    impact: "$500K ARR",
    owner: "Jennifer Wu",
  },
  {
    title: "AI Model Marketplace",
    status: "ahead",
    progress: 80,
    dueDate: "Q2 2024",
    impact: "$2M ARR",
    owner: "Alex Kumar",
  },
];

// Top Customers
const topCustomers = [
  { name: "Acme Healthcare", industry: "Healthcare", mrr: 45000, growth: 25, logo: "AH" },
  { name: "Global Finance Corp", industry: "Finance", mrr: 38000, growth: 15, logo: "GF" },
  { name: "TechVentures Inc", industry: "Technology", mrr: 32000, growth: 40, logo: "TV" },
  { name: "Retail Solutions", industry: "Retail", mrr: 28000, growth: 18, logo: "RS" },
  { name: "Legal Associates", industry: "Legal", mrr: 25000, growth: 22, logo: "LA" },
];

// Market Opportunity
const marketData = [
  { year: 2024, tam: 5.2, sam: 1.8, som: 0.12 },
  { year: 2025, tam: 8.5, sam: 3.2, som: 0.35 },
  { year: 2026, tam: 12.3, sam: 5.8, som: 0.87 },
  { year: 2027, tam: 18.7, sam: 9.2, som: 1.84 },
];

const statusConfig = {
  "on-track": { color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/20", label: "On Track" },
  "at-risk": { color: "text-yellow-600", bg: "bg-yellow-50 dark:bg-yellow-950/20", label: "At Risk" },
  "ahead": { color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/20", label: "Ahead" },
};

export function ExecutiveDashboard() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Briefcase className="h-8 w-8 text-primary" />
          <h2 className="text-2xl font-bold tracking-tight">Executive Dashboard</h2>
        </div>
        <p className="text-muted-foreground">
          High-level business metrics and strategic overview for leadership
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiData.map((kpi, index) => (
          <motion.div
            key={kpi.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="relative overflow-hidden">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className={`p-2 rounded-lg ${kpi.bgColor}`}>
                      <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                    </div>
                    <Badge 
                      variant={kpi.trend === "up" ? "default" : "destructive"}
                      className="text-xs"
                    >
                      {kpi.trend === "up" ? <ArrowUp className="h-3 w-3 mr-1" /> : <ArrowDown className="h-3 w-3 mr-1" />}
                      {kpi.change}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{kpi.title}</p>
                    <p className="text-2xl font-bold">{kpi.value}</p>
                  </div>
                </div>
                <div className="absolute bottom-0 right-0 opacity-5">
                  <kpi.icon className="h-24 w-24" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Revenue Growth and Customer Segments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Growth Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Growth Trend</CardTitle>
            <CardDescription>
              Month-over-month revenue performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueGrowth}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(value) => `$${value / 1000}K`} />
                  <Tooltip 
                    formatter={(value: number) => [`$${(value / 1000).toFixed(0)}K`, "Revenue"]}
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#3b82f6" 
                    fillOpacity={1} 
                    fill="url(#colorRevenue)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-muted-foreground">MRR</p>
                <p className="text-lg font-semibold">$268K</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Growth Rate</p>
                <p className="text-lg font-semibold text-green-600">+32%</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Run Rate</p>
                <p className="text-lg font-semibold">$3.2M</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer Segments */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Segments</CardTitle>
            <CardDescription>
              Revenue distribution by customer type
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={customerSegments}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {customerSegments.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {customerSegments.map((segment) => (
                <div key={segment.segment} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: segment.color }} />
                    <span className="text-sm">{segment.segment}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">{segment.count} customers</span>
                    <Badge variant="outline" className="text-xs">{segment.value}%</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Strategic Initiatives */}
      <Card>
        <CardHeader>
          <CardTitle>Strategic Initiatives</CardTitle>
          <CardDescription>
            Key projects driving growth and expansion
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {initiatives.map((initiative, index) => (
              <motion.div
                key={initiative.title}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 border rounded-lg"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Rocket className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <h4 className="font-semibold">{initiative.title}</h4>
                        <p className="text-sm text-muted-foreground">Impact: {initiative.impact}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${statusConfig[initiative.status].color}`}
                      >
                        {statusConfig[initiative.status].label}
                      </Badge>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {initiative.dueDate}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Progress</span>
                      <span className="text-sm font-medium">{initiative.progress}%</span>
                    </div>
                    <Progress value={initiative.progress} className="h-2" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">
                        {initiative.owner.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-muted-foreground">{initiative.owner}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Customers and Market Opportunity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Customers */}
        <Card>
          <CardHeader>
            <CardTitle>Top Customers</CardTitle>
            <CardDescription>
              Highest revenue generating accounts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topCustomers.map((customer, index) => (
                <motion.div
                  key={customer.name}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>{customer.logo}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{customer.name}</p>
                      <p className="text-sm text-muted-foreground">{customer.industry}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">${(customer.mrr / 1000).toFixed(0)}K MRR</p>
                    <div className="flex items-center gap-1 text-green-600 text-sm">
                      <TrendingUp className="h-3 w-3" />
                      <span>+{customer.growth}%</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            <Button variant="ghost" className="w-full mt-4">
              View All Customers
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        {/* Market Opportunity */}
        <Card>
          <CardHeader>
            <CardTitle>Market Opportunity</CardTitle>
            <CardDescription>
              Total addressable market growth projection
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={marketData}>
                  <defs>
                    <linearGradient id="colorTAM" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorSAM" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorSOM" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="year" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(value) => `$${value}B`} />
                  <Tooltip 
                    formatter={(value: number) => [`$${value.toFixed(1)}B`, ""]}
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="tam" 
                    stackId="1"
                    stroke="#3b82f6" 
                    fill="url(#colorTAM)" 
                    name="TAM"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="sam" 
                    stackId="2"
                    stroke="#10b981" 
                    fill="url(#colorSAM)" 
                    name="SAM"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="som" 
                    stackId="3"
                    stroke="#f59e0b" 
                    fill="url(#colorSOM)" 
                    name="SOM"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-muted-foreground">2027 TAM</p>
                <p className="text-lg font-semibold">$18.7B</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">2027 SAM</p>
                <p className="text-lg font-semibold">$9.2B</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">2027 SOM</p>
                <p className="text-lg font-semibold">$1.84B</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Key Achievements */}
      <Card className="border-primary">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <Award className="h-8 w-8 text-primary" />
            <div>
              <h3 className="text-lg font-semibold">Key Achievements This Quarter</h3>
              <p className="text-sm text-muted-foreground">Celebrating our wins and milestones</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <p className="font-medium">SOC 2 Type II Certified</p>
              <p className="text-sm text-muted-foreground mt-1">
                Achieved full compliance with enterprise security standards
              </p>
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <p className="font-medium">Series A Funding</p>
              <p className="text-sm text-muted-foreground mt-1">
                Raised $15M to accelerate growth and product development
              </p>
            </div>
            <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
              <p className="font-medium">100+ Enterprise Customers</p>
              <p className="text-sm text-muted-foreground mt-1">
                Crossed major milestone with Fortune 500 adoption
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}