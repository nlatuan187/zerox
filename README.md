# Insurance Contract Analyzer

A web application that analyzes insurance contracts using OCR and AI.

## Features

- PDF document analysis
- Image upload and analysis
- Camera capture and analysis
- Real-time OCR processing
- AI-powered contract analysis

## Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/your-repo-name.git
cd your-repo-name
```

2. Create a virtual environment and install dependencies:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

3. Create a .env file with your API keys:
```
ANTHROPIC_API_KEY=your_anthropic_api_key
OPENAI_API_KEY=your_openai_api_key
```

4. Run the development server:
```bash
python run.py
```

## Deployment on Vercel

1. Push your code to GitHub:
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/your-repo-name.git
git push -u origin main
```

2. Install Vercel CLI:
```bash
npm i -g vercel
```

3. Login to Vercel:
```bash
vercel login
```

4. Add your environment variables to Vercel:
```bash
vercel secrets add anthropic_api_key "your_anthropic_api_key"
vercel secrets add openai_api_key "your_openai_api_key"
```

5. Deploy:
```bash
vercel
```

Alternatively, you can deploy directly from the Vercel dashboard:
1. Go to https://vercel.com
2. Import your GitHub repository
3. Add environment variables in the project settings
4. Deploy

## Environment Variables

The following environment variables are required:

- `ANTHROPIC_API_KEY`: Your Anthropic API key
- `OPENAI_API_KEY`: Your OpenAI API key

## Project Structure

```
/
├── app.py              # FastAPI application
├── run.py             # Development server
├── requirements.txt   # Python dependencies
├── vercel.json       # Vercel configuration
├── static/           # Static files
│   ├── index.html    # Main HTML file
│   ├── styles.css    # CSS styles
│   └── js/          # JavaScript modules
│       ├── main.js
│       ├── api.js
│       ├── camera.js
│       ├── fileUpload.js
│       └── markdown.js
└── py_zerox/         # OCR processing module
```

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

## Troubleshooting

1. Camera Issues:
   - Camera requires HTTPS in production
   - Some browsers may require permission settings

2. Deployment Issues:
   - Ensure all dependencies are in requirements.txt
   - Check Vercel build logs for errors
   - Verify environment variables are set correctly

## License

MIT License
