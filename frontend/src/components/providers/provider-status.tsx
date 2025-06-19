"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Activity, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  Zap, 
  DollarSign,
  RefreshCw,
  TrendingUp,
  Loader2
} from "lucide-react";
import { motion } from "framer-motion";
import { useProviderStatus } from "@/hooks/useProviders";
import { RealTimeIndicator } from "@/components/common/real-time-indicator";
import { toast } from "sonner";

interface ProviderData {
  id: string;
  name: string;
  model: string;
  status: "online" | "degraded" | "offline";
  latency: number;
  successRate: number;
  requestsToday: number;
  cost: number;
  capabilities: string[];
  lastUpdated: Date;
}


const statusColors = {
  online: { bg: "bg-green-50 dark:bg-green-950/20", border: "border-green-200 dark:border-green-800", icon: "text-green-500" },
  degraded: { bg: "bg-yellow-50 dark:bg-yellow-950/20", border: "border-yellow-200 dark:border-yellow-800", icon: "text-yellow-500" },
  offline: { bg: "bg-red-50 dark:bg-red-950/20", border: "border-red-200 dark:border-red-800", icon: "text-red-500" },
};

const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case "online":
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    case "degraded":
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    case "offline":
      return <XCircle className="h-5 w-5 text-red-500" />;
    default:
      return <Activity className="h-5 w-5 text-gray-500" />;
  }
};

export function ProviderStatus() {
  // Use real API data
  const { data: apiResponse, isLoading, error, refetch } = useProviderStatus();

  // TODO: Add SSE subscription for real-time provider status updates if needed

  const handleRefresh = async () => {
    try {
      await refetch();
      toast.success("Provider status refreshed");
    } catch (error) {
      toast.error("Failed to refresh provider status");
    }
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatCost = (cost: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 4,
    }).format(cost);
  };

  // Transform API data to match component interface (snake_case to camelCase)
  const providers = apiResponse?.providers?.map(p => ({
    id: p.id,
    name: p.name,
    model: p.model,
    status: p.status,
    latency: p.latency,
    successRate: p.success_rate,
    requestsToday: p.requests_today,
    cost: p.cost,
    capabilities: p.capabilities,
    lastUpdated: new Date(p.last_updated),
  })) || []; // No fallback mock data

  // Handle loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">Provider Status</h2>
            <p className="text-muted-foreground">
              Real-time monitoring of LLM provider health and performance
            </p>
          </div>
          <Button disabled variant="outline" className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading...
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-16 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-48 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">Provider Status</h2>
            <p className="text-muted-foreground text-red-500">
              Failed to load provider data. Using fallback data.
            </p>
          </div>
          <Button onClick={handleRefresh} variant="outline" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const totalRequests = providers.reduce((sum, p) => sum + p.requestsToday, 0);
  const totalCost = providers.reduce((sum, p) => sum + p.cost, 0);
  const avgSuccessRate = providers.reduce((sum, p) => sum + p.successRate, 0) / providers.length;
  const onlineProviders = providers.filter(p => p.status === "online").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight">Provider Status</h2>
            <RealTimeIndicator variant="badge" />
          </div>
          <p className="text-muted-foreground">
            Real-time monitoring of LLM provider health and performance
          </p>
        </div>
        <Button 
          onClick={handleRefresh} 
          disabled={isLoading}
          variant="outline"
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-50 dark:bg-green-950/20">
                <Activity className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Online Providers</p>
                <p className="text-2xl font-bold">{onlineProviders}/{providers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                <Zap className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Requests</p>
                <p className="text-2xl font-bold">{totalRequests}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/20">
                <TrendingUp className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Success Rate</p>
                <p className="text-2xl font-bold">{avgSuccessRate.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/20">
                <DollarSign className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Cost Today</p>
                <p className="text-2xl font-bold">{formatCost(totalCost)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Provider Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {providers.map((provider, index) => (
          <motion.div
            key={provider.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className={`${statusColors[provider.status].bg} ${statusColors[provider.status].border}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <StatusIcon status={provider.status} />
                    <div>
                      <CardTitle className="text-lg">{provider.name}</CardTitle>
                      <CardDescription>{provider.model}</CardDescription>
                    </div>
                  </div>
                  <Badge 
                    variant={provider.status === "online" ? "default" : provider.status === "degraded" ? "secondary" : "destructive"}
                    className="capitalize"
                  >
                    {provider.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Performance Metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Latency</span>
                    </div>
                    <p className="text-lg font-semibold">{formatTime(provider.latency)}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Requests Today</span>
                    </div>
                    <p className="text-lg font-semibold">{provider.requestsToday}</p>
                  </div>
                </div>

                {/* Success Rate */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Success Rate</span>
                    <span className="text-sm text-muted-foreground">{provider.successRate.toFixed(1)}%</span>
                  </div>
                  <Progress value={provider.successRate} className="w-full" />
                </div>

                {/* Cost */}
                <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <span className="text-sm text-muted-foreground">Cost Today</span>
                  <span className="font-medium">{formatCost(provider.cost)}</span>
                </div>

                {/* Capabilities */}
                <div className="space-y-2">
                  <span className="text-sm font-medium">Capabilities</span>
                  <div className="flex flex-wrap gap-1">
                    {provider.capabilities.map((capability) => (
                      <Badge key={capability} variant="outline" className="text-xs">
                        {capability}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Last Updated */}
                <div className="text-xs text-muted-foreground text-right">
                  Last updated: {provider.lastUpdated.toLocaleTimeString()}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Last Refresh Info */}
      <div className="text-center text-sm text-muted-foreground">
        Last refreshed: {new Date().toLocaleTimeString()} • Auto-refresh every 30 seconds
      </div>
    </div>
  );
}