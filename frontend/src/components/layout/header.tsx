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
    <header className="border-b border-white/10 bg-black/95 backdrop-blur-xl sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-400 rounded-full border-2 border-black animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-light text-white">Privacy-Preserving AI</h2>
              <p className="text-xs text-white/60">Enterprise Query Fragmentation</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Status Indicators */}
            <div className="hidden lg:flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-blue-400" />
                <span className="text-sm text-white/80">3 Providers</span>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-green-400" />
                <span className="text-sm text-white/80">Online</span>
              </div>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-purple-400" />
                <span className="text-sm text-white/80">Ready</span>
              </div>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-2">
              <Link href="/">
                <button className="px-3 py-1.5 text-sm text-white/80 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-all">
                  Query Interface
                </button>
              </Link>
              <Link href="/investor">
                <button className="px-3 py-1.5 text-sm text-white/80 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-all flex items-center gap-2">
                  <Building2 className="h-3 w-3" />
                  Investor Hub
                  <Badge className="ml-1 text-xs bg-purple-500/20 text-purple-300 border-purple-500/30">New</Badge>
                </button>
              </Link>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}