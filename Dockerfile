# Use Python 3.12 slim image
FROM python:3.12-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# Create and change to the app directory
WORKDIR /app

# Copy requirements first to leverage Docker cache
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir hypercorn

# Copy application code
COPY . .

# Create start script that uses Railway's PORT
RUN echo '#!/bin/bash\nhypercorn app:app --bind "0.0.0.0:$PORT"' > start.sh && \
    chmod +x start.sh

# Run the web service on container startup
CMD ["./start.sh"]
