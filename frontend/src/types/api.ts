export interface QueryRequest {
  query: string;
  privacy_level?: "public" | "internal" | "confidential" | "restricted" | "top_secret";
  fragmentation_strategy?: "none" | "pii_isolation" | "code_isolation" | "semantic_split" | "maximum_isolation";
  preferred_providers?: string[];
  user_id?: string;
  session_id?: string;
}

export interface QueryFragment {
  fragment_id: string;
  content: string;
  fragment_type: "general" | "pii" | "code" | "sensitive";
  contains_sensitive_data: boolean;
  provider_hint?: string;
  order: number;
  context_references: string[];
  metadata: Record<string, any>;
}

export interface DetectionReport {
  has_pii: boolean;
  has_code: boolean;
  pii_entities: Array<{
    type: string;
    text: string;
    start: number;
    end: number;
    confidence: number;
  }>;
  code_detection: {
    has_code: boolean;
    language?: string;
    code_blocks: Array<{
      content: string;
      language: string;
      start_line: number;
      end_line: number;
    }>;
  };
  content_classification: {
    classification: "general" | "sensitive" | "restricted";
    confidence: number;
  };
}

export interface QueryResponse {
  request_id: string;
  aggregated_response: string;
  total_processing_time_ms: number;
  fragments_processed: number;
  providers_used: string[];
  detection_report: DetectionReport;
  fragmentation_strategy: string;
  privacy_level_achieved: string;
  total_cost_estimate: number;
  tokens_used: number;
  fragment_results: Array<{
    fragment_id: string;
    provider_id: string;
    response: string;
    tokens_used: number;
    latency_ms: number;
    success: boolean;
    metadata: Record<string, any>;
  }>;
  metadata: Record<string, any>;
}

export interface ProviderStatus {
  provider_id: string;
  status: "available" | "degraded" | "unavailable" | "rate_limited" | "maintenance";
  model_name: string;
  last_health_check: string;
  response_time_ms?: number;
  error_message?: string;
  success_rate: number;
  requests_today: number;
}

export interface PrivacyVisualization {
  original_query: string;
  fragments: QueryFragment[];
  privacy_score: number;
  provider_distribution: Record<string, number>;
  sensitive_data_isolation: {
    pii_fragments: string[];
    code_fragments: string[];
    general_fragments: string[];
  };
}