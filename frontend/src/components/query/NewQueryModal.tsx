"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Send, Sparkles } from 'lucide-react';
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
      
      // Clear active request ID on submission error
      setActiveRequestId(null);
      
      toast.error('Query processing failed');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-500" />
            New Privacy-Preserving Query
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Query Input */}
          <div className="space-y-3">
            <label className="text-sm font-medium block">Enter your query:</label>
            <Textarea
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              placeholder="Type your question here... Don't worry about sensitive data - it will be automatically detected and protected."
              className="min-h-24 resize-none"
              disabled={analyzeMutation.isPending || isProcessing}
            />
            <div className="flex justify-between items-center">
              <p className="text-xs text-gray-500 block">
                Your query will be automatically fragmented and anonymized to protect sensitive information.
              </p>
              <Button 
                onClick={handleSubmit}
                disabled={analyzeMutation.isPending || isProcessing || !queryText.trim()}
                className="flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
                {(analyzeMutation.isPending || isProcessing) ? 'Processing...' : 'Submit Query'}
              </Button>
            </div>
          </div>

          {/* Example Queries */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium">Try these examples:</h3>
              <Badge variant="secondary" className="text-xs">Click to use</Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {EXAMPLE_QUERIES.map((example, index) => (
                <Card 
                  key={index}
                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors border-l-4 border-l-blue-200"
                  onClick={() => handleExampleClick(example.query)}
                  disabled={analyzeMutation.isPending || isProcessing}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">
                        {example.category}
                      </Badge>
                      <span className="text-xs text-gray-400">Click to use</span>
                    </div>
                    <p className="text-sm text-gray-800 line-clamp-3 block">
                      {example.query}
                    </p>
                    <p className="text-xs text-gray-500 italic block">
                      {example.description}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Info Section */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Privacy Protection Features:</h4>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• Automatic PII detection (names, emails, phone numbers, SSNs, etc.)</li>
              <li>• Query fragmentation across multiple LLM providers</li>
              <li>• Context isolation to prevent complete data exposure</li>
              <li>• Real-time privacy scoring and visualization</li>
              <li>• Enterprise-grade anonymization and de-anonymization</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}