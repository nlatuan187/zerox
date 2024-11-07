import os
from fastapi import FastAPI, File, UploadFile, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, FileResponse
from anthropic import Anthropic
from pyzerox import zerox
from pyzerox.core.types import Page
from pyzerox.models.modellitellm import litellmmodel
import asyncio
import tempfile
import json
import logging
from typing import List, Dict, Any
from PIL import Image
import io
from fastapi.middleware.gzip import GZipMiddleware
import uuid
import shutil

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Add GZip compression for large responses
app.add_middleware(GZipMiddleware, minimum_size=1000)

# CORS middleware with increased max_age
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    max_age=3600,
)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Store active analysis jobs
active_jobs: Dict[str, Dict[str, Any]] = {}

async def process_image_with_model(image_path: str) -> str:
    """Process a single image using litellmmodel directly"""
    try:
        model = litellmmodel(model="gpt-4o-mini")
        completion = await model.completion(
            image_path=image_path,
            maintain_format=True,
            prior_page=""
        )
        return completion.content if completion else ""
    except Exception as e:
        logger.error(f"Error processing image with model: {str(e)}")
        return ""

async def analyze_content(contract_text: str, anthropic_key: str, job_id: str):
    """Analyze contract content and return results"""
    try:
        client = Anthropic(api_key=anthropic_key)
        
        # Update job status
        active_jobs[job_id]["status"] = "validating"
        active_jobs[job_id]["progress"] = 10
        
        # First, validate if this is an insurance contract
        logger.info("Validating document type...")
        validation_response = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1000,
            temperature=0,
            system="Bạn là chuyên gia phân tích tài liệu. Hãy xác định xem đây có phải là hợp đồng bảo hiểm hay không.",
            messages=[
                {
                    "role": "user",
                    "content": f"""Hãy kiểm tra xem văn bản sau có phải là hợp đồng bảo hiểm không. 
                    Chỉ trả lời 'YES' nếu đây là hợp đồng bảo hiểm (có các thông tin về quyền lợi bảo hiểm, phí bảo hiểm, điều khoản loại trừ, v.v.)
                    Trả lời 'NO' nếu không phải.
                    
                    Văn bản:
                    {contract_text[:2000]}"""
                }
            ]
        )

        validation_text = validation_response.content[0].text.strip().upper()
        is_insurance_contract = "YES" in validation_text and "NO" not in validation_text

        if not is_insurance_contract:
            result = {
                "ocr_text": contract_text,
                "message": "Tài liệu không phải là hợp đồng bảo hiểm. Vui lòng tải lên hợp đồng bảo hiểm để phân tích.",
                "quyền_lợi": "Không phải hợp đồng bảo hiểm",
                "chi_phí_tổng_thể_hàng_năm": "Không phải hợp đồng bảo hiểm",
                "giá_trị_hoàn_lại": "Không phải hợp đồng bảo hiểm",
                "các_điều_khoản_loại_trừ": "Không phải hợp đồng bảo hiểm",
                "quy_trình_claim": "Không phải hợp đồng bảo hiểm"
            }
            active_jobs[job_id]["status"] = "completed"
            active_jobs[job_id]["result"] = result
            active_jobs[job_id]["progress"] = 100
            return result

        # Initialize conversation and analysis
        messages = [{"role": "user", "content": f"Tôi sẽ gửi cho bạn một hợp đồng bảo hiểm để phân tích từng phần. Đây là nội dung hợp đồng:\n\n{contract_text}"}]
        analysis = {}

        # Analyze each section
        sections = [
            ("quyền_lợi", "Hãy phân tích phần Quyền lợi của hợp đồng. Liệt kê tất cả quyền lợi bảo hiểm, chi tiết mức bảo hiểm, điều kiện áp dụng. Trích dẫn chính xác các điều khoản liên quan."),
            ("chi_phí_tổng_thể_hàng_năm", "Tiếp theo, hãy phân tích Chi phí tổng thể/hàng năm. Bao gồm phí bảo hiểm cơ bản, các loại phí khác, lịch đóng phí. Trích dẫn biểu phí cụ thể."),
            ("giá_trị_hoàn_lại", "Tiếp theo, hãy phân tích Giá trị hoàn lại. Giải thích cách tính, điều kiện áp dụng, và bảng tỷ lệ phí hủy hợp đồng theo năm."),
            ("các_điều_khoản_loại_trừ", "Tiếp theo, hãy phân tích các Điều khoản loại trừ. Liệt kê và giải thích chi tiết từng trường hợp loại trừ, điều kiện đặc biệt."),
            ("quy_trình_claim", "Cuối cùng, hãy phân tích Quy trình claim. Mô tả các bước thực hiện, hồ sơ yêu cầu, thời hạn nộp hồ sơ.")
        ]

        for i, (section_key, prompt) in enumerate(sections):
            active_jobs[job_id]["status"] = f"analyzing_{section_key}"
            active_jobs[job_id]["progress"] = 20 + (i * 16)  # Progress from 20% to 100%
            
            messages.append({"role": "user", "content": prompt})
            response = client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=4000,
                temperature=0,
                system="Bạn là chuyên gia phân tích hợp đồng bảo hiểm. Hãy phân tích kỹ lưỡng và trích xuất thông tin chi tiết bằng tiếng Việt. Với mỗi phần, hãy trích dẫn chính xác điều khoản liên quan, sử dụng danh sách có dấu gạch đầu dòng (-) và bảng markdown khi cần thiết.",
                messages=messages
            )
            analysis[section_key] = response.content[0].text.strip()
            messages.append({"role": "assistant", "content": response.content[0].text})

            # Update partial results as they become available
            active_jobs[job_id]["partial_result"] = {
                "ocr_text": contract_text,
                **analysis
            }

        result = {
            "ocr_text": contract_text,
            **analysis
        }
        
        active_jobs[job_id]["status"] = "completed"
        active_jobs[job_id]["result"] = result
        active_jobs[job_id]["progress"] = 100
        
        return result

    except Exception as e:
        logger.error(f"Error in analyze_content: {str(e)}")
        active_jobs[job_id]["status"] = "error"
        active_jobs[job_id]["error"] = str(e)
        raise

