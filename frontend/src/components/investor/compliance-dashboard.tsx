"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  Shield, 
  CheckCircle, 
  Lock, 
  Eye, 
  FileCheck,
  Globe,
  Key,
  Server,
  UserCheck,
  AlertTriangle,
  Download,
  ExternalLink,
  Fingerprint,
  ShieldCheck
} from "lucide-react";
import { motion } from "framer-motion";

interface ComplianceItem {
  id: string;
  name: string;
  description: string;
  status: "compliant" | "in-progress" | "planned";
  completionPercentage: number;
  lastAudit?: Date;
  certificationBody?: string;
  documentUrl?: string;
}

interface SecurityFeature {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  enabled: boolean;
}

const complianceItems: ComplianceItem[] = [
  {
    id: "gdpr",
    name: "GDPR Compliance",
    description: "General Data Protection Regulation - EU privacy law",
    status: "compliant",
    completionPercentage: 100,
    lastAudit: new Date("2024-01-15"),
    certificationBody: "EU Data Protection Authority",
    documentUrl: "#"
  },
  {
    id: "hipaa",
    name: "HIPAA Compliance",
    description: "Health Insurance Portability and Accountability Act",
    status: "compliant",
    completionPercentage: 100,
    lastAudit: new Date("2024-02-01"),
    certificationBody: "HIPAA Compliance Associates",
    documentUrl: "#"
  },
  {
    id: "soc2",
    name: "SOC 2 Type II",
    description: "Service Organization Control 2 - Security, Availability, Confidentiality",
    status: "compliant",
    completionPercentage: 100,
    lastAudit: new Date("2023-12-10"),
    certificationBody: "Deloitte & Touche LLP",
    documentUrl: "#"
  },
  {
    id: "iso27001",
    name: "ISO 27001",
    description: "International standard for information security management",
    status: "in-progress",
    completionPercentage: 85,
    lastAudit: new Date("2024-01-20"),
    certificationBody: "BSI Group",
  },
  {
    id: "ccpa",
    name: "CCPA Compliance",
    description: "California Consumer Privacy Act",
    status: "compliant",
    completionPercentage: 100,
    lastAudit: new Date("2024-01-05"),
    certificationBody: "California Privacy Protection Agency",
    documentUrl: "#"
  },
  {
    id: "pci-dss",
    name: "PCI DSS Level 1",
    description: "Payment Card Industry Data Security Standard",
    status: "planned",
    completionPercentage: 40,
    certificationBody: "PCI Security Standards Council",
  },
];

const securityFeatures: SecurityFeature[] = [
  {
    id: "e2e-encryption",
    name: "End-to-End Encryption",
    description: "All data encrypted in transit and at rest using AES-256",
    icon: Lock,
    enabled: true,
  },
  {
    id: "zero-trust",
    name: "Zero Trust Architecture",
    description: "Never trust, always verify - continuous authentication",
    icon: Shield,
    enabled: true,
  },
  {
    id: "data-fragmentation",
    name: "Query Fragmentation",
    description: "Automatic PII detection and fragmentation across providers",
    icon: Eye,
    enabled: true,
  },
  {
    id: "audit-logging",
    name: "Comprehensive Audit Logs",
    description: "Immutable audit trail of all system activities",
    icon: FileCheck,
    enabled: true,
  },
  {
    id: "geo-restriction",
    name: "Geographic Data Restrictions",
    description: "Enforce data residency requirements by region",
    icon: Globe,
    enabled: true,
  },
  {
    id: "key-management",
    name: "HSM Key Management",
    description: "Hardware Security Module for cryptographic key storage",
    icon: Key,
    enabled: true,
  },
  {
    id: "ddos-protection",
    name: "DDoS Protection",
    description: "Multi-layer protection against distributed attacks",
    icon: Server,
    enabled: true,
  },
  {
    id: "mfa",
    name: "Multi-Factor Authentication",
    description: "Enforce MFA for all user and service accounts",
    icon: UserCheck,
    enabled: true,
  },
  {
    id: "biometric",
    name: "Biometric Authentication",
    description: "Support for fingerprint and facial recognition",
    icon: Fingerprint,
    enabled: false,
  },
];

const statusConfig = {
  compliant: {
    color: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-950/20",
    borderColor: "border-green-200 dark:border-green-800",
    badge: "default",
  },
  "in-progress": {
    color: "text-yellow-600",
    bgColor: "bg-yellow-50 dark:bg-yellow-950/20",
    borderColor: "border-yellow-200 dark:border-yellow-800",
    badge: "secondary",
  },
  planned: {
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-950/20",
    borderColor: "border-blue-200 dark:border-blue-800",
    badge: "outline",
  },
};

