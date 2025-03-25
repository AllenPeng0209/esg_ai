#!/bin/bash

# Exit on error
set -e

echo "Current working directory: $(pwd)"
echo "Listing directory contents:"
ls -la

echo "Checking environment variables:"
echo "SUPABASE_URL: ${SUPABASE_URL:-not set}"
echo "DATABASE_URL: ${DATABASE_URL:-not set}"
echo "API_V1_STR: ${API_V1_STR:-not set}"

# Create virtual environment if it doesn't exist
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    python -m venv .venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source .venv/bin/activate

# Verify Python environment
echo "Python version:"
python --version
echo "Pip version:"
pip --version

# Install dependencies
echo "Installing dependencies..."
pip install --no-cache-dir -r requirements.txt
pip install -e .

# Run database migrations
echo "Running database migrations..."
alembic upgrade head

# Start the application
echo "Starting FastAPI application..."
exec python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
