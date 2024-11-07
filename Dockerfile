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

# Default port (will be overridden by Railway)
ENV PORT=8000

# Run the web service on container startup
CMD ["hypercorn", "app:app", "--bind", "0.0.0.0:8000"]
