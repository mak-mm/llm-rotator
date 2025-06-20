"use client";

import { Cpu, Activity, BarChart3, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";

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
    <header className="border-b border-gray-200 dark:border-white/10 bg-white/95 dark:bg-black/95 backdrop-blur-xl sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-end">
          {/* Status Indicators */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-blue-400" />
              <span className="text-sm text-gray-700 dark:text-white/80">3 Providers</span>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-green-400" />
              <span className="text-sm text-gray-700 dark:text-white/80">Online</span>
            </div>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-purple-400" />
              <span className="text-sm text-gray-700 dark:text-white/80">Ready</span>
            </div>
            
            {/* Theme Toggle */}
            <div className="flex items-center gap-2 ml-6">
              <Sun className="h-4 w-4 text-gray-600 dark:text-white/60" />
              <Switch
                checked={theme === 'dark'}
                onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                className="data-[state=checked]:bg-blue-500"
              />
              <Moon className="h-4 w-4 text-gray-600 dark:text-white/60" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}