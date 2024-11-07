import os
import tempfile
from typing import List, Optional
from PIL import Image
import aiofiles
from ..models.modellitellm import litellmmodel
from .types import Page, ZeroxOutput

async def process_image(image_path: str, model: str = "gpt-4o-mini", page_num: int = 1) -> Optional[Page]:
    try:
        llm = litellmmodel(model=model)
        content = await llm.completion(image_path=image_path)
        
        if content:
            return Page(
                content=content,
                page=page_num,
                content_length=len(content)
            )
        return None
    except Exception as e:
        print(f"Error processing image: {str(e)}")
        return None

async def zerox(
    file_path: str,
    model: str = "gpt-4o-mini",
    cleanup: bool = True
) -> ZeroxOutput:
    try:
        # Process single image
        if file_path.lower().endswith(('.png', '.jpg', '.jpeg')):
            page = await process_image(file_path, model)
            if page:
                return ZeroxOutput(
                    pages=[page],
                    total_pages=1,
                    total_content_length=page.content_length
                )
            return ZeroxOutput(pages=[], total_pages=0, total_content_length=0)

        # Process PDF by treating each page as an image
        pages: List[Page] = []
        total_content_length = 0

        # Create temp directory for image files
        with tempfile.TemporaryDirectory() as temp_dir:
            try:
                # Convert PDF pages to images
                images = convert_from_path(file_path)
                
                # Process each page
                for i, image in enumerate(images, start=1):
                    # Save image temporarily
                    image_path = os.path.join(temp_dir, f'page_{i}.png')
                    image.save(image_path, 'PNG')
                    
                    # Process the image
                    page = await process_image(image_path, model, i)
                    if page:
                        pages.append(page)
                        total_content_length += page.content_length

            except Exception as e:
                print(f"Error converting PDF to images: {str(e)}")
                return ZeroxOutput(
                    pages=[],
                    total_pages=0,
                    total_content_length=0,
                    error=str(e)
                )

        return ZeroxOutput(
            pages=pages,
            total_pages=len(pages),
            total_content_length=total_content_length
        )

    except Exception as e:
        print(f"Error in zerox: {str(e)}")
        return ZeroxOutput(
            pages=[],
            total_pages=0,
            total_content_length=0,
            error=str(e)
        )
    finally:
        if cleanup and os.path.exists(file_path):
            try:
                os.remove(file_path)
            except:
                pass
