"""
Unified detection engine combining PII, code, and entity detection
"""

import asyncio
import logging
import time
from concurrent.futures import ThreadPoolExecutor

from src.detection.code import CodeDetector
from src.detection.entities import EntityRecognizer
from src.detection.models import (
    CodeDetection,
    DetectionReport,
    NamedEntity,
    PIIEntity,
    SensitivityFactors,
)
from src.detection.pii import PIIDetector

logger = logging.getLogger(__name__)


class DetectionEngine:
    """
    Unified detection engine that combines multiple detection methods
    to analyze queries for sensitive content, code, and entities
    """

    def __init__(self):
        """Initialize all detection components"""
        logger.info("Initializing DetectionEngine...")

        # Initialize detectors
        self.pii_detector = PIIDetector()
        self.code_detector = CodeDetector()
        self.entity_recognizer = EntityRecognizer()

        # Thread pool for parallel detection
        self.executor = ThreadPoolExecutor(max_workers=3)

        # Sensitive keywords that increase sensitivity score
        self.sensitive_keywords = {
            "password", "secret", "token", "api key", "private key",
            "ssn", "social security", "credit card", "bank account",
            "medical", "diagnosis", "prescription", "health",
            "confidential", "proprietary", "internal",
            "revenue", "profit", "salary", "compensation",
            "strategy", "roadmap", "acquisition", "merger"
        }

        logger.info("DetectionEngine initialized successfully")

    async def analyze(self, query: str) -> DetectionReport:
        """
        Analyze a query using all detection methods

        Args:
            query: Query text to analyze

        Returns:
            Complete detection report
        """
        start_time = time.time()

        try:
            # Run detections in parallel
            loop = asyncio.get_event_loop()

            # Create tasks for parallel execution
            pii_future = loop.run_in_executor(
                self.executor,
                self.pii_detector.detect,
                query
            )
            code_future = loop.run_in_executor(
                self.executor,
                self.code_detector.detect,
                query
            )
            entity_future = loop.run_in_executor(
                self.executor,
                self.entity_recognizer.recognize,
                query
            )

            # Wait for all detections to complete
            pii_entities, code_detection, named_entities = await asyncio.gather(
                pii_future, code_future, entity_future
            )

            # Calculate PII density
            pii_density = self.pii_detector.calculate_pii_density(query, pii_entities)

            # Calculate sensitivity factors
            sensitivity_factors = self._calculate_sensitivity_factors(
                query, pii_entities, code_detection, named_entities
            )

            # Calculate overall sensitivity score
            sensitivity_score = sensitivity_factors.calculate_overall()

            # Determine fragmentation recommendations
            recommended_strategy, requires_orchestrator = self._determine_strategy(
                sensitivity_score, code_detection, pii_entities, named_entities, sensitivity_factors, query
            )

            # Calculate processing time
            processing_time = (time.time() - start_time) * 1000  # Convert to ms

            # Determine if PII is significant (not just casual location mentions)
            significant_pii = self._has_significant_pii(pii_entities, query)

            # Create detection report
            report = DetectionReport(
                has_pii=significant_pii,
                pii_entities=pii_entities,
                pii_density=pii_density,
                code_detection=code_detection,
                named_entities=named_entities,
                sensitivity_score=sensitivity_score,
                processing_time=processing_time,
                analyzers_used=["presidio", "guesslang", "spacy"],
                recommended_strategy=recommended_strategy,
                requires_orchestrator=requires_orchestrator
            )

            logger.info(
                f"Detection completed in {processing_time:.2f}ms. "
                f"Sensitivity: {sensitivity_score:.2f}, "
                f"Strategy: {recommended_strategy}, "
                f"Orchestrator: {requires_orchestrator}"
            )

            return report

        except Exception as e:
            logger.error(f"Error during detection analysis: {str(e)}")
            raise

    def detect(self, query: str) -> DetectionReport:
        """
        Synchronous wrapper for analyze method

        Args:
            query: Query text to analyze

        Returns:
            Complete detection report
        """
        try:
            # Check if we're already in an async context
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # We're in an async context, create a new thread to run the async code
                import concurrent.futures
                with concurrent.futures.ThreadPoolExecutor() as executor:
                    future = executor.submit(asyncio.run, self.analyze(query))
                    return future.result()
            else:
                # No event loop running, we can use asyncio.run directly
                return asyncio.run(self.analyze(query))
        except RuntimeError:
            # No event loop exists, create one
            return asyncio.run(self.analyze(query))

    def _calculate_sensitivity_factors(
        self,
        query: str,
        pii_entities: list[PIIEntity],
        code_detection: CodeDetection,
        named_entities: list[NamedEntity]
    ) -> SensitivityFactors:
        """Calculate individual sensitivity factors"""

        # Check if this is a casual context
        casual_context_keywords = [
            "weather", "news", "restaurant", "hotel", "flight", "train",
            "tourist", "visit", "travel", "directions", "map", "what is"
        ]
        query_lower = query.lower()
        is_casual_context = any(keyword in query_lower for keyword in casual_context_keywords)

        # PII factor
        pii_factor = 0.0
        if pii_entities:
            # Base score on number and types of PII
            high_risk_pii = {"SSN", "CREDIT_CARD", "BANK_ACCOUNT", "MEDICAL", "US_SSN", "US_BANK_NUMBER"}
            high_risk_count = sum(
                1 for e in pii_entities
                if e.type.value in high_risk_pii
            )

            # For casual context with only locations/names, minimal factor
            if is_casual_context:
                only_casual_entities = all(
                    e.type.value in ["LOCATION", "PERSON", "GPE"]
                    for e in pii_entities
                )
                if only_casual_entities:
                    pii_factor = 0.1  # Minimal factor for casual location/name mentions
                else:
                    pii_factor = min(
                        0.3 + (len(pii_entities) * 0.1) + (high_risk_count * 0.2),
                        1.0
                    )
            else:
                pii_factor = min(
                    0.3 + (len(pii_entities) * 0.1) + (high_risk_count * 0.2),
                    1.0
                )

        # Code factor
        code_factor = 0.0
        if code_detection.has_code:
            code_factor = code_detection.confidence

            # Boost for certain languages
            if code_detection.language in ["sql", "bash", "powershell"]:
                code_factor = min(code_factor + 0.2, 1.0)

        # Entity factor - also reduce for casual contexts
        entity_factor = self.entity_recognizer.calculate_entity_sensitivity(
            named_entities
        )
        if is_casual_context:
            entity_factor *= 0.3  # Significantly reduce entity sensitivity for casual contexts

        # Keyword factor
        keyword_factor = self._calculate_keyword_sensitivity(query)

        return SensitivityFactors(
            pii_factor=pii_factor,
            code_factor=code_factor,
            entity_factor=entity_factor,
            keyword_factor=keyword_factor
        )

    def _calculate_keyword_sensitivity(self, query: str) -> float:
        """Calculate sensitivity based on keyword presence"""
        query_lower = query.lower()

        # Count sensitive keyword occurrences
        keyword_count = sum(
            1 for keyword in self.sensitive_keywords
            if keyword in query_lower
        )

        # Calculate factor (max 1.0)
        return min(keyword_count * 0.25, 1.0)

    def _has_significant_pii(self, pii_entities: list[PIIEntity], query: str) -> bool:
        """Determine if PII entities are significant or just casual mentions"""
        if not pii_entities:
            return False

        # Context keywords that indicate casual use
        casual_context_keywords = [
            "weather", "news", "restaurant", "hotel", "flight", "train",
            "tourist", "visit", "travel", "directions", "map", "what is"
        ]

        query_lower = query.lower()
        has_casual_context = any(keyword in query_lower for keyword in casual_context_keywords)

        # Check for significant PII types
        significant_pii_types = [
            "EMAIL", "PHONE_NUMBER", "US_SSN", "CREDIT_CARD",
            "US_DRIVER_LICENSE", "US_PASSPORT", "US_BANK_NUMBER",
            "MEDICAL_LICENSE", "IP_ADDRESS"
        ]

        for entity in pii_entities:
            # If it's a significant PII type, always consider it PII
            if entity.type.value in significant_pii_types:
                return True

            # For locations and person names, consider context
            if entity.type.value in ["LOCATION", "PERSON"]:
                # If no casual context and high confidence, it's likely PII
                if not has_casual_context and entity.score > 0.8:
                    return True

        return False

    def _determine_strategy(
        self,
        sensitivity_score: float,
        code_detection: CodeDetection,
        pii_entities: list[PIIEntity],
        named_entities: list[NamedEntity],
        sensitivity_factors: SensitivityFactors | None = None,
        query: str = ""
    ) -> tuple[str, bool]:
        """
        Determine recommended fragmentation strategy and orchestrator need

        Returns:
            Tuple of (strategy_name, requires_orchestrator)
        """

        # High sensitivity always needs orchestrator
        if sensitivity_score > 0.7:
            return "semantic", True

        # High keyword sensitivity (confidential/secret data)
        if sensitivity_factors and sensitivity_factors.keyword_factor >= 0.5:
            return "semantic", True

        # Code with PII needs special handling
        if code_detection.has_code and pii_entities:
            return "hybrid", True

        # Complex queries with many entities
        if len(named_entities) > 10:
            return "semantic", True

        # Pure code queries (no significant PII)
        if code_detection.has_code:
            # Check if this is primarily a code query
            has_significant_pii = self._has_significant_pii(pii_entities, "")
            if not has_significant_pii and sensitivity_score <= 0.6:
                return "syntactic", False
            else:
                return "hybrid", sensitivity_score > 0.5

        # Queries with significant PII should use at least syntactic
        if self._has_significant_pii(pii_entities, query):
            return "syntactic", False

        # Moderate sensitivity without code
        if sensitivity_score > 0.4:
            return "semantic", False

        # Simple cases
        return "rule_based", False

    def __del__(self):
        """Cleanup thread pool on deletion"""
        if hasattr(self, 'executor'):
            self.executor.shutdown(wait=False)
