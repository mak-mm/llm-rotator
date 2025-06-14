#!/usr/bin/env python3
"""
Test runner script for the Privacy LLM project
"""

import subprocess
import sys
import argparse
from pathlib import Path


def run_command(command, description):
    """Run a command and print the result"""
    print(f"\n{'='*60}")
    print(f"Running: {description}")
    print(f"Command: {' '.join(command)}")
    print('='*60)
    
    try:
        result = subprocess.run(command, capture_output=True, text=True, check=True)
        print(result.stdout)
        if result.stderr:
            print(f"STDERR: {result.stderr}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Command failed with exit code {e.returncode}")
        print(f"STDOUT: {e.stdout}")
        print(f"STDERR: {e.stderr}")
        return False


def main():
    parser = argparse.ArgumentParser(description="Run tests for Privacy LLM project")
    parser.add_argument("--unit", action="store_true", help="Run only unit tests")
    parser.add_argument("--integration", action="store_true", help="Run only integration tests")
    parser.add_argument("--detection", action="store_true", help="Run only detection tests")
    parser.add_argument("--api", action="store_true", help="Run only API tests")
    parser.add_argument("--coverage", action="store_true", help="Generate coverage report")
    parser.add_argument("--slow", action="store_true", help="Include slow tests")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    parser.add_argument("--file", help="Run specific test file")
    
    args = parser.parse_args()
    
    # Set up project root
    project_root = Path(__file__).parent.parent
    
    # Base pytest command
    cmd = ["python3", "-m", "pytest"]
    
    # Add verbosity
    if args.verbose:
        cmd.append("-v")
    
    # Add coverage if requested
    if args.coverage:
        cmd.extend(["--cov=src", "--cov-report=html", "--cov-report=term-missing"])
    
    # Add test selection
    if args.file:
        cmd.append(args.file)
    elif args.unit:
        cmd.extend(["-m", "unit"])
    elif args.integration:
        cmd.extend(["-m", "integration"])
    elif args.detection:
        cmd.extend(["-m", "detection"])
    elif args.api:
        cmd.extend(["-m", "api"])
    else:
        # Run all tests
        cmd.append("tests/")
    
    # Handle slow tests - this needs to be done properly
    if not args.slow:
        # Only add slow filter if no other marker is already set
        if "-m" not in cmd:
            cmd.extend(["-m", "not slow"])
    
    # Change to project directory
    import os
    os.chdir(project_root)
    
    # Run the tests
    success = run_command(cmd, "Running tests")
    
    if success:
        print(f"\n✅ Tests completed successfully!")
        
        if args.coverage:
            print(f"\n📊 Coverage report generated in htmlcov/index.html")
    else:
        print(f"\n❌ Tests failed!")
        sys.exit(1)


if __name__ == "__main__":
    main()