"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ROICalculator } from "@/components/investor/roi-calculator";
import { ComplianceDashboard } from "@/components/investor/compliance-dashboard";
import { AnalyticsDashboard } from "@/components/investor/analytics-dashboard";
import { ExecutiveDashboard } from "@/components/investor/executive-dashboard";
import { motion } from "framer-motion";
import { 
  Calculator, 
  Shield, 
  BarChart3, 
  Briefcase,
  Sparkles,
  Building2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function InvestorPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Building2 className="h-10 w-10 text-primary" />
            <div>
              <h1 className="text-4xl font-bold tracking-tight">Investor Hub</h1>
              <p className="text-lg text-muted-foreground mt-2">
                Comprehensive insights into our privacy-preserving LLM platform
              </p>
            </div>
          </div>
          
          {/* Value Propositions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="p-4 border rounded-lg bg-gradient-to-br from-blue-50 to-transparent dark:from-blue-950/20">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold">40% Cost Reduction</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Intelligent query routing reduces LLM costs dramatically
              </p>
            </div>
            <div className="p-4 border rounded-lg bg-gradient-to-br from-green-50 to-transparent dark:from-green-950/20">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-5 w-5 text-green-600" />
                <h3 className="font-semibold">Enterprise Security</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                SOC 2, HIPAA, GDPR compliant with zero-trust architecture
              </p>
            </div>
            <div className="p-4 border rounded-lg bg-gradient-to-br from-purple-50 to-transparent dark:from-purple-950/20">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="h-5 w-5 text-purple-600" />
                <h3 className="font-semibold">$18.7B Market</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Rapidly growing TAM with 127 enterprise customers
              </p>
            </div>
          </div>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="executive" className="space-y-6">
          <TabsList className="grid grid-cols-4 w-full max-w-2xl mx-auto">
            <TabsTrigger value="executive" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              <span className="hidden sm:inline">Executive</span>
            </TabsTrigger>
            <TabsTrigger value="roi" className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              <span className="hidden sm:inline">ROI</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="compliance" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Compliance</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="executive" className="space-y-6">
            <ExecutiveDashboard />
          </TabsContent>

          <TabsContent value="roi" className="space-y-6">
            <ROICalculator />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <AnalyticsDashboard />
          </TabsContent>

          <TabsContent value="compliance" className="space-y-6">
            <ComplianceDashboard />
          </TabsContent>
        </Tabs>

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 p-8 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-2xl border border-primary/20"
        >
          <div className="text-center space-y-4">
            <Badge className="mb-2">Limited Time Offer</Badge>
            <h2 className="text-3xl font-bold">Ready to Transform Your LLM Strategy?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Join 127 enterprise customers saving millions while ensuring data privacy.
              Schedule a personalized demo with our solutions team.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-6">
              <button className="px-8 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors">
                Schedule Enterprise Demo
              </button>
              <button className="px-8 py-3 border border-primary text-primary rounded-lg font-semibold hover:bg-primary/10 transition-colors">
                Download Investment Deck
              </button>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              🔒 Your information is secure and will never be shared
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}