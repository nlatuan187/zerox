# Insurance Contract Analyzer

Web application for analyzing insurance contracts using OCR and AI. Upload PDF documents or images of insurance contracts to extract and analyze key information.

## Features

- PDF document analysis
- Multiple image upload support
- Camera capture functionality
- Real-time OCR processing
- AI-powered contract analysis
- Responsive web interface

## Tech Stack

- Frontend:
  - HTML/CSS/JavaScript
  - TailwindCSS
  - Modular JS architecture

- Backend:
  - FastAPI
  - Python 3.12
  - GPT-4O Mini (for OCR)
  - Claude 3.5 Sonnet (for analysis)
  - zerox OCR

## Local Development

1. Clone the repository:
```bash
git clone https://github.com/your-team/repo-name.git
cd repo-name
```

2. Create and activate virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create .env file with API keys:
```
ANTHROPIC_API_KEY=your_anthropic_api_key
OPENAI_API_KEY=your_openai_api_key
```

5. Run development server:
```bash
python run.py
```

The development server will run on http://localhost:3000 with hot reload enabled.

## Development Notes

### Local Development
- Server:
  - Run with `python run.py`
  - Runs on http://localhost:3000
  - Hot reload enabled for code changes
  - Uses .env file for environment variables
  - Logs OCR and analysis progress in terminal

- File Processing:
  - PDF files are processed using zerox (converts to images first)
  - Images are processed directly with GPT-4O Mini
  - Multiple images can be uploaded simultaneously
  - Camera capture works on HTTP locally

- Testing:
  - Test PDF uploads with sample insurance contracts
  - Test multiple image uploads
  - Test camera functionality
  - Monitor terminal logs for processing status

### Production Deployment
- Environment:
  - All environment variables must be set in Vercel dashboard
  - ANTHROPIC_API_KEY for Claude 3.5 Sonnet
  - OPENAI_API_KEY for GPT-4O Mini
  - Python version set to 3.12

- Architecture:
  - Frontend served from Vercel's CDN
  - API endpoints run as serverless functions
  - Static files cached at edge
  - Maximum function duration: 60 seconds
  - Memory limit: 1024MB

- Security:
  - HTTPS required for camera functionality
  - API keys stored securely in Vercel
  - Content Security Policy headers enabled
  - CORS configured for production domain

### Important Considerations
- API Usage:
  - GPT-4O Mini rate limits: Monitor usage
  - Claude 3.5 Sonnet rate limits: Monitor usage
  - Consider implementing rate limiting in app
  - Handle API errors gracefully

- Performance:
  - Large PDFs may hit serverless timeout
  - Multiple images processed sequentially
  - Consider file size limits
  - Monitor Vercel function execution times

- Security:
  - Never commit .env file
  - Keep API keys secure
  - Use environment variables for all secrets
  - Regular security audits recommended

- Monitoring:
  - Check Vercel deployment logs
  - Monitor API response times
  - Track error rates
  - Watch for timeout issues

## Project Structure

```
/
├── app.py              # FastAPI application
├── requirements.txt    # Python dependencies
├── vercel.json        # Vercel deployment config
├── static/            # Static files
│   ├── index.html     # Main HTML file
│   ├── styles.css     # CSS styles
│   └── js/           # JavaScript modules
│       ├── main.js    # Main application logic
│       ├── api.js     # API handling
│       ├── camera.js  # Camera functionality
│       ├── fileUpload.js  # File upload handling
│       └── markdown.js    # Markdown formatting
```

## Environment Variables

Required environment variables:
- `ANTHROPIC_API_KEY`: Anthropic API key for Claude 3.5 Sonnet
- `OPENAI_API_KEY`: OpenAI API key for GPT-4O Mini

## License

[Your team's license]
