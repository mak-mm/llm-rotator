"use client";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Moon, Sun, Shield, Cpu, Activity, Building2, BarChart3 } from "lucide-react";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export function Header() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Shield className="h-8 w-8 text-primary" />
              <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-background animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">LLM Model Rotator</h2>
              <p className="text-xs text-muted-foreground">Privacy-Preserving PoC</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Navigation Links */}
            <nav className="hidden md:flex items-center gap-2">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  Query Interface
                </Button>
              </Link>
              <Link href="/investor">
                <Button variant="ghost" size="sm" className="gap-2">
                  <Building2 className="h-4 w-4" />
                  Investor Hub
                  <Badge variant="secondary" className="ml-1 text-xs">New</Badge>
                </Button>
              </Link>
            </nav>

            {/* Status Indicators */}
            <div className="hidden lg:flex items-center gap-4 border-l pl-4">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">3 Providers</span>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Online</span>
              </div>
            </div>

            {/* Theme Toggle */}
            <div className="flex items-center gap-2">
              <Sun className="h-4 w-4" />
              <Switch
                checked={theme === "dark"}
                onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
              />
              <Moon className="h-4 w-4" />
            </div>

            {/* Settings Button */}
            <Button variant="outline" size="sm">
              Settings
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}