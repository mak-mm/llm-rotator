"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '@/components/ui/dialog';
import { motion } from 'framer-motion';
import { Send, Shield, Brain, Zap, MessageCircle, ArrowRight } from 'lucide-react';
import { useQuery } from '@/contexts/query-context';
import { useAnalyzeQuery } from '@/hooks/useQuery';
import { useSSEContext } from '@/contexts/sse-context';
import { toast } from 'sonner';
import type { AnalyzeRequest } from '@/lib/api';

interface NewChatModalProps {
  children: React.ReactNode;
}

const CONVERSATION_STARTERS = [
  {
    category: "Healthcare",
    title: "Patient Medical Analysis",
    preview: "Analyze symptoms and recommend treatment for a patient with sensitive medical data...",
    query: "My patient Sarah Rodriguez (DOB: 03/15/1978, SSN: 987-65-4321, Phone: 555-123-4567, Email: sarah.rodriguez@email.com, Address: 123 Main St, Boston MA 02101) presented with severe chest pain and shortness of breath. Her medical record number is MRN-2024-7890. She has a history of Type 2 Diabetes (diagnosed 2018, HbA1c: 8.2%) and Hypertension (current BP: 165/95, on Lisinopril 20mg daily). Insurance: BlueCross BlueShield Policy #BC-789456123. Emergency contact: Maria Rodriguez (daughter) at 555-987-6543. Current medications include Metformin 1000mg BID, Atorvastatin 40mg daily. What diagnostic workup and treatment plan would you recommend for this acute presentation?",
    icon: "🏥",
    sensitivity: "high",
    color: "from-red-500/20 to-pink-500/20"
  },
  {
    category: "Financial",
    title: "Investment Portfolio Review",
    preview: "Get advice on investment strategies while protecting your account details...",
    query: "Can you help me analyze the investment strategy for my portfolio? My account number is 4532-1234-5678-9012 and I'm interested in crypto investments. What allocation would you recommend?",
    icon: "💰",
    sensitivity: "medium",
    color: "from-yellow-500/20 to-orange-500/20"
  },
  {
    category: "Technical",
    title: "Secure Code Review",
    preview: "Get coding help while keeping your API keys and sensitive code protected...",
    query: "I need to implement user authentication in my React app. Here's my current API key: sk-1234567890abcdef. What's the best approach for secure authentication?",
    icon: "💻",
    sensitivity: "medium",
    color: "from-blue-500/20 to-purple-500/20"
  },
  {
    category: "Legal",
    title: "Contract Analysis",
    preview: "Review legal documents while protecting client confidential information...",
    query: "I'm reviewing a contract for client Maria Rodriguez (email: maria.rodriguez@email.com, phone: 555-123-4567). What key clauses should I focus on for risk assessment?",
    icon: "⚖️",
    sensitivity: "medium",
    color: "from-purple-500/20 to-indigo-500/20"
  },
  {
    category: "General",
    title: "AI Research Discussion",
    preview: "Explore the latest in artificial intelligence and machine learning...",
    query: "What are the latest developments in artificial intelligence and machine learning? I'm particularly interested in transformer architectures and their applications.",
    icon: "🤖",
    sensitivity: "low",
    color: "from-green-500/20 to-teal-500/20"
  },
  {
    category: "Research",
    title: "Academic Research Help",
    preview: "Get research assistance while protecting your institutional information...",
    query: "I'm working on a research paper about climate change impacts. My university ID is UC-2024-789 and I need recent peer-reviewed sources on carbon emission trends.",
    icon: "📚",
    sensitivity: "low",
    color: "from-teal-500/20 to-cyan-500/20"
  }
];