async def process_files(job_id: str, file_content: bytes = None, file_name: str = None, image_contents: List[tuple] = None):
    """Process files and update job status"""
    try:
        # Check API keys
        openai_key = os.getenv("OPENAI_API_KEY")
        anthropic_key = os.getenv("ANTHROPIC_API_KEY")
        
        if not openai_key:
            raise HTTPException(status_code=500, detail="OPENAI_API_KEY not found in environment variables")
        if not anthropic_key:
            raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not found in environment variables")

        # Create temp directory for files
        temp_dir = tempfile.mkdtemp()
        try:
            contents = []
            
            if file_content and file_name and file_name.lower().endswith('.pdf'):
                active_jobs[job_id]["status"] = "processing_pdf"
                active_jobs[job_id]["progress"] = 5
                
                # Process PDF file using zerox
                file_path = os.path.join(temp_dir, file_name)
                with open(file_path, "wb") as f:
                    f.write(file_content)
                
                result = await zerox(file_path=file_path, model="gpt-4o-mini", cleanup=True)
                if result and result.pages:
                    contents.extend([page.content for page in result.pages])
                else:
                    raise HTTPException(status_code=400, detail="Không thể xử lý file PDF. Vui lòng kiểm tra lại file đầu vào.")
            
            elif image_contents:
                # Process all images
                total_images = len(image_contents)
                for i, (img_content, img_name) in enumerate(image_contents):
                    try:
                        active_jobs[job_id]["status"] = f"processing_image_{i+1}/{total_images}"
                        active_jobs[job_id]["progress"] = int((i / total_images) * 15)  # Progress up to 15%
                        
                        file_path = os.path.join(temp_dir, f"page_{i}{os.path.splitext(img_name)[1]}")
                        with open(file_path, "wb") as f:
                            f.write(img_content)
                        
                        result = await process_image_with_model(file_path)
                        if result:
                            contents.append(result)
                            logger.info(f"Successfully processed image {i}")
                        else:
                            logger.error(f"No results for image {i}")
                    except Exception as e:
                        logger.error(f"Error processing image {i}: {str(e)}")
                        continue
            else:
                raise HTTPException(status_code=400, detail="Vui lòng tải lên file PDF hoặc ảnh hợp đồng bảo hiểm")

            if not contents:
                raise HTTPException(status_code=400, detail="Không thể trích xuất được nội dung từ file. Vui lòng kiểm tra lại file đầu vào.")

            logger.info(f"OCR processing complete, extracted {len(contents)} pages")
            contract_text = "\n\n".join(contents)
            logger.info(f"Extracted text length: {len(contract_text)} characters")

            # Analyze content
            await analyze_content(contract_text, anthropic_key, job_id)

        finally:
            # Clean up temp directory
            shutil.rmtree(temp_dir, ignore_errors=True)

    except Exception as e:
        logger.error(f"Error in process_files: {str(e)}")
        active_jobs[job_id]["status"] = "error"
        active_jobs[job_id]["error"] = str(e)
        raise

@app.post("/analyze")
async def analyze_contract(
    file: UploadFile = File(None),
    images: List[UploadFile] = File([])
):
    """Start analysis and return job ID"""
    try:
        job_id = str(uuid.uuid4())
        active_jobs[job_id] = {
            "status": "starting",
            "progress": 0,
            "result": None,
            "partial_result": None,
            "error": None
        }
        
        # Read all files first
        file_data = None
        if file:
            content = await file.read()
            file_data = (content, file.filename)
        
        image_data = []
        if images:
            for img in images:
                content = await img.read()
                image_data.append((content, img.filename))
        
        # Start processing in background
        asyncio.create_task(process_files(
            job_id,
            file_content=file_data[0] if file_data else None,
            file_name=file_data[1] if file_data else None,
            image_contents=image_data if image_data else None
        ))
        
        return {"job_id": job_id}
    except Exception as e:
        logger.error(f"Error starting analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/status/{job_id}")
async def get_job_status(job_id: str):
    """Get job status"""
    if job_id not in active_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return active_jobs[job_id]

# Serve index.html at root
@app.get("/")
async def read_root():
    return FileResponse("static/index.html")

# Health check endpoint for Vercel
@app.get("/health")
async def health_check():
    return {"status": "healthy"}
