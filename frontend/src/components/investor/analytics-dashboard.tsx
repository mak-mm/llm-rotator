"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useMetrics, useTimeseriesData } from "@/hooks/useMetrics";
import { useWebSocketSubscription } from "@/hooks/useWebSocket";
import { RealTimeIndicator } from "@/components/common/real-time-indicator";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Globe2, 
  Zap,
  Activity,
  Filter,
  Download,
  Calendar,
  Eye,
  Brain,
  Target
} from "lucide-react";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  RadialBarChart,
  RadialBar,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  Treemap,
  ScatterChart,
  Scatter,
  ZAxis
} from "recharts";

// Mock data generation
const generateTimeSeriesData = (days: number) => {
  const data = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    data.push({
      date: date.toISOString().split('T')[0],
      queries: Math.floor(Math.random() * 1000) + 500,
      fragmentedQueries: Math.floor(Math.random() * 600) + 300,
      privacyScore: Math.floor(Math.random() * 20) + 80,
      cost: Math.random() * 50 + 20,
      latency: Math.random() * 500 + 800,
    });
  }
  return data;
};

const providerUsageData = [
  { provider: "OpenAI GPT-4.1", usage: 45, queries: 4500, color: "#10b981" },
  { provider: "Claude Sonnet 4", usage: 35, queries: 3500, color: "#3b82f6" },
  { provider: "Gemini 2.5 Flash", usage: 20, queries: 2000, color: "#f59e0b" },
];

const queryTypeDistribution = [
  { type: "Code Generation", count: 3200, percentage: 32 },
  { type: "Data Analysis", count: 2800, percentage: 28 },
  { type: "Content Writing", count: 2000, percentage: 20 },
  { type: "Medical Queries", count: 1200, percentage: 12 },
  { type: "Legal Documents", count: 800, percentage: 8 },
];

const geographicData = [
  { region: "North America", users: 4500, queries: 45000, growth: 12 },
  { region: "Europe", users: 3200, queries: 32000, growth: 18 },
  { region: "Asia Pacific", users: 2800, queries: 28000, growth: 25 },
  { region: "Latin America", users: 800, queries: 8000, growth: 32 },
  { region: "Middle East", users: 400, queries: 4000, growth: 15 },
];

const performanceMetrics = [
  { metric: "Query Success Rate", value: 98.5, target: 99 },
  { metric: "Privacy Protection", value: 95.2, target: 95 },
  { metric: "Cost Efficiency", value: 87.3, target: 85 },
  { metric: "Response Time", value: 92.1, target: 90 },
  { metric: "User Satisfaction", value: 94.7, target: 90 },
];

const fragmentationPatterns = [
  { pattern: "Simple Split", frequency: 45, avgFragments: 2.3 },
  { pattern: "Complex Multi-Provider", frequency: 30, avgFragments: 4.7 },
  { pattern: "PII Extraction", frequency: 15, avgFragments: 3.2 },
  { pattern: "Code Isolation", frequency: 10, avgFragments: 2.8 },
];

