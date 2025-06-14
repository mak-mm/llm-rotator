"""
Unit tests for code detector
"""

import pytest
from src.detection.code import CodeDetector
from tests.fixtures.test_data import TestQueries


class TestCodeDetector:
    """Test cases for CodeDetector"""
    
    @pytest.fixture
    def code_detector(self):
        """Create CodeDetector instance"""
        return CodeDetector()
    
    @pytest.mark.unit
    @pytest.mark.detection
    def test_detector_initialization(self, code_detector):
        """Test that detector initializes correctly"""
        # Guesslang temporarily disabled, so no guesser attribute
        assert len(code_detector.code_patterns) > 0
        assert code_detector.confidence_threshold == 0.5
    
    @pytest.mark.unit
    @pytest.mark.detection
    def test_no_code_detection(self, code_detector):
        """Test detection with no code"""
        text = "What is the weather in Paris today?"
        result = code_detector.detect(text)
        
        assert not result.has_code
        assert result.language is None
        assert result.confidence == 0.0
        assert len(result.code_blocks) == 0
    
    @pytest.mark.unit
    @pytest.mark.detection
    @pytest.mark.parametrize("query_data", TestQueries.CODE_QUERIES)
    def test_code_detection(self, code_detector, query_data):
        """Test code detection with various languages"""
        result = code_detector.detect(query_data["query"])
        
        assert result.has_code
        assert result.language == query_data["expected_language"]
        assert result.confidence >= query_data["expected_confidence"]
        assert len(result.code_blocks) > 0
    
    @pytest.mark.unit
    @pytest.mark.detection
    def test_python_detection(self, code_detector):
        """Test Python code detection"""
        python_code = """
        def hello_world():
            print("Hello, World!")
            return True
        
        if __name__ == "__main__":
            hello_world()
        """
        result = code_detector.detect(python_code)
        
        assert result.has_code
        assert result.language == "python"
        assert result.confidence > 0.7
    
    @pytest.mark.unit
    @pytest.mark.detection
    def test_javascript_detection(self, code_detector):
        """Test JavaScript code detection"""
        js_code = """
        function calculateSum(arr) {
            return arr.reduce((sum, num) => sum + num, 0);
        }
        
        const result = calculateSum([1, 2, 3, 4, 5]);
        console.log(result);
        """
        result = code_detector.detect(js_code)
        
        assert result.has_code
        assert result.language == "javascript"
        assert result.confidence > 0.6
    
    @pytest.mark.unit
    @pytest.mark.detection
    def test_sql_detection(self, code_detector):
        """Test SQL code detection"""
        sql_code = """
        SELECT customers.name, orders.total, orders.date
        FROM customers
        INNER JOIN orders ON customers.id = orders.customer_id
        WHERE orders.date >= '2023-01-01'
        ORDER BY orders.total DESC
        LIMIT 100;
        """
        result = code_detector.detect(sql_code)
        
        assert result.has_code
        assert result.language == "sql"
        assert result.confidence > 0.8
    
    @pytest.mark.unit
    @pytest.mark.detection
    def test_markdown_code_blocks(self, code_detector):
        """Test detection of code within markdown blocks"""
        markdown_text = """
        Here's how to implement a simple function:
        
        ```python
        def fibonacci(n):
            if n <= 1:
                return n
            return fibonacci(n-1) + fibonacci(n-2)
        ```
        
        This function calculates fibonacci numbers.
        """
        result = code_detector.detect(markdown_text)
        
        assert result.has_code
        assert result.language == "python"
        assert len(result.code_blocks) > 0
    
    @pytest.mark.unit
    @pytest.mark.detection
    def test_indented_code_blocks(self, code_detector):
        """Test detection of indented code blocks"""
        indented_text = """
        Here's the solution:
        
            def process_data(data):
                cleaned = []
                for item in data:
                    if item.is_valid():
                        cleaned.append(item.clean())
                return cleaned
        
        This should work for your use case.
        """
        result = code_detector.detect(indented_text)
        
        assert result.has_code
        # Should detect as Python due to syntax
        assert result.language == "python"
    
    @pytest.mark.unit
    @pytest.mark.detection
    def test_mixed_content(self, code_detector):
        """Test detection with mixed text and code"""
        mixed_text = """
        I need help with this function. Here's what I have:
        
        function getUserData(userId) {
            const user = database.users.find(id => id === userId);
            return user ? user.profile : null;
        }
        
        But it's not working correctly. Can you help me debug it?
        """
        result = code_detector.detect(mixed_text)
        
        assert result.has_code
        assert result.language == "javascript"
    
    @pytest.mark.unit
    @pytest.mark.detection
    def test_code_pattern_detection(self, code_detector):
        """Test internal code pattern detection"""
        # Test with function pattern
        function_text = "def my_function(param1, param2):"
        assert code_detector._has_code_patterns(function_text)
        
        # Test with class pattern
        class_text = "class MyClass:"
        assert code_detector._has_code_patterns(class_text)
        
        # Test with import pattern
        import_text = "import numpy as np"
        assert code_detector._has_code_patterns(import_text)
        
        # Test with no patterns
        normal_text = "This is just regular text without any code."
        assert not code_detector._has_code_patterns(normal_text)
    
    @pytest.mark.unit
    @pytest.mark.detection
    def test_confidence_calculation(self, code_detector):
        """Test confidence score calculation"""
        # High confidence Python code
        python_code = """
        import pandas as pd
        
        def analyze_data():
            df = pd.read_csv('data.csv')
            return df.describe()
        """
        result = code_detector.detect(python_code)
        assert result.confidence > 0.8
        
        # Lower confidence simple code
        simple_code = "x = 5\ny = x + 10\nprint(y)"
        result = code_detector.detect(simple_code)
        # Should still detect but with lower confidence
        assert result.has_code
        assert 0.5 <= result.confidence <= 0.8
    
    @pytest.mark.unit
    @pytest.mark.detection
    def test_empty_and_invalid_input(self, code_detector):
        """Test with empty and invalid inputs"""
        # Empty string
        result = code_detector.detect("")
        assert not result.has_code
        
        # Only whitespace
        result = code_detector.detect("   \n\t  ")
        assert not result.has_code
        
        # Only special characters
        result = code_detector.detect("!@#$%^&*()")
        assert not result.has_code
    
    @pytest.mark.unit
    @pytest.mark.detection
    def test_code_block_extraction(self, code_detector):
        """Test code block extraction methods"""
        text_with_blocks = """
        Here are two functions:
        
        ```python
        def func1():
            pass
        ```
        
        And here's another:
        
            def func2():
                return True
        """
        
        blocks = code_detector._extract_code_blocks(text_with_blocks)
        assert len(blocks) >= 1  # At least the markdown block
        
        # Check that blocks have required keys
        for block in blocks:
            assert "content" in block
            assert "start" in block
            assert "end" in block