export function ComplianceDashboard() {
  const compliantCount = complianceItems.filter(item => item.status === "compliant").length;
  const inProgressCount = complianceItems.filter(item => item.status === "in-progress").length;
  const plannedCount = complianceItems.filter(item => item.status === "planned").length;
  const enabledSecurityFeatures = securityFeatures.filter(f => f.enabled).length;

  const overallComplianceScore = Math.round(
    complianceItems.reduce((sum, item) => sum + item.completionPercentage, 0) / complianceItems.length
  );

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-8 w-8 text-primary" />
          <h2 className="text-2xl font-bold tracking-tight">Compliance & Security</h2>
        </div>
        <p className="text-muted-foreground">
          Enterprise-grade security and compliance certifications for regulated industries
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-green-50 dark:bg-green-950/20">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <p className="text-sm text-muted-foreground">Compliant</p>
              </div>
              <p className="text-3xl font-bold">{compliantCount}</p>
              <p className="text-xs text-muted-foreground">Certifications achieved</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-yellow-50 dark:bg-yellow-950/20">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                </div>
                <p className="text-sm text-muted-foreground">In Progress</p>
              </div>
              <p className="text-3xl font-bold">{inProgressCount}</p>
              <p className="text-xs text-muted-foreground">Currently pursuing</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/20">
                  <Shield className="h-5 w-5 text-purple-600" />
                </div>
                <p className="text-sm text-muted-foreground">Security Score</p>
              </div>
              <p className="text-3xl font-bold">{overallComplianceScore}%</p>
              <p className="text-xs text-muted-foreground">Overall compliance</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                  <Lock className="h-5 w-5 text-blue-600" />
                </div>
                <p className="text-sm text-muted-foreground">Security Features</p>
              </div>
              <p className="text-3xl font-bold">{enabledSecurityFeatures}/{securityFeatures.length}</p>
              <p className="text-xs text-muted-foreground">Features enabled</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Certifications */}
      <Card>
        <CardHeader>
          <CardTitle>Compliance Certifications</CardTitle>
          <CardDescription>
            Industry standards and regulatory compliance status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {complianceItems.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-4 rounded-lg border ${statusConfig[item.status].bgColor} ${statusConfig[item.status].borderColor}`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CheckCircle className={`h-5 w-5 ${statusConfig[item.status].color}`} />
                      <div>
                        <h4 className="font-semibold">{item.name}</h4>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={statusConfig[item.status].badge as any}>
                        {item.status === "compliant" ? "Certified" : 
                         item.status === "in-progress" ? "In Progress" : "Planned"}
                      </Badge>
                      {item.documentUrl && (
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Completion</span>
                      <span className="text-sm font-medium">{item.completionPercentage}%</span>
                    </div>
                    <Progress value={item.completionPercentage} className="h-2" />
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="space-y-1">
                      {item.certificationBody && (
                        <p className="text-muted-foreground">
                          Certified by: <span className="font-medium">{item.certificationBody}</span>
                        </p>
                      )}
                      {item.lastAudit && (
                        <p className="text-muted-foreground">
                          Last audit: <span className="font-medium">
                            {item.lastAudit.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </p>
                      )}
                    </div>
                    {item.status === "compliant" && item.documentUrl && (
                      <Button size="sm" variant="link" className="text-xs">
                        View Certificate
                        <ExternalLink className="ml-1 h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Security Features */}
      <Card>
        <CardHeader>
          <CardTitle>Security Features</CardTitle>
          <CardDescription>
            Advanced security measures protecting your data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {securityFeatures.map((feature, index) => (
              <motion.div
                key={feature.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`p-4 rounded-lg border ${feature.enabled ? 
                  'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' : 
                  'bg-gray-50 dark:bg-gray-950/20 border-gray-200 dark:border-gray-800'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${feature.enabled ? 
                    'bg-green-100 dark:bg-green-900/50' : 
                    'bg-gray-100 dark:bg-gray-900/50'
                  }`}>
                    <feature.icon className={`h-5 w-5 ${feature.enabled ? 
                      'text-green-600' : 'text-gray-500'
                    }`} />
                  </div>
                  <div className="flex-1 space-y-1">
                    <h4 className="font-medium text-sm">{feature.name}</h4>
                    <p className="text-xs text-muted-foreground">{feature.description}</p>
                    <Badge 
                      variant={feature.enabled ? "default" : "secondary"} 
                      className="text-xs"
                    >
                      {feature.enabled ? "Active" : "Coming Soon"}
                    </Badge>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Trust Center */}
      <Card className="border-primary">
        <CardHeader>
          <CardTitle>Trust Center</CardTitle>
          <CardDescription>
            Access all compliance documentation and security reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold">Download Complete Compliance Package</p>
                <p className="text-sm text-muted-foreground">
                  All certifications, audit reports, and security documentation
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button>
                Access Trust Center
              </Button>
              <Button variant="outline">
                Schedule Security Review
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}