export function AnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState("7d");
  const [selectedMetric, setSelectedMetric] = useState("queries");

  // Use real API data
  const { data: metricsData, isLoading: metricsLoading, error: metricsError } = useMetrics(timeRange);
  const { data: timeSeriesData, isLoading: timeSeriesLoading } = useTimeseriesData(selectedMetric, timeRange);

  // Subscribe to real-time metrics updates
  useWebSocketSubscription('metrics_update', (data) => {
    console.log('📊 Real-time metrics update received:', data);
    toast.success("Analytics updated in real-time", {
      duration: 2000,
    });
  });

  // Fallback to mock data if API fails
  const [mockTimeSeriesData, setMockTimeSeriesData] = useState(generateTimeSeriesData(7));
  
  useEffect(() => {
    if (metricsError) {
      toast.error("Failed to load metrics data. Using fallback data.");
    }
  }, [metricsError]);

  useEffect(() => {
    const days = timeRange === "24h" ? 1 : timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
    setMockTimeSeriesData(generateTimeSeriesData(days));
  }, [timeRange]);

  // Use real data if available, otherwise fall back to mock data
  const displayTimeSeriesData = timeSeriesData || mockTimeSeriesData;
  
  // Calculate summary metrics from real API data or mock data
  const totalQueries = metricsData?.total_queries || mockTimeSeriesData.reduce((sum, day) => sum + day.queries, 0);
  const avgPrivacyScore = metricsData?.privacy_score || mockTimeSeriesData.reduce((sum, day) => sum + day.privacyScore, 0) / mockTimeSeriesData.length;
  const totalCost = metricsData?.total_cost || mockTimeSeriesData.reduce((sum, day) => sum + day.cost, 0);
  const avgLatency = metricsData?.average_latency || mockTimeSeriesData.reduce((sum, day) => sum + day.latency, 0) / mockTimeSeriesData.length;

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toFixed(0);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-8 w-8 text-primary" />
          <h2 className="text-2xl font-bold tracking-tight">Analytics Dashboard</h2>
          <RealTimeIndicator variant="badge" />
        </div>
        <p className="text-muted-foreground">
          Real-time insights and performance metrics for intelligent decision making
        </p>
      </div>

      {/* Time Range Selector */}
      <div className="flex items-center justify-between">
        <Tabs value={timeRange} onValueChange={setTimeRange} className="w-auto">
          <TabsList>
            <TabsTrigger value="24h">24h</TabsTrigger>
            <TabsTrigger value="7d">7d</TabsTrigger>
            <TabsTrigger value="30d">30d</TabsTrigger>
            <TabsTrigger value="90d">90d</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
        >
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setSelectedMetric("queries")}>
            <CardContent className="p-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Total Queries</p>
                </div>
                {metricsLoading ? (
                  <div className="animate-pulse">
                    <div className="h-9 bg-muted rounded w-24"></div>
                  </div>
                ) : (
                  <p className="text-3xl font-bold">{formatNumber(totalQueries)}</p>
                )}
                <div className="flex items-center gap-1 text-green-600">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {metricsData ? "+12.5%" : "Mock Data"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setSelectedMetric("privacyScore")}>
            <CardContent className="p-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Privacy Score</p>
                </div>
                {metricsLoading ? (
                  <div className="animate-pulse">
                    <div className="h-9 bg-muted rounded w-24"></div>
                  </div>
                ) : (
                  <p className="text-3xl font-bold">{avgPrivacyScore.toFixed(1)}%</p>
                )}
                <Badge variant="outline" className="text-xs">
                  {metricsData ? "Excellent" : "Mock Data"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setSelectedMetric("cost")}>
            <CardContent className="p-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Cost Saved</p>
                </div>
                {metricsLoading ? (
                  <div className="animate-pulse">
                    <div className="h-9 bg-muted rounded w-24"></div>
                  </div>
                ) : (
                  <p className="text-3xl font-bold">${totalCost.toFixed(0)}</p>
                )}
                <div className="flex items-center gap-1 text-green-600">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {metricsData ? "-38%" : "Mock Data"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setSelectedMetric("latency")}>
            <CardContent className="p-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Avg Latency</p>
                </div>
                {metricsLoading ? (
                  <div className="animate-pulse">
                    <div className="h-9 bg-muted rounded w-24"></div>
                  </div>
                ) : (
                  <p className="text-3xl font-bold">{(avgLatency / 1000).toFixed(2)}s</p>
                )}
                <Badge variant="outline" className="text-xs">
                  {metricsData ? "Fast" : "Mock Data"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Main Time Series Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Over Time</CardTitle>
          <CardDescription>
            Track key metrics and identify trends
          </CardDescription>
        </CardHeader>
        <CardContent>
          {timeSeriesLoading ? (
            <div className="h-[400px] flex items-center justify-center">
              <div className="animate-pulse">
                <div className="h-80 bg-muted rounded w-full"></div>
              </div>
            </div>
          ) : (
            <div className="h-[400px]">
              {!timeSeriesData && (
                <div className="mb-2 p-2 bg-yellow-50 dark:bg-yellow-950/20 rounded border">
                  <p className="text-sm text-muted-foreground">Using mock data - API connection failed</p>
                </div>
              )}
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={displayTimeSeriesData}>
                <defs>
                  <linearGradient id="colorQueries" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorFragmented" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="queries" 
                  stroke="#3b82f6" 
                  fillOpacity={1} 
                  fill="url(#colorQueries)" 
                  name="Total Queries"
                />
                <Area 
                  type="monotone" 
                  dataKey="fragmentedQueries" 
                  stroke="#10b981" 
                  fillOpacity={1} 
                  fill="url(#colorFragmented)" 
                  name="Fragmented Queries"
                />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Provider Usage and Query Types */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Provider Usage */}
        <Card>
          <CardHeader>
            <CardTitle>Provider Usage Distribution</CardTitle>
            <CardDescription>
              Query routing across LLM providers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart cx="50%" cy="50%" innerRadius="10%" outerRadius="90%" data={providerUsageData}>
                  <RadialBar
                    minAngle={15}
                    label={{ position: 'insideStart', fill: '#fff' }}
                    background
                    clockWise
                    dataKey="usage"
                  >
                    {providerUsageData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </RadialBar>
                  <Tooltip />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {providerUsageData.map((provider) => (
                <div key={provider.provider} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: provider.color }} />
                    <span className="text-sm">{provider.provider}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">{provider.usage}%</span>
                    <Badge variant="outline" className="text-xs">
                      {formatNumber(provider.queries)} queries
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Query Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Query Type Analysis</CardTitle>
            <CardDescription>
              Breakdown of query categories
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <Treemap
                  data={queryTypeDistribution}
                  dataKey="count"
                  stroke="#fff"
                  fill="#3b82f6"
                >
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-background border rounded p-2 shadow-lg">
                            <p className="font-medium">{data.type}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatNumber(data.count)} queries ({data.percentage}%)
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </Treemap>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Radar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
          <CardDescription>
            Multi-dimensional performance analysis against targets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={performanceMetrics}>
                  <PolarGrid strokeDasharray="3 3" />
                  <PolarAngleAxis dataKey="metric" className="text-xs" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} />
                  <Radar 
                    name="Current" 
                    dataKey="value" 
                    stroke="#3b82f6" 
                    fill="#3b82f6" 
                    fillOpacity={0.6} 
                  />
                  <Radar 
                    name="Target" 
                    dataKey="target" 
                    stroke="#10b981" 
                    fill="#10b981" 
                    fillOpacity={0.3} 
                  />
                  <Legend />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold">Performance Summary</h4>
              {performanceMetrics.map((metric) => (
                <div key={metric.metric} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">{metric.metric}</span>
                    <span className="text-sm font-medium">
                      {metric.value}% 
                      {metric.value >= metric.target ? (
                        <Badge variant="outline" className="ml-2 text-xs text-green-600">On Target</Badge>
                      ) : (
                        <Badge variant="outline" className="ml-2 text-xs text-yellow-600">Below Target</Badge>
                      )}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full" 
                      style={{ width: `${metric.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Geographic Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Geographic Distribution</CardTitle>
          <CardDescription>
            User activity and growth by region
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={geographicData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" className="text-xs" />
                <YAxis type="category" dataKey="region" className="text-xs" />
                <Tooltip />
                <Bar dataKey="users" fill="#3b82f6" name="Active Users" radius={[0, 8, 8, 0]}>
                  <Cell fill="#3b82f6" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            {geographicData.map((region) => (
              <div key={region.region} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Globe2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{region.region}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    +{region.growth}%
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    {formatNumber(region.users)} users • {formatNumber(region.queries)} queries
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Insights and Recommendations */}
      <Card className="border-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI-Powered Insights
          </CardTitle>
          <CardDescription>
            Actionable recommendations based on current data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-start gap-3">
                <Target className="h-5 w-5 text-green-600 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-medium">Optimization Opportunity</h4>
                  <p className="text-sm text-muted-foreground">
                    Route 15% more simple queries to Gemini 2.5 Flash to reduce costs by $1,200/month
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-3">
                <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-medium">Growth Potential</h4>
                  <p className="text-sm text-muted-foreground">
                    Asia Pacific showing 25% growth - consider dedicated infrastructure
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}