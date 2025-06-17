"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { AnalyzeResponse } from '@/lib/api';

interface QueryContextType {
  currentQuery: string;
  queryResult: AnalyzeResponse | null;
  isProcessing: boolean;
  setCurrentQuery: (query: string) => void;
  setQueryResult: (result: AnalyzeResponse | null) => void;
  setIsProcessing: (processing: boolean) => void;
}

const QueryContext = createContext<QueryContextType | undefined>(undefined);

export function QueryProvider({ children }: { children: ReactNode }) {
  const [currentQuery, setCurrentQuery] = useState<string>('');
  const [queryResult, setQueryResult] = useState<AnalyzeResponse | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Debug wrapper for setQueryResult
  const setQueryResultWithLog = (result: AnalyzeResponse | null) => {
    console.log('🔧 Context - Setting query result:', result);
    setQueryResult(result);
  };

  return (
    <QueryContext.Provider
      value={{
        currentQuery,
        queryResult,
        isProcessing,
        setCurrentQuery,
        setQueryResult: setQueryResultWithLog,
        setIsProcessing,
      }}
    >
      {children}
    </QueryContext.Provider>
  );
}

export function useQuery() {
  const context = useContext(QueryContext);
  if (context === undefined) {
    throw new Error('useQuery must be used within a QueryProvider');
  }
  return context;
}