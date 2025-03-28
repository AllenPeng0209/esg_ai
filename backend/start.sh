#!/bin/bash

# Exit on error
set -e

# Run database migrations
echo "Running database migrations..."
alembic upgrade head

# Wait for OpenSearch to be ready
echo "Waiting for OpenSearch to be ready..."
until curl -s "http://${OPENSEARCH_HOST}:${OPENSEARCH_PORT}" > /dev/null; do
    echo "OpenSearch is unavailable - sleeping"
    sleep 5
done

echo "OpenSearch is up - executing data upload"

# Upload data to OpenSearch
python opensearch/upload_to_opensearch.py \
    opensearch/data/ecoinvent.csv \
    --index ecoinvent \
    --host ${OPENSEARCH_HOST} \
    --port ${OPENSEARCH_PORT} \
    --username ${OPENSEARCH_USER} \
    --password ${OPENSEARCH_PASSWORD}

# Start the application
echo "Starting FastAPI application..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
