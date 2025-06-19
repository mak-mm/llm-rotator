"use client";

import { Badge } from "@/components/ui/badge";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Wifi, 
  Activity
} from "lucide-react";
import { motion } from "framer-motion";

interface RealTimeIndicatorProps {
  variant?: "badge" | "full" | "minimal";
  isConnected?: boolean;
}

export function RealTimeIndicator({ 
  variant = "badge", 
  isConnected = true 
}: RealTimeIndicatorProps) {

  const getStatusColor = () => {
    return isConnected ? "text-green-500" : "text-gray-400";
  };

  const getStatusIcon = () => {
    return isConnected ? <Activity className="h-4 w-4" /> : <Wifi className="h-4 w-4" />;
  };

  const getStatusText = () => {
    return isConnected ? "Real-time" : "Offline";
  };

  const getStatusDescription = () => {
    return isConnected ? "Live updates enabled via SSE" : "Real-time updates disabled";
  };

  if (variant === "minimal") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <motion.div
              animate={{ scale: isConnected ? [1, 1.1, 1] : 1 }}
              transition={{ duration: 2, repeat: isConnected ? Infinity : 0 }}
              className={`flex items-center ${getStatusColor()}`}
            >
              {getStatusIcon()}
            </motion.div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{getStatusDescription()}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (variant === "badge") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge 
              variant={isConnected ? "default" : "secondary"}
              className="flex items-center gap-1.5"
            >
              {getStatusIcon()}
              <span className="text-xs">{getStatusText()}</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>{getStatusDescription()}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Full variant
  return (
    <div className="flex items-center gap-2">
      <Badge 
        variant={isConnected ? "default" : "secondary"}
        className="flex items-center gap-1.5"
      >
        {getStatusIcon()}
        <span className="text-xs">{getStatusText()}</span>
      </Badge>
      
      <div className="text-xs text-muted-foreground">
        {getStatusDescription()}
      </div>
    </div>
  );
}