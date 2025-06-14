"""
Models for detection engine results
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum


class PIIEntityType(str, Enum):
    """Types of PII entities"""
    PERSON = "PERSON"
    EMAIL = "EMAIL"
    PHONE = "PHONE_NUMBER"
    SSN = "US_SSN"
    CREDIT_CARD = "CREDIT_CARD"
    LOCATION = "LOCATION"
    DATE_TIME = "DATE_TIME"
    IP_ADDRESS = "IP_ADDRESS"
    URL = "URL"
    MEDICAL = "MEDICAL_LICENSE"
    DRIVER_LICENSE = "US_DRIVER_LICENSE"
    PASSPORT = "US_PASSPORT"
    BANK_ACCOUNT = "US_BANK_NUMBER"
    OTHER = "OTHER"


class PIIEntity(BaseModel):
    """Detected PII entity"""
    text: str = Field(..., description="The PII text detected")
    type: PIIEntityType = Field(..., description="Type of PII")
    start: int = Field(..., description="Start position in text")
    end: int = Field(..., description="End position in text")
    score: float = Field(..., ge=0.0, le=1.0, description="Confidence score")
    
    class Config:
        json_schema_extra = {
            "example": {
                "text": "John Smith",
                "type": "PERSON",
                "start": 11,
                "end": 21,
                "score": 0.95
            }
        }


class CodeDetection(BaseModel):
    """Code detection result"""
    has_code: bool = Field(..., description="Whether code was detected")
    language: Optional[str] = Field(None, description="Detected programming language")
    confidence: float = Field(0.0, ge=0.0, le=1.0, description="Detection confidence")
    code_blocks: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Detected code blocks with positions"
    )


class NamedEntity(BaseModel):
    """Named entity from NLP analysis"""
    text: str = Field(..., description="Entity text")
    label: str = Field(..., description="Entity label (ORG, LOC, etc.)")
    start: int = Field(..., description="Start position")
    end: int = Field(..., description="End position")
    
    class Config:
        json_schema_extra = {
            "example": {
                "text": "Microsoft",
                "label": "ORG",
                "start": 25,
                "end": 34
            }
        }


class DetectionReport(BaseModel):
    """Complete detection analysis report"""
    # PII Detection
    has_pii: bool = Field(..., description="Whether PII was detected")
    pii_entities: List[PIIEntity] = Field(
        default_factory=list,
        description="List of detected PII entities"
    )
    pii_density: float = Field(
        0.0,
        ge=0.0,
        le=1.0,
        description="Ratio of PII text to total text"
    )
    
    # Code Detection
    code_detection: CodeDetection = Field(..., description="Code detection results")
    
    # Entity Recognition
    named_entities: List[NamedEntity] = Field(
        default_factory=list,
        description="Named entities detected"
    )
    
    # Overall Assessment
    sensitivity_score: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Overall sensitivity score (0=low, 1=high)"
    )
    
    # Metadata
    processing_time: float = Field(..., description="Time taken for detection (ms)")
    analyzers_used: List[str] = Field(
        default_factory=list,
        description="Detection analyzers used"
    )
    
    # Recommendations
    recommended_strategy: Optional[str] = Field(
        None,
        description="Recommended fragmentation strategy"
    )
    requires_orchestrator: bool = Field(
        False,
        description="Whether orchestrator is recommended"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "has_pii": True,
                "pii_entities": [
                    {
                        "text": "john@example.com",
                        "type": "EMAIL",
                        "start": 20,
                        "end": 36,
                        "score": 0.99
                    }
                ],
                "pii_density": 0.15,
                "code_detection": {
                    "has_code": True,
                    "language": "python",
                    "confidence": 0.95,
                    "code_blocks": []
                },
                "named_entities": [
                    {
                        "text": "Google",
                        "label": "ORG",
                        "start": 45,
                        "end": 51
                    }
                ],
                "sensitivity_score": 0.75,
                "processing_time": 85.3,
                "analyzers_used": ["presidio", "guesslang", "spacy"],
                "recommended_strategy": "semantic",
                "requires_orchestrator": True
            }
        }


class SensitivityFactors(BaseModel):
    """Factors contributing to sensitivity score"""
    pii_factor: float = Field(0.0, ge=0.0, le=1.0)
    code_factor: float = Field(0.0, ge=0.0, le=1.0)
    entity_factor: float = Field(0.0, ge=0.0, le=1.0)
    keyword_factor: float = Field(0.0, ge=0.0, le=1.0)
    
    def calculate_overall(self) -> float:
        """Calculate weighted overall sensitivity"""
        weights = {
            "pii": 0.35,
            "code": 0.25,
            "entity": 0.15,
            "keyword": 0.25
        }
        
        return (
            self.pii_factor * weights["pii"] +
            self.code_factor * weights["code"] +
            self.entity_factor * weights["entity"] +
            self.keyword_factor * weights["keyword"]
        )