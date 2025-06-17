"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { 
  Calculator, 
  TrendingUp, 
  DollarSign, 
  Percent,
  Users,
  BarChart3,
  ArrowUp,
  ArrowDown,
  Building2
} from "lucide-react";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";

interface CalculatorInputs {
  monthlyQueries: number;
  averageQueryComplexity: number; // 1-10
  currentLLMCost: number; // per 1K queries
  teamSize: number;
  complianceRequired: boolean;
}

interface ROIResults {
  currentMonthlyCost: number;
  ourMonthlyCost: number;
  monthlySavings: number;
  annualSavings: number;
  roiPercentage: number;
  paybackPeriod: number; // in months
  privacyValue: number; // estimated value of privacy preservation
  complianceValue: number; // estimated value of compliance features
}

export function ROICalculator() {
  const [inputs, setInputs] = useState<CalculatorInputs>({
    monthlyQueries: 10000,
    averageQueryComplexity: 5,
    currentLLMCost: 2.5, // $2.50 per 1K queries
    teamSize: 10,
    complianceRequired: true,
  });

  const [results, setResults] = useState<ROIResults | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Calculate ROI whenever inputs change
  useEffect(() => {
    calculateROI();
  }, [inputs]);

  const calculateROI = () => {
    // Current costs (traditional single LLM approach)
    const queriesInThousands = inputs.monthlyQueries / 1000;
    const complexityMultiplier = 1 + (inputs.averageQueryComplexity - 5) * 0.2;
    const currentMonthlyCost = queriesInThousands * inputs.currentLLMCost * complexityMultiplier;

    // Our costs (fragmented approach)
    // Base cost is 40% less due to intelligent routing
    const baseCostReduction = 0.6;
    // Additional 15% reduction for simple queries routed to cheaper models
    const routingEfficiency = inputs.averageQueryComplexity < 5 ? 0.85 : 1;
    const ourMonthlyCost = currentMonthlyCost * baseCostReduction * routingEfficiency;

    // Privacy and compliance value
    const privacyValuePerQuery = 0.001; // $0.001 per query for privacy preservation
    const privacyValue = inputs.monthlyQueries * privacyValuePerQuery;

    const complianceValue = inputs.complianceRequired ? 
      inputs.teamSize * 50 : // $50 per team member per month in compliance savings
      0;

    // Total savings
    const monthlySavings = currentMonthlyCost - ourMonthlyCost + privacyValue + complianceValue;
    const annualSavings = monthlySavings * 12;

    // ROI calculation
    const implementationCost = 5000; // One-time setup cost
    const roiPercentage = ((annualSavings - implementationCost) / implementationCost) * 100;
    const paybackPeriod = implementationCost / monthlySavings;

    setResults({
      currentMonthlyCost,
      ourMonthlyCost,
      monthlySavings,
      annualSavings,
      roiPercentage,
      paybackPeriod,
      privacyValue,
      complianceValue,
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("en-US").format(Math.round(value));
  };

  // Data for charts
  const savingsOverTime = results ? Array.from({ length: 12 }, (_, i) => ({
    month: `Month ${i + 1}`,
    traditional: Math.round(results.currentMonthlyCost * (i + 1)),
    ourPlatform: Math.round(results.ourMonthlyCost * (i + 1)),
    savings: Math.round(results.monthlySavings * (i + 1)),
  })) : [];

  const costBreakdown = results ? [
    { name: "API Costs", value: results.ourMonthlyCost * 0.7, color: "#3b82f6" },
    { name: "Infrastructure", value: results.ourMonthlyCost * 0.2, color: "#10b981" },
    { name: "Support", value: results.ourMonthlyCost * 0.1, color: "#f59e0b" },
  ] : [];

  const valueBreakdown = results ? [
    { category: "Cost Savings", value: results.currentMonthlyCost - results.ourMonthlyCost },
    { category: "Privacy Value", value: results.privacyValue },
    { category: "Compliance Value", value: results.complianceValue },
  ] : [];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Calculator className="h-8 w-8 text-primary" />
          <h2 className="text-2xl font-bold tracking-tight">ROI Calculator</h2>
        </div>
        <p className="text-muted-foreground">
          Calculate your potential savings and return on investment with our privacy-preserving LLM platform
        </p>
      </div>

      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle>Your Current Usage</CardTitle>
          <CardDescription>
            Enter your current LLM usage metrics to calculate potential savings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="monthlyQueries">Monthly Queries</Label>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="monthlyQueries"
                  type="number"
                  value={inputs.monthlyQueries}
                  onChange={(e) => setInputs({ ...inputs, monthlyQueries: parseInt(e.target.value) || 0 })}
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Average number of LLM queries per month
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="currentCost">Current Cost per 1K Queries</Label>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="currentCost"
                  type="number"
                  step="0.1"
                  value={inputs.currentLLMCost}
                  onChange={(e) => setInputs({ ...inputs, currentLLMCost: parseFloat(e.target.value) || 0 })}
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Your current average cost per 1000 queries
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="complexity">Average Query Complexity</Label>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Simple</span>
                  <span className="text-sm font-medium">{inputs.averageQueryComplexity}/10</span>
                  <span className="text-sm text-muted-foreground">Complex</span>
                </div>
                <Slider
                  id="complexity"
                  min={1}
                  max={10}
                  step={1}
                  value={[inputs.averageQueryComplexity]}
                  onValueChange={(value) => setInputs({ ...inputs, averageQueryComplexity: value[0] })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="teamSize">Team Size</Label>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="teamSize"
                  type="number"
                  value={inputs.teamSize}
                  onChange={(e) => setInputs({ ...inputs, teamSize: parseInt(e.target.value) || 0 })}
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Number of team members using the platform
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="compliance"
              checked={inputs.complianceRequired}
              onChange={(e) => setInputs({ ...inputs, complianceRequired: e.target.checked })}
              className="rounded"
            />
            <Label htmlFor="compliance" className="text-sm font-normal cursor-pointer">
              Compliance requirements (GDPR, HIPAA, SOC2)
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Results Section */}
      {results && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Monthly Savings</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(results.monthlySavings)}
                    </p>
                    <ArrowUp className="h-5 w-5 text-green-600" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {((results.monthlySavings / results.currentMonthlyCost) * 100).toFixed(0)}% reduction
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Annual Savings</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(results.annualSavings)}
                    </p>
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    First year savings
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">ROI</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold text-primary">
                      {results.roiPercentage.toFixed(0)}%
                    </p>
                    <Percent className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Return on investment
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Payback Period</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold">
                      {results.paybackPeriod.toFixed(1)}
                    </p>
                    <span className="text-lg">months</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Time to break even
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Savings Over Time Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Cost Comparison Over 12 Months</CardTitle>
              <CardDescription>
                Traditional LLM costs vs. our privacy-preserving platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={savingsOverTime}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" tickFormatter={(value) => `$${value / 1000}k`} />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="traditional" 
                      stackId="1"
                      stroke="#ef4444" 
                      fill="#fee2e2" 
                      name="Traditional Costs"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="ourPlatform" 
                      stackId="2"
                      stroke="#10b981" 
                      fill="#d1fae5" 
                      name="Our Platform"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Value Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Cost Breakdown</CardTitle>
                <CardDescription>
                  Where your investment goes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={costBreakdown}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name}: ${formatCurrency(entry.value)}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {costBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Value Generation</CardTitle>
                <CardDescription>
                  Additional value beyond cost savings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={valueBreakdown} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" className="text-xs" tickFormatter={(value) => formatCurrency(value)} />
                      <YAxis type="category" dataKey="category" className="text-xs" />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Bar dataKey="value" fill="#3b82f6" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Business Impact */}
          <Card>
            <CardHeader>
              <CardTitle>Business Impact Summary</CardTitle>
              <CardDescription>
                Key benefits for your organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    <h4 className="font-semibold">Cost Efficiency</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {((1 - results.ourMonthlyCost / results.currentMonthlyCost) * 100).toFixed(0)}% reduction in LLM costs through intelligent routing and fragmentation
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-blue-600" />
                    <h4 className="font-semibold">Privacy Protection</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Worth {formatCurrency(results.privacyValue * 12)} annually in reduced data breach risk
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-purple-600" />
                    <h4 className="font-semibold">Compliance Ready</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {inputs.complianceRequired ? 
                      `Save ${formatCurrency(results.complianceValue * 12)} annually on compliance costs` :
                      "Enable compliance features when needed"
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CTA */}
          <Card className="border-primary">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold">Ready to Save {formatCurrency(results.annualSavings)}?</h3>
                  <p className="text-sm text-muted-foreground">
                    Start your privacy-first LLM journey today
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="lg">
                    Schedule Demo
                  </Button>
                  <Button size="lg" variant="outline">
                    Download Report
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}