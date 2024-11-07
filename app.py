import os
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, FileResponse
from anthropic import Anthropic
from pyzerox import zerox
from pyzerox.core.types import Page
from pyzerox.models import litellmmodel
import asyncio
import tempfile
import json
import logging
from typing import List
from PIL import Image
import io

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

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

@app.post("/analyze")
async def analyze_contract(
    file: UploadFile = File(None),
    images: List[UploadFile] = File(None)
):
    try:
        # Check API keys
        openai_key = os.getenv("OPENAI_API_KEY")
        anthropic_key = os.getenv("ANTHROPIC_API_KEY")
        
        if not openai_key:
            raise HTTPException(status_code=500, detail="OPENAI_API_KEY not found in environment variables")
        if not anthropic_key:
            raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not found in environment variables")

        # Create temp directory for files
        with tempfile.TemporaryDirectory() as temp_dir:
            contents = []
            
            if file and file.filename.lower().endswith('.pdf'):
                # Process PDF file using zerox
                file_path = os.path.join(temp_dir, file.filename)
                content = await file.read()
                with open(file_path, "wb") as f:
                    f.write(content)
                result = await zerox(file_path=file_path, model="gpt-4o-mini", cleanup=True)
                if result and result.pages:
                    contents.extend([page.content for page in result.pages])
                else:
                    raise HTTPException(status_code=400, detail="Không thể xử lý file PDF. Vui lòng kiểm tra lại file đầu vào.")
            elif file or images:
                # Process image files directly with litellmmodel
                files_to_process = [file] if file else images
                if not any(files_to_process):
                    raise HTTPException(status_code=400, detail="Vui lòng tải lên file PDF hoặc ảnh hợp đồng bảo hiểm")
                
                # Process all images
                for i, img in enumerate(files_to_process):
                    if img:
                        try:
                            # Save image with original extension
                            file_path = os.path.join(temp_dir, f"page_{i}{os.path.splitext(img.filename)[1]}")
                            content = await img.read()
                            with open(file_path, "wb") as f:
                                f.write(content)
                            
                            # Process image directly with model
                            result = await process_image_with_model(file_path)
                            if result:
                                contents.append(result)
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

            # Combine all contents
            contract_text = "\n\n".join(contents)
            logger.info(f"Extracted text length: {len(contract_text)} characters")

            # First, validate if this is an insurance contract
            logger.info("Validating document type...")
            client = Anthropic()
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
                return JSONResponse(content={
                    "ocr_text": contract_text,
                    "message": "Tài liệu không phải là hợp đồng bảo hiểm. Vui lòng tải lên hợp đồng bảo hiểm để phân tích.",
                    "quyền_lợi": "Không có thông tin về hợp đồng bảo hiểm",
                    "chi_phí_tổng_thể_hàng_năm": "Không có thông tin về hợp đồng bảo hiểm",
                    "giá_trị_hoàn_lại": "Không có thông tin về hợp đồng bảo hiểm",
                    "các_điều_khoản_loại_trừ": "Không có thông tin về hợp đồng bảo hiểm",
                    "quy_trình_claim": "Không có thông tin về hợp đồng bảo hiểm"
                })

            # Initialize conversation
            messages = [
                {
                    "role": "user",
                    "content": f"Tôi sẽ gửi cho bạn một hợp đồng bảo hiểm để phân tích từng phần. Đây là nội dung hợp đồng:\n\n{contract_text}"
                }
            ]

            # Initialize results dictionary
            analysis = {}

            # Analyze Quyền lợi
            messages.append({
                "role": "assistant",
                "content": "Tôi đã đọc nội dung hợp đồng. Hãy bắt đầu phân tích từng phần."
            })
            messages.append({
                "role": "user",
                "content": "Hãy phân tích phần Quyền lợi của hợp đồng. Liệt kê tất cả quyền lợi bảo hiểm, chi tiết mức bảo hiểm, điều kiện áp dụng. Trích dẫn chính xác các điều khoản liên quan."
            })
            response = client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=4000,
                temperature=0,
                system="Bạn là chuyên gia phân tích hợp đồng bảo hiểm. Hãy phân tích kỹ lưỡng và trích xuất thông tin chi tiết bằng tiếng Việt. Với mỗi phần, hãy trích dẫn chính xác điều khoản liên quan, sử dụng danh sách có dấu gạch đầu dòng (-) và bảng markdown khi cần thiết.",
                messages=messages
            )
            analysis["quyền_lợi"] = response.content[0].text
            messages.append({"role": "assistant", "content": response.content[0].text})

            # Analyze Chi phí
            messages.append({
                "role": "user",
                "content": "Tiếp theo, hãy phân tích Chi phí tổng thể/hàng năm. Bao gồm phí bảo hiểm cơ bản, các loại phí khác, lịch đóng phí. Trích dẫn biểu phí cụ thể."
            })
            response = client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=4000,
                temperature=0,
                system="Bạn là chuyên gia phân tích hợp đồng bảo hiểm. Hãy phân tích kỹ lưỡng và trích xuất thông tin chi tiết bằng tiếng Việt. Với mỗi phần, hãy trích dẫn chính xác điều khoản liên quan, sử dụng danh sách có dấu gạch đầu dòng (-) và bảng markdown khi cần thiết.",
                messages=messages
            )
            analysis["chi_phí_tổng_thể_hàng_năm"] = response.content[0].text
            messages.append({"role": "assistant", "content": response.content[0].text})

            # Analyze Giá trị hoàn lại
            messages.append({
                "role": "user",
                "content": "Tiếp theo, hãy phân tích Giá trị hoàn lại. Giải thích cách tính, điều kiện áp dụng, và bảng tỷ lệ phí hủy hợp đồng theo năm."
            })
            response = client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=4000,
                temperature=0,
                system="Bạn là chuyên gia phân tích hợp đồng bảo hiểm. Hãy phân tích kỹ lưỡng và trích xuất thông tin chi tiết bằng tiếng Việt. Với mỗi phần, hãy trích dẫn chính xác điều khoản liên quan, sử dụng danh sách có dấu gạch đầu dòng (-) và bảng markdown khi cần thiết.",
                messages=messages
            )
            analysis["giá_trị_hoàn_lại"] = response.content[0].text
            messages.append({"role": "assistant", "content": response.content[0].text})

            # Analyze Điều khoản loại trừ
            messages.append({
                "role": "user",
                "content": "Tiếp theo, hãy phân tích các Điều khoản loại trừ. Liệt kê và giải thích chi tiết từng trường hợp loại trừ, điều kiện đặc biệt."
            })
            response = client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=4000,
                temperature=0,
                system="Bạn là chuyên gia phân tích hợp đồng bảo hiểm. Hãy phân tích kỹ lưỡng và trích xuất thông tin chi tiết bằng tiếng Việt. Với mỗi phần, hãy trích dẫn chính xác điều khoản liên quan, sử dụng danh sách có dấu gạch đầu dòng (-) và bảng markdown khi cần thiết.",
                messages=messages
            )
            analysis["các_điều_khoản_loại_trừ"] = response.content[0].text
            messages.append({"role": "assistant", "content": response.content[0].text})

            # Analyze Quy trình claim
            messages.append({
                "role": "user",
                "content": "Cuối cùng, hãy phân tích Quy trình claim. Mô tả các bước thực hiện, hồ sơ yêu cầu, thời hạn nộp hồ sơ."
            })
            response = client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=4000,
                temperature=0,
                system="Bạn là chuyên gia phân tích hợp đồng bảo hiểm. Hãy phân tích kỹ lưỡng và trích xuất thông tin chi tiết bằng tiếng Việt. Với mỗi phần, hãy trích dẫn chính xác điều khoản liên quan, sử dụng danh sách có dấu gạch đầu dòng (-) và bảng markdown khi cần thiết.",
                messages=messages
            )
            analysis["quy_trình_claim"] = response.content[0].text

            # Format the final response as JSON
            final_response = {
                "ocr_text": contract_text,
                "quyền_lợi": analysis["quyền_lợi"].strip(),
                "chi_phí_tổng_thể_hàng_năm": analysis["chi_phí_tổng_thể_hàng_năm"].strip(),
                "giá_trị_hoàn_lại": analysis["giá_trị_hoàn_lại"].strip(),
                "các_điều_khoản_loại_trừ": analysis["các_điều_khoản_loại_trừ"].strip(),
                "quy_trình_claim": analysis["quy_trình_claim"].strip()
            }

            return JSONResponse(content=final_response)

    except Exception as e:
        logger.error(f"Error in analyze_contract: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Serve index.html at root
@app.get("/")
async def read_root():
    return FileResponse("static/index.html")

# Health check endpoint for Vercel
@app.get("/health")
async def health_check():
    return {"status": "healthy"}
