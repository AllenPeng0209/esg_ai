#!/bin/bash

# Exit on error
set -e

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Change to the backend directory
cd "$SCRIPT_DIR"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if --fix flag is provided
if [ "$1" == "--fix" ]; then
    echo -e "${YELLOW}Running black with formatting...${NC}"
    black .
    echo -e "${GREEN}Formatting complete!${NC}\n"
else
    echo -e "${YELLOW}Running black check...${NC}"
    black --check .
    echo -e "${GREEN}Black check complete!${NC}\n"
fi

echo -e "${YELLOW}Running flake8...${NC}"
flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics
flake8 . --count --exit-zero --max-complexity=10 --max-line-length=127 --statistics
echo -e "${GREEN}Flake8 check complete!${NC}" 