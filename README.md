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

### Development Notes

- File changes are automatically detected and server reloads
- Camera requires HTTPS in production but works on HTTP locally
- Check terminal logs for OCR and analysis progress
- Multiple image upload works in development
- PDF processing uses zerox which converts to images first
- Images are processed directly with GPT-4O Mini

## Production Deployment

### Prerequisites

1. GitHub repository
2. Vercel account
3. API keys:
   - OpenAI API key (for GPT-4O Mini)
   - Anthropic API key (for Claude 3.5 Sonnet)

### Deployment Steps

1. Push code to GitHub:
```bash
git add .
git commit -m "your commit message"
git push origin main
```

2. Set up Vercel:
   - Go to vercel.com
   - Import your GitHub repository
   - Set build settings:
     - Framework Preset: Other
     - Build Command: `pip install -r requirements.txt`
     - Output Directory: `static`
   - Add environment variables:
     - ANTHROPIC_API_KEY
     - OPENAI_API_KEY

3. Important Production Notes:
   - Free tier limitations:
     - Function execution time: 60s max
     - Memory: 1024MB
     - Concurrent executions: Limited
   - Camera requires HTTPS (provided by Vercel)
   - Large PDFs might hit time limits
   - Multiple images are processed sequentially
   - Check Vercel logs for issues

### Vercel Configuration

The vercel.json file configures:
- Python 3.12 runtime
- Memory and duration limits
- Security headers
- Static file caching
- Environment variables

### Monitoring

1. Vercel Dashboard:
   - Deployment status
   - Function execution logs
   - Error tracking
   - Performance metrics

2. Application Logs:
   - OCR processing status
   - Analysis progress
   - Error messages

### Troubleshooting

1. Deployment Failures:
   - Check Python version (should be 3.12)
   - Verify requirements.txt
   - Check build logs

2. Runtime Errors:
   - Check environment variables
   - Monitor function timeouts
   - Verify API key validity

3. Performance Issues:
   - Large file uploads
   - Multiple image processing
   - API rate limits

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

## Development Notes

1. Local Development:
   - Use `python run.py` for development with hot reload
   - Environment variables are loaded from .env file

2. Production Deployment:
   - Environment variables are set in Vercel dashboard
   - Static files are served by Vercel's CDN
   - Python API runs as serverless functions

3. Important Considerations:
   - Keep API keys secure and never commit them to version control
   - Test camera functionality on HTTPS in production
   - Consider API rate limits for OCR and AI services