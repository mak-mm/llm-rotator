"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Wifi, 
  WifiOff, 
  Loader2, 
  AlertTriangle,
  RefreshCw 
} from "lucide-react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { motion } from "framer-motion";

interface RealTimeIndicatorProps {
  variant?: "badge" | "full" | "minimal";
  showReconnectButton?: boolean;
}

export function RealTimeIndicator({ 
  variant = "badge", 
  showReconnectButton = true 
}: RealTimeIndicatorProps) {
  const { 
    isConnected, 
    connectionError, 
    connect, 
    reconnectAttempts, 
    maxReconnectAttempts 
  } = useWebSocket();

  const getStatusColor = () => {
    if (isConnected) return "text-green-500";
    if (connectionError) return "text-red-500";
    return "text-yellow-500";
  };

  const getStatusIcon = () => {
    if (isConnected) return <Wifi className="h-4 w-4" />;
    if (connectionError) return <WifiOff className="h-4 w-4" />;
    return <Loader2 className="h-4 w-4 animate-spin" />;
  };

  const getStatusText = () => {
    if (isConnected) return "Real-time";
    if (connectionError) return "Disconnected";
    return "Connecting...";
  };

  const getStatusDescription = () => {
    if (isConnected) return "Live updates enabled";
    if (connectionError) return `Connection failed (${reconnectAttempts}/${maxReconnectAttempts} attempts)`;
    return "Establishing real-time connection...";
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
              variant={isConnected ? "default" : connectionError ? "destructive" : "secondary"}
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
        variant={isConnected ? "default" : connectionError ? "destructive" : "secondary"}
        className="flex items-center gap-1.5"
      >
        {getStatusIcon()}
        <span className="text-xs">{getStatusText()}</span>
      </Badge>
      
      {connectionError && showReconnectButton && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                onClick={connect}
                className="h-6 px-2"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Retry connection</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      
      <div className="text-xs text-muted-foreground">
        {getStatusDescription()}
      </div>
    </div>
  );
}