export function NewChatModal({ children }: NewChatModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [queryText, setQueryText] = useState('');
  const [selectedStarter, setSelectedStarter] = useState<number | null>(null);
  
  const { setActiveRequestId } = useSSEContext();
  const { 
    setCurrentQuery, 
    setIsProcessing,
    setShowProcessingOverlay,
    isProcessing,
    resetInvestorData,
    setRequestId,
  } = useQuery();
  
  const analyzeMutation = useAnalyzeQuery();

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setQueryText('');
      setSelectedStarter(null);
    }
  }, [isOpen]);

  const handleStarterClick = (index: number, query: string) => {
    setSelectedStarter(index);
    setQueryText(query);
  };

  const handleSubmit = async () => {
    if (!queryText.trim()) {
      toast.error("Please enter a message");
      return;
    }

    const request: AnalyzeRequest = {
      query: queryText.trim(),
      strategy: "hybrid",
      use_orchestrator: true,
    };

    try {
      setCurrentQuery(queryText.trim());
      setIsProcessing(true);
      setShowProcessingOverlay(true);
      
      const initialResponse = await analyzeMutation.mutateAsync(request);
      
      resetInvestorData();
      setRequestId(initialResponse.request_id);
      setActiveRequestId(initialResponse.request_id);
      
      // Close the chat interface
      setIsOpen(false);
      
    } catch (error) {
      console.error('Chat submission failed:', error);
      setIsProcessing(false);
      setShowProcessingOverlay(false);
      setActiveRequestId(null);
      toast.error('Failed to start chat');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isProcessing) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-black/95 backdrop-blur-xl border-white/10">
        <DialogTitle className="sr-only">Start a new conversation</DialogTitle>
        <div className="relative">
          {/* Simple Input Header */}
          <div className="mb-8">
            <input
              type="text"
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  // This will trigger the transition to full chat mode
                  setQueryText(queryText + '\n');
                }
              }}
              placeholder="Start a new conversation"
              className="w-full p-4 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
              disabled={analyzeMutation.isPending || isProcessing}
              autoFocus
            />
          </div>

          {queryText.includes('\n') ? (
            // Chat Input Mode
            <div className="space-y-6">
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-gray-500 to-gray-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm font-medium">You</span>
                  </div>
                  <div className="flex-1">
                    <textarea
                      value={queryText}
                      onChange={(e) => setQueryText(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type your message..."
                      className="w-full min-h-[100px] bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 border border-gray-200 dark:border-gray-600 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      disabled={analyzeMutation.isPending || isProcessing}
                      autoFocus
                    />
                  </div>
                </div>
                
                <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/10">
                  <button
                    onClick={() => setQueryText('')}
                    className="text-xs text-white/40 hover:text-white/60 transition-colors"
                  >
                    Clear message
                  </button>
                  
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-white/40">
                      Press Enter to send
                    </span>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleSubmit}
                      disabled={analyzeMutation.isPending || isProcessing || !queryText.trim()}
                      className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg text-white flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
                    >
                      <Send className="w-4 h-4" />
                      {(analyzeMutation.isPending || isProcessing) ? 'Sending...' : 'Send'}
                    </motion.button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Conversation Starters - always visible unless there's a line break
            <motion.div 
              className="space-y-6"
              animate={{ opacity: queryText.includes('\n') ? 0 : 1 }}
              transition={{ duration: 0.3 }}
            >
              <div>
                <p className="text-xs text-gray-500 dark:text-white/40 text-center mb-6">
                  Or choose a conversation starter from below
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {CONVERSATION_STARTERS.map((starter, index) => (
                  <motion.button
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleStarterClick(index, starter.query)}
                    disabled={analyzeMutation.isPending || isProcessing}
                    className={`p-4 rounded-xl backdrop-blur-md border transition-all text-left group ${starter.color} border-white/10 hover:border-white/20`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="text-2xl">{starter.icon}</div>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          starter.sensitivity === 'high' ? 'bg-red-400' :
                          starter.sensitivity === 'medium' ? 'bg-yellow-400' :
                          'bg-green-400'
                        }`} />
                        <ArrowRight className="w-4 h-4 text-white/40 group-hover:text-white/60 transition-colors" />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-white/90">
                        {starter.title}
                      </div>
                      <div className="text-xs text-white/60 leading-relaxed">
                        {starter.preview}
                      </div>
                      <div className="text-xs text-white/40">
                        {starter.category} • {starter.sensitivity} sensitivity
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
              
              {/* Manual Input Option */}
              <div className="text-center">
                <button
                  onClick={() => setQueryText('')}
                  className="text-sm text-white/60 hover:text-white/80 transition-colors underline decoration-white/20 underline-offset-4"
                >
                  Or start typing your own message
                </button>
              </div>
            </motion.div>
          )}

          {/* Privacy Features */}
          <div className="flex justify-center gap-6 pt-6 mt-6 border-t border-white/10">
            <div className="flex items-center gap-2 text-gray-600 dark:text-white/40">
              <Shield className="w-3 h-3" />
              <span className="text-xs">Privacy Protected</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600 dark:text-white/40">
              <Zap className="w-3 h-3" />
              <span className="text-xs">Instant Fragmentation</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600 dark:text-white/40">
              <Brain className="w-3 h-3" />
              <span className="text-xs">AI-Powered</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}