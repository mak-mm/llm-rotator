"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  TrendingUp, 
  DollarSign, 
  Shield, 
  Zap, 
  Users, 
  Globe, 
  Award,
  Target,
  BarChart3,
  PieChart,
  Activity,
  CheckCircle2
} from "lucide-react";

interface InvestorDashboardProps {
  realTimeData?: any;
  investorMetrics?: any;
  isProcessing?: boolean;
}

export function InvestorDashboard({ realTimeData = {}, investorMetrics, isProcessing }: InvestorDashboardProps) {
  const [animatedValues, setAnimatedValues] = useState({
    privacyScore: 0,
    costSavings: 0,
    systemEfficiency: 0,
    roiCalculation: 0,
    processingTime: 0,
    throughputRate: 0
  });

  // Animate values when data updates
  useEffect(() => {
    const newValues = {
      privacyScore: investorMetrics?.privacy_score || realTimeData.privacy_update?.privacy_score || 0,
      costSavings: investorMetrics?.savings_percentage || realTimeData.cost_calculation?.savings_percentage || 0,
      systemEfficiency: investorMetrics?.system_efficiency || realTimeData.performance_metric?.system_efficiency || 0,
      roiCalculation: realTimeData.cost_calculation?.roi_calculation || 0,
      processingTime: investorMetrics?.processing_time || realTimeData.performance_metric?.total_processing_time || 0,
      throughputRate: investorMetrics?.throughput_rate || realTimeData.performance_metric?.throughput_rate || 0
    };

    // Animate to new values
    Object.entries(newValues).forEach(([key, targetValue]) => {
      if (targetValue > 0) {
        let currentValue = 0;
        const increment = targetValue / 30; // 30 steps animation
        const interval = setInterval(() => {
          currentValue += increment;
          if (currentValue >= targetValue) {
            currentValue = targetValue;
            clearInterval(interval);
          }
          setAnimatedValues(prev => ({ ...prev, [key]: currentValue }));
        }, 50);
      }
    });
  }, [realTimeData, investorMetrics]);

  const keyMetrics = [
    {
      title: "Privacy Protection",
      value: Math.round(animatedValues.privacyScore),
      unit: "%",
      icon: Shield,
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-950/20",
      description: "Enterprise-grade privacy preservation",
      target: 95
    },
    {
      title: "Cost Optimization", 
      value: Math.round(animatedValues.costSavings),
      unit: "%",
      icon: DollarSign,
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950/20", 
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

  const businessHighlights = investorMetrics?.business_insights || {
    key_differentiators: [
      "Zero-trust architecture - no single provider sees complete data",
      "AI-powered cost optimization saves 60%+ on LLM costs", 
      "Enterprise-grade performance with <2s response times",
      "Regulatory compliance built-in for global markets"
    ],
    investment_highlights: [
      "Proprietary privacy-preserving technology",
      "Proven cost savings in production environments",
      "Scalable SaaS model with high gross margins", 
      "Strong IP portfolio and regulatory moats"
    ],
    market_validation: {
      target_customers: "Fortune 500 enterprises in regulated industries",
      market_size: "$2.3B TAM, $450M SAM",
      growth_rate: "340% YoY in privacy-tech market",
      early_traction: "3 enterprise pilots, $1.2M ARR pipeline"
    }
  };

  const complianceStandards = [
    { name: "GDPR", status: "compliant", score: 98 },
    { name: "HIPAA", status: "compliant", score: 96 },
    { name: "SOC 2", status: "compliant", score: 94 },
    { name: "ISO 27001", status: "in_progress", score: 87 }
  ];

  return (
    <div className="space-y-6">
      {/* Executive KPI Dashboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Executive Performance Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {keyMetrics.map((metric, index) => (
              <motion.div
                key={metric.title}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className={`p-4 rounded-lg border ${metric.bgColor}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <metric.icon className={`h-5 w-5 ${metric.color}`} />
                  <Badge variant="outline" className="text-xs">
                    Target: {metric.target}{metric.unit}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <div className={`text-2xl font-bold ${metric.color}`}>
                    {metric.value}{metric.unit}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {metric.description}
                  </div>
                  <Progress 
                    value={(metric.value / metric.target) * 100} 
                    className="h-2"
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Business Intelligence Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Market Opportunity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Market Opportunity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">$2.3B</div>
                <div className="text-sm text-muted-foreground">Total Addressable Market</div>
              </div>
              <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <div className="text-2xl font-bold text-green-600">340%</div>
                <div className="text-sm text-muted-foreground">YoY Growth Rate</div>
              </div>
            </div>
            <Separator />
            <div>
              <h4 className="font-semibold mb-2">Target Customers</h4>
              <p className="text-sm text-muted-foreground">
                {businessHighlights.market_validation.target_customers}
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Early Traction</h4>
              <p className="text-sm text-muted-foreground">
                {businessHighlights.market_validation.early_traction}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Compliance & Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Compliance & Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {complianceStandards.map((standard, index) => (
                <div key={standard.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className={`h-4 w-4 ${
                      standard.status === 'compliant' ? 'text-green-600' : 'text-yellow-600'
                    }`} />
                    <span className="font-medium">{standard.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{standard.score}%</span>
                    <Badge variant={standard.status === 'compliant' ? 'default' : 'secondary'}>
                      {standard.status === 'compliant' ? 'Compliant' : 'In Progress'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            <Separator />
            <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <div className="text-lg font-bold text-green-600">Enterprise Ready</div>
              <div className="text-sm text-muted-foreground">Global regulatory compliance</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Competitive Advantages */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Competitive Advantages
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Key Differentiators
              </h4>
              <ul className="space-y-2">
                {businessHighlights.key_differentiators.map((item, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Investment Highlights
              </h4>
              <ul className="space-y-2">
                {businessHighlights.investment_highlights.map((item, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <DollarSign className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
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
          <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                <div>
                  <div className="font-semibold text-blue-700">Live Demo Active</div>
                  <div className="text-xs text-blue-600">Generating investor metrics...</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}