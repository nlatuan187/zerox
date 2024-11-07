# Insurance Contract Analyzer

A web application that analyzes Vietnamese insurance contracts using gpt-4o-mini for OCR and Claude 3.5 Sonnet for analysis.

## Features

- Upload insurance contracts in various formats (PDF, DOC, DOCX)
- OCR processing using gpt-4o-mini
- Detailed analysis using Claude 3.5 Sonnet
- Extracts key information:
  - Quyền lợi (Benefits)
  - Chi phí tổng thể/hàng năm (Total/Annual Cost)
  - Giá trị hoàn lại (Surrender Value)
  - Các điều khoản loại trừ (Exclusions)
  - Quy trình claim (Claim Process)

## Setup

1. Create a Python virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
pip install -e .  # Install local zerox package
```

3. Create a .env file with your API keys:
```bash
OPENAI_API_KEY="your-openai-api-key"
ANTHROPIC_API_KEY="your-anthropic-api-key"
```

4. Run the application:
```bash
python run.py
```

5. Open http://localhost:8000 in your browser

## Usage

1. Click "Chọn file hợp đồng bảo hiểm" to select your insurance contract file
2. Click "Phân tích" to start the analysis
3. Wait for the processing to complete
4. View the extracted information in the results section

## Supported File Types

- PDF files
- Microsoft Word documents (.doc, .docx)
- Other document formats supported by libreoffice

## Technical Details

- Backend: FastAPI
- OCR: zerox package with gpt-4o-mini
- Analysis: Claude 3.5 Sonnet (claude-3-5-sonnet-20241022)
- Frontend: HTML + Tailwind CSS

## Notes

- Processing time depends on document length and complexity
- Ensure documents are clear and readable for best results
- Vietnamese language support is built into both gpt-4o-mini and Claude 3.5 Sonnet
