# Use Python 3.12 slim image
FROM python:3.12-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements first to leverage Docker cache
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Default port (will be overridden by Railway)
ENV PORT=8080

# Create start script
RUN echo '#!/bin/bash\nuvicorn app:app --host 0.0.0.0 --port "${PORT:-8080}"' > start.sh && \
    chmod +x start.sh

# Command to run the application
CMD ["./start.sh"]
