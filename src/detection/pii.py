"""
PII detection using Presidio
"""

import logging
import re
from typing import Any

from presidio_analyzer import AnalyzerEngine, RecognizerResult

from src.detection.models import PIIEntity, PIIEntityType

logger = logging.getLogger(__name__)


class PIIDetector:
    """PII detection using Microsoft Presidio"""

    def __init__(self):
        """Initialize Presidio analyzer with default recognizers"""
        self.analyzer = AnalyzerEngine()
        self.supported_languages = ["en"]

        # Mapping from Presidio entity types to our enum
        self.entity_type_mapping = {
            "PERSON": PIIEntityType.PERSON,
            "EMAIL_ADDRESS": PIIEntityType.EMAIL,
            "PHONE_NUMBER": PIIEntityType.PHONE,
            "US_SSN": PIIEntityType.SSN,
            "CREDIT_CARD": PIIEntityType.CREDIT_CARD,
            "LOCATION": PIIEntityType.LOCATION,
            "DATE_TIME": PIIEntityType.DATE_TIME,
            "IP_ADDRESS": PIIEntityType.IP_ADDRESS,
            "URL": PIIEntityType.URL,
            "MEDICAL_LICENSE": PIIEntityType.MEDICAL,
            "US_DRIVER_LICENSE": PIIEntityType.DRIVER_LICENSE,
            "US_PASSPORT": PIIEntityType.PASSPORT,
            "US_BANK_NUMBER": PIIEntityType.BANK_ACCOUNT,
        }

        # Add custom regex patterns for common PII that might be missed
        self.custom_patterns = {
            "SSN": re.compile(r'\b\d{3}-\d{2}-\d{4}\b'),
            "PHONE": re.compile(r'(?:\+?1[-. ]?)?\(?[0-9]{3}\)?[-. ][0-9]{3}[-. ][0-9]{4}\b'),
            "EMAIL": re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'),
            "CREDIT_CARD": re.compile(r'\b(?:\d{4}[-\s]?){3}\d{4}\b')
        }

        logger.info("PIIDetector initialized with Presidio")

    def detect(self, text: str, language: str = "en") -> list[PIIEntity]:
        """
        Detect PII entities in text

        Args:
            text: Text to analyze
            language: Language code (default: "en")

        Returns:
            List of detected PII entities
        """
        try:
            # Analyze text with Presidio
            results: list[RecognizerResult] = self.analyzer.analyze(
                text=text,
                language=language,
                entities=None,  # Detect all entity types
                score_threshold=0.5  # Minimum confidence threshold
            )

            # Convert Presidio results to our models
            pii_entities = []
            found_positions = set()  # Track positions to avoid duplicates

            for result in results:
                entity_type = self.entity_type_mapping.get(
                    result.entity_type,
                    PIIEntityType.OTHER
                )

                pii_entity = PIIEntity(
                    text=text[result.start:result.end],
                    type=entity_type,
                    start=result.start,
                    end=result.end,
                    score=result.score
                )
                pii_entities.append(pii_entity)
                found_positions.add((result.start, result.end))

            # Check custom patterns for entities Presidio might have missed or misclassified
            for pattern_type, pattern in self.custom_patterns.items():
                for match in pattern.finditer(text):
                    start, end = match.span()
                    entity_type = None
                    if pattern_type == "SSN":
                        entity_type = PIIEntityType.SSN
                    elif pattern_type == "PHONE":
                        entity_type = PIIEntityType.PHONE
                    elif pattern_type == "EMAIL":
                        entity_type = PIIEntityType.EMAIL
                    elif pattern_type == "CREDIT_CARD":
                        entity_type = PIIEntityType.CREDIT_CARD

                    if entity_type:
                        # Check if this position overlaps with existing entities
                        overlapping_indices = []
                        for i, e in enumerate(pii_entities):
                            if (e.start <= start < e.end or e.start < end <= e.end or
                                (start <= e.start and e.end <= end)):
                                overlapping_indices.append(i)

                        # Remove overlapping entities with lower or equal confidence
                        for i in reversed(overlapping_indices):
                            if pii_entities[i].score <= 0.95:
                                del pii_entities[i]

                        # Add our high-confidence match
                        pii_entity = PIIEntity(
                            text=text[start:end],
                            type=entity_type,
                            start=start,
                            end=end,
                            score=0.95  # High confidence for direct pattern match
                        )
                        pii_entities.append(pii_entity)
                        found_positions.add((start, end))

            # Sort by position for easier processing
            pii_entities.sort(key=lambda x: x.start)

            logger.debug(f"Detected {len(pii_entities)} PII entities")
            return pii_entities

        except Exception as e:
            logger.error(f"Error detecting PII: {str(e)}")
            return []

    def calculate_pii_density(self, text: str, entities: list[PIIEntity]) -> float:
        """
        Calculate the density of PII in the text

        Args:
            text: Original text
            entities: Detected PII entities

        Returns:
            PII density ratio (0.0 to 1.0)
        """
        if not text or not entities:
            return 0.0

        # Calculate total characters covered by PII
        pii_chars = 0
        for entity in entities:
            pii_chars += entity.end - entity.start

        # Calculate density
        density = pii_chars / len(text)
        return min(density, 1.0)  # Cap at 1.0

    def get_entity_summary(self, entities: list[PIIEntity]) -> dict[str, int]:
        """
        Get summary count of each entity type

        Args:
            entities: List of PII entities

        Returns:
            Dictionary with entity type counts
        """
        summary = {}
        for entity in entities:
            entity_type = entity.type.value
            summary[entity_type] = summary.get(entity_type, 0) + 1
        return summary

    def anonymize_positions(self, text: str, entities: list[PIIEntity]) -> list[dict[str, Any]]:
        """
        Get anonymization positions for the text

        Args:
            text: Original text
            entities: Detected PII entities

        Returns:
            List of positions to anonymize with replacement suggestions
        """
        positions = []

        for entity in entities:
            replacement = self._get_replacement_text(entity.type)
            positions.append({
                "start": entity.start,
                "end": entity.end,
                "original": entity.text,
                "replacement": replacement,
                "type": entity.type.value
            })

        return positions

    def _get_replacement_text(self, entity_type: PIIEntityType) -> str:
        """Get appropriate replacement text for entity type"""
        replacements = {
            PIIEntityType.PERSON: "[PERSON]",
            PIIEntityType.EMAIL: "[EMAIL]",
            PIIEntityType.PHONE: "[PHONE]",
            PIIEntityType.SSN: "[SSN]",
            PIIEntityType.CREDIT_CARD: "[CREDIT_CARD]",
            PIIEntityType.LOCATION: "[LOCATION]",
            PIIEntityType.DATE_TIME: "[DATE]",
            PIIEntityType.IP_ADDRESS: "[IP_ADDRESS]",
            PIIEntityType.URL: "[URL]",
            PIIEntityType.MEDICAL: "[MEDICAL_ID]",
            PIIEntityType.DRIVER_LICENSE: "[LICENSE]",
            PIIEntityType.PASSPORT: "[PASSPORT]",
            PIIEntityType.BANK_ACCOUNT: "[ACCOUNT]",
            PIIEntityType.OTHER: "[REDACTED]"
        }
        return replacements.get(entity_type, "[REDACTED]")
