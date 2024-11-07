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

# Use PORT environment variable provided by Railway
ENV PORT=8080
EXPOSE ${PORT}

# Command to run the application
CMD uvicorn app:app --host 0.0.0.0 --port ${PORT}
