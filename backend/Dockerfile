FROM python:3.10.6-slim

# Set environment variables
ENV OPENSEARCH_HOST=opensearch
ENV OPENSEARCH_PORT=9200
ENV OPENSEARCH_USER=admin
ENV OPENSEARCH_PASSWORD=admin
ENV OPENSEARCH_INDEX=ecoinvent
ENV CSV_PATH=/app/opensearch/data/ecoinvent.csv

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Create directory for OpenSearch data
RUN mkdir -p /app/opensearch/data

# Make the startup script executable and fix permissions
COPY start.sh .
RUN chmod +x /app/start.sh

# Use sh to run the startup script
CMD ["sh", "/app/start.sh"]
