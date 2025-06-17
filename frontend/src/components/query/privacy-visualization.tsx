"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Shield, 
  Eye, 
  Code, 
  Users, 
  AlertTriangle, 
  CheckCircle,
  Loader2,
  Zap
} from "lucide-react";
import { apiClient, queryKeys } from "@/lib/api";
import { motion } from "framer-motion";

interface PrivacyVisualizationProps {
  requestId: string;
}

export function PrivacyVisualization({ requestId }: PrivacyVisualizationProps) {
  const { data: visualization, isLoading, error } = useQuery({
    queryKey: queryKeys.visualization(requestId),
    queryFn: () => apiClient.getPrivacyVisualization(requestId),
    enabled: !!requestId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading privacy visualization...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !visualization) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center space-y-2">
            <AlertTriangle className="h-12 w-12 mx-auto text-destructive" />
            <p className="text-destructive">Failed to load privacy visualization</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const privacyScore = visualization.privacy_score || 0;
  const totalFragments = visualization.fragments.length;
  const sensitiveFragments = visualization.fragments.filter(f => f.contains_sensitive_data).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Privacy Analysis
        </CardTitle>
        <CardDescription>
          Real-time visualization of query fragmentation and privacy preservation
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="fragments">Fragments</TabsTrigger>
            <TabsTrigger value="providers">Providers</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Privacy Score */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Privacy Score</span>
                <Badge variant={privacyScore >= 80 ? "default" : privacyScore >= 60 ? "secondary" : "destructive"}>
                  {Math.round(privacyScore)}%
                </Badge>
              </div>
              <Progress value={privacyScore} className="w-full" />
              <p className="text-xs text-muted-foreground">
                Higher scores indicate better privacy preservation through fragmentation
              </p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">Fragments</span>
                </div>
                <p className="text-2xl font-bold">{totalFragments}</p>
                <p className="text-xs text-muted-foreground">
                  {sensitiveFragments} contain sensitive data
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">Providers</span>
                </div>
                <p className="text-2xl font-bold">
                  {Object.keys(visualization.provider_distribution).length}
                </p>
                <p className="text-xs text-muted-foreground">
                  Load balanced across providers
                </p>
              </div>
            </div>

            {/* Data Isolation Status */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Data Isolation</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-orange-500" />
                    <span className="text-sm">PII Detection</span>
                  </div>
                  {visualization.sensitive_data_isolation.pii_fragments.length > 0 ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <Badge variant="outline" className="text-xs">None detected</Badge>
                  )}
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <Code className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">Code Detection</span>
                  </div>
                  {visualization.sensitive_data_isolation.code_fragments.length > 0 ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <Badge variant="outline" className="text-xs">None detected</Badge>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="fragments" className="space-y-4">
            <div className="space-y-3">
              {visualization.fragments.map((fragment, index) => (
                <motion.div
                  key={fragment.fragment_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="border rounded-lg p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        Fragment {fragment.order + 1}
                      </Badge>
                      <Badge 
                        variant={fragment.contains_sensitive_data ? "destructive" : "secondary"}
                        className="text-xs"
                      >
                        {fragment.fragment_type}
                      </Badge>
                    </div>
                    {fragment.provider_hint && (
                      <Badge variant="outline" className="text-xs">
                        → {fragment.provider_hint}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {fragment.content}
                  </p>
                  {fragment.contains_sensitive_data && (
                    <div className="flex items-center gap-1 text-xs text-orange-600">
                      <AlertTriangle className="h-3 w-3" />
                      Contains sensitive data - isolated processing
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="providers" className="space-y-4">
            <div className="space-y-3">
              {Object.entries(visualization.provider_distribution).map(([provider, count]) => (
                <div key={provider} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span className="font-medium capitalize">{provider}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{count}</p>
                    <p className="text-xs text-muted-foreground">fragments</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Fragments are distributed across providers to ensure no single provider 
                has access to the complete query context, maximizing privacy preservation.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}