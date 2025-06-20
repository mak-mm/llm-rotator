"use client";

import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Shield, Zap, DollarSign, Copy, RefreshCw, X, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface QueryResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  query: string;
  response: string;
  metrics?: {
    privacy_score?: number;
    response_quality?: number;
    total_time?: number;
    total_cost?: number;
    fragments_processed?: number;
    providers_used?: number;
  };
  onNewQuery?: () => void;
}

export function QueryResultModal({ 
  isOpen, 
  onClose, 
  query, 
  response, 
  metrics,
  onNewQuery 
}: QueryResultModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(response);
    setCopied(true);
    toast.success('Response copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNewQuery = () => {
    onClose();
    onNewQuery?.();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-black/95 backdrop-blur-xl border-white/10">
        <div className="relative">
          {/* Success Icon */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: "spring" }}
            className="text-center mb-6"
          >
            <div className="w-16 h-16 mx-auto mb-4 relative">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 opacity-20 blur-xl" />
              <div className="relative w-full h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
            </div>
            <h2 className="text-2xl font-light text-white mb-1">
              Privacy-Protected Response
            </h2>
            <p className="text-sm text-white/60 font-light">Your query was successfully processed</p>
          </motion.div>
          {/* Privacy Metrics */}
          {metrics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 text-center">
                <Shield className="h-6 w-6 text-green-400 mx-auto mb-2" />
                <div className="text-xl font-light text-white">
                  {metrics.privacy_score ? `${(metrics.privacy_score * 100).toFixed(0)}%` : 'N/A'}
                </div>
                <p className="text-xs text-white/60 mt-1">Privacy Score</p>
              </div>
              
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 text-center">
                <Zap className="h-6 w-6 text-blue-400 mx-auto mb-2" />
                <div className="text-xl font-light text-white">
                  {metrics.fragments_processed || 0}
                </div>
                <p className="text-xs text-white/60 mt-1">Fragments</p>
              </div>
              
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 text-center">
                <Clock className="h-6 w-6 text-purple-400 mx-auto mb-2" />
                <div className="text-xl font-light text-white">
                  {metrics.total_time ? `${metrics.total_time.toFixed(1)}s` : 'N/A'}
                </div>
                <p className="text-xs text-white/60 mt-1">Time</p>
              </div>
              
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 text-center">
                <DollarSign className="h-6 w-6 text-orange-400 mx-auto mb-2" />
                <div className="text-xl font-light text-white">
                  {metrics.total_cost ? `$${metrics.total_cost.toFixed(4)}` : 'N/A'}
                </div>
                <p className="text-xs text-white/60 mt-1">Cost</p>
              </div>
            </div>
          )}

          {/* Original Query */}
          <div>
            <h3 className="text-xs font-medium text-white/60 mb-2">Your Query</h3>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4">
              <p className="text-sm text-white/80">{query}</p>
            </div>
          </div>

          {/* AI Response */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium text-white/60">AI Response</h3>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleCopy}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/5 backdrop-blur-md border border-white/10 rounded-lg text-white/80 hover:bg-white/10 transition-all text-xs"
              >
                <Copy className="h-3 w-3" />
                {copied ? 'Copied!' : 'Copy'}
              </motion.button>
            </div>
            <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 backdrop-blur-md border border-white/10 rounded-xl p-6">
              <p className="text-sm text-white leading-relaxed whitespace-pre-wrap">
                {response || 'No response available'}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-4 border-t border-white/10">
            <div className="flex items-center gap-3 text-white/40 text-xs">
              <span>{metrics?.providers_used || 0} Providers Used</span>
              <span>•</span>
              <span>Quality: {metrics?.response_quality ? (metrics.response_quality * 100).toFixed(0) : 'N/A'}%</span>
            </div>
            
            <div className="flex gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onClose}
                className="px-4 py-2 bg-white/5 backdrop-blur-md border border-white/10 rounded-lg text-white/80 hover:bg-white/10 transition-all text-sm"
              >
                Close
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleNewQuery}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg text-white flex items-center gap-2 hover:opacity-90 transition-all text-sm"
              >
                <RefreshCw className="h-3 w-3" />
                New Chat
              </motion.button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}