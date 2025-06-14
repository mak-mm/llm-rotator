#!/usr/bin/env python3
"""
Simple test runner to debug the issue
"""

import subprocess
import sys
from pathlib import Path

# Change to project directory
project_root = Path(__file__).parent.parent
import os
os.chdir(project_root)

# Try simple pytest command
try:
    print("Testing pytest directly...")
    result = subprocess.run([
        "python3", "-m", "pytest", 
        "-m", "not slow",
        "tests/"
    ], capture_output=True, text=True)
    
    print(f"Exit code: {result.returncode}")
    print(f"STDOUT: {result.stdout}")
    print(f"STDERR: {result.stderr}")
    
except Exception as e:
    print(f"Error: {e}")