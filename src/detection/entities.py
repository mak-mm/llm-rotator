"""
Named entity recognition using spaCy
"""

import spacy
from typing import List, Dict, Any, Set
import logging
from src.detection.models import NamedEntity

logger = logging.getLogger(__name__)


class EntityRecognizer:
    """Named entity recognition using spaCy"""
    
    def __init__(self, model_name: str = "en_core_web_sm"):
        """
        Initialize spaCy NER
        
        Args:
            model_name: spaCy model to use (default: en_core_web_sm)
        """
        try:
            self.nlp = spacy.load(model_name)
            logger.info(f"EntityRecognizer initialized with {model_name}")
        except OSError:
            logger.error(f"spaCy model {model_name} not found. Installing...")
            import subprocess
            subprocess.run(["python", "-m", "spacy", "download", model_name])
            self.nlp = spacy.load(model_name)
        
        # Entity types we're interested in
        self.relevant_entity_types = {
            "PERSON",      # People, including fictional
            "ORG",         # Companies, agencies, institutions
            "GPE",         # Countries, cities, states
            "LOC",         # Non-GPE locations
            "PRODUCT",     # Products, services
            "EVENT",       # Named events
            "FAC",         # Facilities
            "MONEY",       # Monetary values
            "DATE",        # Dates or periods
            "TIME",        # Times
            "PERCENT",     # Percentages
            "QUANTITY",    # Measurements
            "CARDINAL",    # Numerals not covered by other types
            "WORK_OF_ART", # Titles of creative works
            "LAW",         # Named laws
            "LANGUAGE",    # Languages
            "NORP",        # Nationalities, religious/political groups
        }
        
        # Entity types that increase sensitivity
        self.sensitive_entity_types = {
            "PERSON", "ORG", "GPE", "MONEY", "FAC", "PRODUCT"
        }
    
    def recognize(self, text: str) -> List[NamedEntity]:
        """
        Recognize named entities in text
        
        Args:
            text: Text to analyze
            
        Returns:
            List of named entities
        """
        try:
            # Process text with spaCy
            doc = self.nlp(text)
            
            entities = []
            seen_entities = set()  # Avoid duplicates
            text_entity_counts = {}  # Track entity text frequency
            
            for ent in doc.ents:
                # Skip if not a relevant entity type
                if ent.label_ not in self.relevant_entity_types:
                    continue
                
                # Skip entities that are only punctuation/special characters
                if not any(c.isalnum() for c in ent.text):
                    continue
                
                # Create unique key to avoid duplicates
                entity_key = (ent.text, ent.label_, ent.start_char, ent.end_char)
                if entity_key in seen_entities:
                    continue
                seen_entities.add(entity_key)
                
                # Limit repeated entities to avoid spam
                text_label_key = (ent.text, ent.label_)
                text_entity_counts[text_label_key] = text_entity_counts.get(text_label_key, 0) + 1
                
                # Skip if we've seen this entity text+label combination too many times
                if text_entity_counts[text_label_key] > 5:
                    continue
                
                entity = NamedEntity(
                    text=ent.text,
                    label=ent.label_,
                    start=ent.start_char,
                    end=ent.end_char
                )
                entities.append(entity)
            
            # Sort by position
            entities.sort(key=lambda x: x.start)
            
            logger.debug(f"Recognized {len(entities)} named entities")
            return entities
            
        except Exception as e:
            logger.error(f"Error recognizing entities: {str(e)}")
            return []
    
    def calculate_entity_sensitivity(self, entities: List[NamedEntity]) -> float:
        """
        Calculate sensitivity score based on entities
        
        Args:
            entities: List of named entities
            
        Returns:
            Sensitivity score (0.0 to 1.0)
        """
        if not entities:
            return 0.0
        
        # Count sensitive entities
        sensitive_count = sum(
            1 for e in entities 
            if e.label in self.sensitive_entity_types
        )
        
        # Base score on ratio of sensitive entities
        base_score = sensitive_count / len(entities) if entities else 0.0
        
        # Boost score if many entities overall (information-rich)
        density_boost = min(len(entities) / 20, 0.3)  # Max 0.3 boost
        
        # Special handling for certain combinations
        entity_types = {e.label for e in entities}
        
        # Financial context (ORG + MONEY)
        if "ORG" in entity_types and "MONEY" in entity_types:
            base_score = min(base_score + 0.2, 1.0)
        
        # Personal context (PERSON + LOC/GPE)
        if "PERSON" in entity_types and ("LOC" in entity_types or "GPE" in entity_types):
            base_score = min(base_score + 0.15, 1.0)
        
        # Product/business context
        if "PRODUCT" in entity_types and "ORG" in entity_types:
            base_score = min(base_score + 0.1, 1.0)
        
        return min(base_score + density_boost, 1.0)
    
    def get_entity_summary(self, entities: List[NamedEntity]) -> Dict[str, Any]:
        """
        Get summary statistics about entities
        
        Args:
            entities: List of named entities
            
        Returns:
            Summary dictionary
        """
        summary = {
            "total_entities": len(entities),
            "unique_entities": len(set(e.text for e in entities)),
            "entity_types": {},
            "sensitive_entities": 0,
            "most_common": []
        }
        
        # Count by type
        type_counts = {}
        entity_frequency = {}
        
        for entity in entities:
            # Type counting
            type_counts[entity.label] = type_counts.get(entity.label, 0) + 1
            
            # Frequency counting
            entity_frequency[entity.text] = entity_frequency.get(entity.text, 0) + 1
            
            # Sensitive counting
            if entity.label in self.sensitive_entity_types:
                summary["sensitive_entities"] += 1
        
        summary["entity_types"] = type_counts
        
        # Most common entities
        if entity_frequency:
            sorted_entities = sorted(
                entity_frequency.items(), 
                key=lambda x: x[1], 
                reverse=True
            )
            summary["most_common"] = [
                {"text": text, "count": count} 
                for text, count in sorted_entities[:5]
            ]
        
        return summary
    
    def extract_key_entities(self, entities: List[NamedEntity]) -> Dict[str, List[str]]:
        """
        Extract key entities by type for fragmentation decisions
        
        Args:
            entities: List of named entities
            
        Returns:
            Dictionary mapping entity types to entity texts
        """
        key_entities = {}
        
        for entity in entities:
            if entity.label not in key_entities:
                key_entities[entity.label] = []
            
            # Avoid duplicates
            if entity.text not in key_entities[entity.label]:
                key_entities[entity.label].append(entity.text)
        
        return key_entities