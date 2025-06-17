"""
Code detection using Guesslang
"""

# from guesslang import Guess  # Temporarily disabled due to TensorFlow version conflict
import logging
import re
from typing import Any

from src.detection.models import CodeDetection

logger = logging.getLogger(__name__)


class CodeDetector:
    """Code detection using Guesslang"""

    def __init__(self):
        """Initialize code detector (without Guesslang for now)"""
        # self.guesser = Guess()  # Temporarily disabled

        # Common code patterns to help identify code blocks
        self.code_patterns = {
            "function": re.compile(r'(def|function|func|fn)\s+\w+\s*\('),
            "class": re.compile(r'(class|struct|interface)\s+\w+'),
            "import": re.compile(r'(import|from|require|include|using)\s+[\w\.]+'),
            "variable": re.compile(r'(var|let|const|int|string|bool)\s+\w+\s*='),
            "assignment": re.compile(r'\w+\s*=\s*[\w\d"\']+'),  # Simple assignments
            "print_stmt": re.compile(r'(print|console\.log|System\.out|echo)\s*\('),
            "control": re.compile(r'(if|for|while|switch|case)\s*[\(:]'),
            "brackets": re.compile(r'[\{\}\[\]\(\)]'),
            "operators": re.compile(r'[=!<>]+|&&|\|\||->|=>'),
            "semicolons": re.compile(r';'),  # Any semicolon, not just at end of line
            "sql": re.compile(r'(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|JOIN)', re.IGNORECASE),
            "command": re.compile(r'^\s*(git|npm|pip|docker|kubectl|aws)', re.MULTILINE)
        }

        # Minimum confidence threshold for code detection
        self.confidence_threshold = 0.5

        logger.info("CodeDetector initialized with Guesslang")

    def detect(self, text: str) -> CodeDetection:
        """
        Detect code in text and identify language

        Args:
            text: Text to analyze

        Returns:
            CodeDetection result
        """
        try:
            # First, check if text contains code-like patterns
            has_code_patterns = self._has_code_patterns(text)

            if not has_code_patterns:
                return CodeDetection(
                    has_code=False,
                    language=None,
                    confidence=0.0,
                    code_blocks=[]
                )

            # Extract potential code blocks
            code_blocks = self._extract_code_blocks(text)

            if not code_blocks:
                # Try analyzing the whole text
                language, confidence = self._guess_language(text)

                if confidence >= self.confidence_threshold:
                    return CodeDetection(
                        has_code=True,
                        language=language,
                        confidence=confidence,
                        code_blocks=[{
                            "content": text,
                            "language": language,
                            "confidence": confidence,
                            "start": 0,
                            "end": len(text)
                        }]
                    )
                else:
                    return CodeDetection(
                        has_code=False,
                        language=None,
                        confidence=confidence,
                        code_blocks=[]
                    )

            # Analyze each code block
            analyzed_blocks = []
            overall_confidence = 0.0
            detected_languages = {}

            for block in code_blocks:
                language, confidence = self._guess_language(block["content"])

                if confidence >= self.confidence_threshold:
                    block["language"] = language
                    block["confidence"] = confidence
                    analyzed_blocks.append(block)

                    # Track language frequencies
                    detected_languages[language] = detected_languages.get(language, 0) + 1
                    overall_confidence = max(overall_confidence, confidence)

            # Determine primary language
            primary_language = None
            if detected_languages:
                primary_language = max(detected_languages, key=detected_languages.get)

            return CodeDetection(
                has_code=len(analyzed_blocks) > 0,
                language=primary_language,
                confidence=overall_confidence,
                code_blocks=analyzed_blocks
            )

        except Exception as e:
            logger.error(f"Error detecting code: {str(e)}")
            return CodeDetection(
                has_code=False,
                language=None,
                confidence=0.0,
                code_blocks=[]
            )

    def _has_code_patterns(self, text: str) -> bool:
        """Check if text contains code-like patterns"""
        pattern_matches = 0

        for pattern_name, pattern in self.code_patterns.items():
            if pattern.search(text):
                pattern_matches += 1

                # Strong indicators
                if pattern_name in ["function", "class", "import", "sql", "print_stmt"]:
                    return True

        # Multiple weak indicators
        return pattern_matches >= 2

    def _extract_code_blocks(self, text: str) -> list[dict[str, Any]]:
        """Extract potential code blocks from text"""
        blocks = []

        # Look for markdown code blocks
        markdown_pattern = re.compile(r'```(?:\w+)?\n(.*?)\n```', re.DOTALL)
        for match in markdown_pattern.finditer(text):
            blocks.append({
                "content": match.group(1),
                "start": match.start(1),
                "end": match.end(1)
            })

        # Look for indented blocks (4+ spaces or tab)
        lines = text.split('\n')
        current_block = []
        block_start = None

        for i, line in enumerate(lines):
            if line.startswith('    ') or line.startswith('\t'):
                if block_start is None:
                    block_start = sum(len(l) + 1 for l in lines[:i])
                current_block.append(line)
            else:
                if current_block and len(current_block) > 2:  # Minimum 3 lines
                    block_content = '\n'.join(current_block)
                    blocks.append({
                        "content": block_content,
                        "start": block_start,
                        "end": block_start + len(block_content)
                    })
                current_block = []
                block_start = None

        # Handle last block
        if current_block and len(current_block) > 2:
            block_content = '\n'.join(current_block)
            blocks.append({
                "content": block_content,
                "start": block_start,
                "end": block_start + len(block_content)
            })

        return blocks

    def _guess_language(self, text: str) -> tuple[str | None, float]:
        """
        Guess programming language of text (pattern-based fallback)

        Returns:
            Tuple of (language_name, confidence)
        """
        try:
            # Pattern-based language detection (temporary replacement for Guesslang)
            language = self._detect_language_by_patterns(text)
            confidence = self._calculate_confidence(text, language) if language else 0.0

            return language, confidence

        except Exception as e:
            logger.error(f"Error guessing language: {str(e)}")
            return None, 0.0

    def _calculate_confidence(self, text: str, language: str) -> float:
        """Calculate confidence score based on language and patterns"""
        confidence = 0.5  # Base confidence if guesslang detected something

        # Boost confidence based on language-specific patterns
        language_patterns = {
            "python": [r'def\s+\w+\s*\(', r'import\s+', r'print\s*\(', r':\s*$', r'for\s+\w+\s+in\s+', r'return\s+'],
            "javascript": [r'function\s+', r'const\s+', r'=>', r'console\.log'],
            "java": [r'public\s+class', r'private\s+', r'void\s+', r'System\.out'],
            "sql": [r'SELECT\s+', r'FROM\s+', r'WHERE\s+', r'JOIN\s+'],
            "bash": [r'#!/bin/bash', r'\$\{', r'echo\s+', r'if\s+\['],
        }

        if language in language_patterns:
            patterns = language_patterns[language]
            matches = sum(1 for p in patterns if re.search(p, text, re.IGNORECASE | re.MULTILINE))
            # Give more weight to multiple pattern matches
            if matches >= 3:
                confidence += 0.35
            elif matches >= 2:
                confidence += 0.25
            else:
                confidence += (matches / len(patterns)) * 0.3

        # Cap at 0.95 to avoid overconfidence
        return min(confidence, 0.95)

    def _detect_language_by_patterns(self, text: str) -> str | None:
        """Detect language using pattern matching (fallback for Guesslang)"""
        text.lower()

        # Python patterns
        python_patterns = [
            r'def\s+\w+\s*\(',
            r'import\s+\w+',
            r'from\s+\w+\s+import',
            r'print\s*\(',
            r'if\s+__name__\s*==\s*["\']__main__["\']',
            r':\s*$',  # Python's colon syntax
            r'^\w+\s*=\s*\w+\s*[+\-*/]\s*\w+'  # Simple arithmetic assignments
        ]

        # JavaScript patterns
        js_patterns = [
            r'function\s+\w+\s*\(',
            r'const\s+\w+\s*=',
            r'let\s+\w+\s*=',
            r'var\s+\w+\s*=',
            r'=>',
            r'console\.log\s*\('
        ]

        # SQL patterns - more comprehensive
        sql_patterns = [
            r'select\s+.*\s+from\s+',
            r'insert\s+into\s+',
            r'update\s+.*\s+set\s+',
            r'delete\s+from\s+',
            r'create\s+table\s+',
            r'alter\s+table\s+',
            r'where\s+.*\s*(=|>|<|>=|<=|<>)',
            r'order\s+by\s+',
            r'group\s+by\s+',
            r'(inner|left|right|full)\s+join\s+',
            r'and\s+\w+\s*(=|>|<)'
        ]

        # Java patterns
        java_patterns = [
            r'public\s+class\s+',
            r'private\s+\w+\s+\w+',
            r'public\s+static\s+void\s+main',
            r'System\.out\.println\s*\(',
            r'import\s+java\.'
        ]

        # Bash patterns
        bash_patterns = [
            r'#!/bin/bash',
            r'#!/bin/sh',
            r'echo\s+',
            r'\$\{\w+\}',
            r'if\s+\[.*\];\s*then'
        ]

        # Count pattern matches for each language
        language_scores = {
            'python': sum(1 for p in python_patterns if re.search(p, text, re.MULTILINE | re.IGNORECASE)),
            'javascript': sum(1 for p in js_patterns if re.search(p, text, re.MULTILINE | re.IGNORECASE)),
            'sql': sum(1 for p in sql_patterns if re.search(p, text, re.MULTILINE | re.IGNORECASE)),
            'java': sum(1 for p in java_patterns if re.search(p, text, re.MULTILINE | re.IGNORECASE)),
            'bash': sum(1 for p in bash_patterns if re.search(p, text, re.MULTILINE | re.IGNORECASE))
        }

        # Return language with highest score
        max_score = max(language_scores.values())
        best_language = max(language_scores, key=language_scores.get)

        # Different thresholds for different languages
        if best_language == 'sql' and max_score >= 1:  # SQL can be detected with just 1 strong pattern
            return best_language
        elif best_language == 'python' and max_score >= 1:
            # Check for Python indicators (including print)
            if re.search(r'(def|class|import|from|print\s*\()\s*', text, re.IGNORECASE | re.MULTILINE):
                return best_language
        elif max_score >= 2:  # Other languages need at least 2 patterns
            return best_language

        return None
