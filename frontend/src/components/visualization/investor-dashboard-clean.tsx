"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  Shield, 
  DollarSign, 
  Activity, 
  TrendingUp,
  Zap
} from 'lucide-react';
import { useQuery } from '@/contexts/query-context';

export function InvestorDashboardClean() {
  const { investorMetrics, isProcessing } = useQuery();

  // Use actual values from investor metrics or show 0
  const animatedValues = {
    privacyScore: investorMetrics?.privacy_score || 0,
    costSavings: investorMetrics?.cost_savings || 0,
    systemEfficiency: investorMetrics?.system_efficiency || 0,
    processingTime: investorMetrics?.processing_time || 0,
    throughputRate: investorMetrics?.throughput_rate || 0,
    roiCalculation: investorMetrics?.roi_calculation || 0
  };

  const performanceMetrics = [
    {
      title: "Privacy Score",
      value: Math.round(animatedValues.privacyScore),
      unit: "%",
      icon: Shield,
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950/20",
      description: "Enterprise-grade privacy preservation",
      target: 95
    },
    {
      title: "Cost Savings",
      value: Math.round(animatedValues.costSavings),
      unit: "%",
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-950/20",
      description: "Savings vs single provider approach",
      target: 70
    },
    {
      title: "System Efficiency",
      value: Math.round(animatedValues.systemEfficiency),
      unit: "%",
      icon: Zap,
      color: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-950/20",
      description: "Resource utilization optimization",
      target: 90
    },
    {
      title: "Processing Speed",
      value: animatedValues.processingTime ? `${animatedValues.processingTime.toFixed(1)}` : "0",
      unit: "s",
      icon: Activity,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50 dark:bg-indigo-950/20",
      description: "Real-time query processing time",
      target: 2.0,
      isInverse: true // Lower is better
    },
    {
      title: "Throughput Rate",
      value: Math.round(animatedValues.throughputRate),
      unit: "QPM",
      icon: BarChart3,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/20",
      description: "Queries per minute capacity",
      target: 60
    },
    {
      title: "ROI Potential",
      value: Math.round(animatedValues.roiCalculation),
      unit: "%",
      icon: TrendingUp,
      color: "text-orange-600",
      bgColor: "bg-orange-50 dark:bg-orange-950/20",
      description: "Annualized return on investment",
      target: 120
    }
  ];

  return (
    <div className="space-y-6">
      {/* Executive KPI Dashboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Real-Time Performance Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {performanceMetrics.map((metric, index) => (
              <motion.div
                key={metric.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-4 rounded-lg ${metric.bgColor}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <metric.icon className={`h-5 w-5 ${metric.color}`} />
                    <span className="font-medium">{metric.title}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Target: {metric.target}{metric.unit === "%" ? "%" : metric.unit === "s" ? "s" : ""}
                  </Badge>
                </div>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className={`text-3xl font-bold ${metric.color}`}>
                    {metric.value}
                  </span>
                  <span className={`text-lg ${metric.color}`}>{metric.unit}</span>
                </div>
                <div className="mb-2">
                  <Progress 
                    value={metric.isInverse 
                      ? Math.max(0, (1 - parseFloat(metric.value) / metric.target) * 100)
                      : Math.min(100, (parseFloat(metric.value) / metric.target) * 100)
                    } 
                    className="h-1.5"
                  />
                </div>
                <p className="text-xs text-muted-foreground">{metric.description}</p>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Real-time Processing Indicators */}
      {isProcessing && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-4 right-4 z-50"
        >
          <Card className="shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="h-3 w-3 bg-blue-600 rounded-full animate-ping absolute" />
                  <div className="h-3 w-3 bg-blue-600 rounded-full" />
                </div>
                <span className="text-sm font-medium">Processing Query...</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}