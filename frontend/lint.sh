#!/bin/bash

# Exit on error
set -e

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Change to the frontend directory
cd "$SCRIPT_DIR"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if --fix flag is provided
if [ "$1" == "--fix" ]; then
    echo -e "${YELLOW}Running ESLint with fix...${NC}"
    npm run lint:fix
    echo -e "${GREEN}ESLint fix complete!${NC}\n"
    
    echo -e "${YELLOW}Running Prettier with fix...${NC}"
    npm run format
    echo -e "${GREEN}Prettier fix complete!${NC}\n"
else
    echo -e "${YELLOW}Running ESLint check...${NC}"
    npm run lint
    echo -e "${GREEN}ESLint check complete!${NC}\n"
    
    echo -e "${YELLOW}Running Prettier check...${NC}"
    npm run format:check
    echo -e "${GREEN}Prettier check complete!${NC}\n"
fi 