import uvicorn
import os
from dotenv import load_dotenv
import logging

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Check required environment variables
required_vars = ["OPENAI_API_KEY", "ANTHROPIC_API_KEY"]
missing_vars = [var for var in required_vars if not os.getenv(var)]

if missing_vars:
    print("Error: Missing required environment variables:")
    for var in missing_vars:
        print(f"- {var}")
    print("\nPlease set these variables in your .env file:")
    print('OPENAI_API_KEY="your-openai-api-key"')
    print('ANTHROPIC_API_KEY="your-anthropic-api-key"')
    exit(1)

if __name__ == "__main__":
    logger.info("Starting Insurance Contract Analyzer...")
    logger.info("Environment variables loaded:")
    logger.info(f"OPENAI_API_KEY present: {bool(os.getenv('OPENAI_API_KEY'))}")
    logger.info(f"ANTHROPIC_API_KEY present: {bool(os.getenv('ANTHROPIC_API_KEY'))}")
    logger.info("Server running at http://localhost:8001")
    
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="debug"
    )
