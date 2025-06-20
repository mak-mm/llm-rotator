"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { motion } from 'framer-motion';
import { Send, Shield, Brain, Zap } from 'lucide-react';
import { useQuery } from '@/contexts/query-context';
import { useAnalyzeQuery } from '@/hooks/useQuery';
import { useSSEContext } from '@/contexts/sse-context';
import { toast } from 'sonner';
import type { AnalyzeRequest } from '@/lib/api';

interface NewQueryModalProps {
  children: React.ReactNode;
}

const EXAMPLE_QUERIES = [
  {
    category: "Healthcare",
    query: "My patient Sarah Rodriguez (DOB: 03/15/1978, SSN: 987-65-4321, Phone: 555-123-4567, Email: sarah.rodriguez@email.com, Address: 123 Main St, Boston MA 02101) presented with severe chest pain and shortness of breath. Her medical record number is MRN-2024-7890. She has a history of Type 2 Diabetes (diagnosed 2018, HbA1c: 8.2%) and Hypertension (current BP: 165/95, on Lisinopril 20mg daily). Insurance: BlueCross BlueShield Policy #BC-789456123. Emergency contact: Maria Rodriguez (daughter) at 555-987-6543. Current medications include Metformin 1000mg BID, Atorvastatin 40mg daily. What diagnostic workup and treatment plan would you recommend for this acute presentation?",
    description: "High-sensitivity query with extensive PII - will trigger fragmentation"
  },
  {
    category: "Financial",
    query: "Can you help me analyze the investment strategy for my portfolio? My account number is 4532-1234-5678-9012 and I'm interested in crypto.",
    description: "Includes sensitive account information"
  },
  {
    category: "Technical",
    query: "I need to implement user authentication in my React app. Here's my current API key: sk-1234567890abcdef. What's the best approach?",
    description: "Contains API keys that need protection"
  },
  {
    category: "Legal",
    query: "I'm reviewing a contract for client Maria Rodriguez (email: maria.rodriguez@email.com, phone: 555-123-4567). What clauses should I focus on?",
    description: "Personal contact information included"
  },
  {
    category: "General",
    query: "What are the latest developments in artificial intelligence and machine learning? I'm particularly interested in transformer architectures.",
    description: "No sensitive data - simple query"
  },
  {
    category: "Research",
    query: "I'm working on a research paper about climate change impacts. My university ID is UC-2024-789 and I need recent peer-reviewed sources.",
    description: "Academic context with ID information"
  }
];

export function NewQueryModal({ children }: NewQueryModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [queryText, setQueryText] = useState('');
  
  // Use the same hooks as QueryInterface
  const { setActiveRequestId } = useSSEContext();
  const { 
    setCurrentQuery, 
    setIsProcessing,
    setShowProcessingOverlay,
    isProcessing,
    resetInvestorData,
    setRequestId,
  } = useQuery();
  
  // Hook for API calls
  const analyzeMutation = useAnalyzeQuery();

  const handleExampleClick = (exampleQuery: string) => {
    setQueryText(exampleQuery);
  };

  const handleSubmit = async () => {
    if (!queryText.trim()) {
      toast.error("Please enter a query");
      return;
    }

    const request: AnalyzeRequest = {
      query: queryText.trim(),
      strategy: "hybrid", // Use hybrid strategy by default  
      use_orchestrator: true, // Enable orchestrator for complex queries
    };

    try {
      // Start processing without clearing results yet
      setCurrentQuery(queryText.trim());
      setIsProcessing(true);
      
      // Show full-screen processing overlay
      setShowProcessingOverlay(true);
      
      // Log for debugging
      console.log('🚀 Query submitted from modal, keeping previous visualization until new one starts');

      const initialResponse = await analyzeMutation.mutateAsync(request);
      
      // Now that we have confirmation the query was accepted, reset state
      resetInvestorData();
      
      // Store the request ID for SSE connection (don't clear and reset - just update)
      console.log('🚀 Got request ID:', initialResponse.request_id);
      setRequestId(initialResponse.request_id);
      
      // Set active request ID for global SSE connection
      setActiveRequestId(initialResponse.request_id);
      
      // Close modal and clear input on success
      console.log('🚀 Modal submission successful, closing modal');
      setIsOpen(false);
      setQueryText('');
      
    } catch (error) {
      console.error('Query submission failed:', error);
      setIsProcessing(false);
      setShowProcessingOverlay(false);
      
      // Clear active request ID on submission error
      setActiveRequestId(null);
      
      toast.error('Query processing failed');
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-black/95 backdrop-blur-xl border-white/10">
        <div className="relative">
          {/* Header with icon */}
          <div className="text-center mb-8">
            <motion.div
              className="w-16 h-16 mx-auto mb-4 relative"
              animate={{
                scale: [1, 1.05, 1],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 opacity-20 blur-xl" />
              <div className="relative w-full h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                <Shield className="w-8 h-8 text-white" />
              </div>
            </motion.div>
            
            <h2 className="text-2xl font-light text-white mb-2">
              Ask anything with complete privacy
            </h2>
            <p className="text-sm text-white/60 font-light">
              Your query will be automatically fragmented and distributed to protect sensitive information
            </p>
          </div>
          {/* Query Input */}
          <div className="space-y-4">
            <div className="relative">
              <textarea
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your question here..."
                className="w-full min-h-[120px] bg-white/5 backdrop-blur-md border border-white/10 rounded-xl px-6 py-4 text-white placeholder-white/40 resize-none focus:outline-none focus:border-white/20 transition-all"
                disabled={analyzeMutation.isPending || isProcessing}
                autoFocus
              />
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSubmit}
                disabled={analyzeMutation.isPending || isProcessing || !queryText.trim()}
                className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Send className="w-4 h-4 ml-0.5" />
              </motion.button>
            </div>
            <p className="text-xs text-white/40 text-center">
              Press Enter to submit • Your data is automatically protected
            </p>
          </div>

          {/* Example Queries */}
          <div className="space-y-4">
            <p className="text-xs text-white/40 text-center">Try an example:</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {EXAMPLE_QUERIES.map((example, index) => (
                <motion.button
                  key={index}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="p-4 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl hover:bg-white/10 hover:border-white/20 transition-all text-left"
                  onClick={() => handleExampleClick(example.query)}
                  disabled={analyzeMutation.isPending || isProcessing}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-white/80">
                        {example.category}
                      </span>
                      <div className={`w-2 h-2 rounded-full ${
                        example.description.includes('will trigger fragmentation') ? 'bg-red-400' :
                        example.description.includes('sensitive') ? 'bg-yellow-400' :
                        'bg-green-400'
                      }`} />
                    </div>
                    <p className="text-xs text-white/60 line-clamp-2">
                      {example.query}
                    </p>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Privacy Features */}
          <div className="flex justify-center gap-6 pt-4 border-t border-white/10">
            <div className="flex items-center gap-2 text-white/40">
              <Shield className="w-3 h-3" />
              <span className="text-xs">Privacy Protected</span>
            </div>
            <div className="flex items-center gap-2 text-white/40">
              <Zap className="w-3 h-3" />
              <span className="text-xs">Instant Fragmentation</span>
            </div>
            <div className="flex items-center gap-2 text-white/40">
              <Brain className="w-3 h-3" />
              <span className="text-xs">AI-Powered</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}