#!/bin/bash

# Exit on error
set -e

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if --fix flag is provided
FIX_FLAG=""
if [ "$1" == "--fix" ]; then
    FIX_FLAG="--fix"
    echo -e "${YELLOW}Running in fix mode - will automatically format files${NC}\n"
fi

echo -e "${GREEN}Starting linting process...${NC}\n"

# Run backend linting
echo -e "${GREEN}Running backend linting...${NC}"
if ./backend/lint.sh $FIX_FLAG; then
    echo -e "${GREEN}Backend linting passed!${NC}\n"
else
    echo -e "${RED}Backend linting failed!${NC}\n"
    exit 1
fi

# Run frontend linting
echo -e "${GREEN}Running frontend linting...${NC}"
if ./frontend/lint.sh $FIX_FLAG; then
    echo -e "${GREEN}Frontend linting passed!${NC}\n"
else
    echo -e "${RED}Frontend linting failed!${NC}\n"
    exit 1
fi

echo -e "${GREEN}All linting completed successfully!${NC}" 