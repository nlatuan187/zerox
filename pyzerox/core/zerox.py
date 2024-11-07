import os
import aioshutil as async_shutil
import tempfile
import warnings
from typing import List, Optional, Union, Iterable
from datetime import datetime
import aiofiles
import aiofiles.os as async_os
import asyncio

# Package Imports
from ..processor import (
    convert_pdf_to_images,
    download_file,
    process_page,
    process_pages_in_batches,
    create_selected_pages_pdf,
)
from ..errors import FileUnavailable
from ..constants.messages import Messages
from ..models import litellmmodel
from .types import Page, ZeroxOutput


async def zerox(
    cleanup: bool = True,
    concurrency: int = 10,
    file_path: Optional[str] = "",
    maintain_format: bool = False,
    model: str = "gpt-4o-mini",
    output_dir: Optional[str] = None,
    temp_dir: Optional[str] = None,
    custom_system_prompt: Optional[str] = None,
    select_pages: Optional[Union[int, Iterable[int]]] = None,
    **kwargs
) -> ZeroxOutput:
    """
    API to perform OCR to markdown using Vision models.
    Please setup the environment variables for the model and model provider before using this API. Refer: https://docs.litellm.ai/docs/providers

    :param cleanup: Whether to cleanup the temporary files after processing, defaults to True
    :type cleanup: bool, optional
    :param concurrency: The number of concurrent processes to run, defaults to 10
    :type concurrency: int, optional
    :param file_path: The path or URL to the PDF file to process.
    :type file_path: str, optional
    :param maintain_format: Whether to maintain the format from the previous page, defaults to False
    :type maintain_format: bool, optional
    :param model: The model to use for generating completions, defaults to "gpt-4o-mini". Note - Refer: https://docs.litellm.ai/docs/providers to pass correct model name as according to provider it might be different from actual name.
    :type model: str, optional
    :param output_dir: The directory to save the markdown output, defaults to None
    :type output_dir: str, optional
    :param temp_dir: The directory to store temporary files, defaults to some named folder in system's temp directory. If already exists, the contents will be deleted for zerox uses it.
    :type temp_dir: str, optional
    :param custom_system_prompt: The system prompt to use for the model, this overrides the default system prompt of zerox. Generally it is not required unless you want some specific behaviour. When set, it will raise a friendly warning, defaults to None
    :type custom_system_prompt: str, optional
    :param select_pages: Pages to process, can be a single page number or an iterable of page numbers, defaults to None
    :type select_pages: int or Iterable[int], optional

    :param kwargs: Additional keyword arguments to pass to the model.completion -> litellm.completion method. Refer: https://docs.litellm.ai/docs/providers and https://docs.litellm.ai/docs/completion/input
    :return: The markdown content generated by the model.
    """


    input_token_count = 0
    output_token_count = 0
    prior_page = ""
    aggregated_markdown: List[str] = []
    start_time = datetime.now()
    
    # File Path Validators
    if not file_path:
        raise FileUnavailable()
    
    # Create an instance of the litellm model interface
    vision_model = litellmmodel(model=model,**kwargs)

    # override the system prompt if a custom prompt is provided
    if custom_system_prompt:
        vision_model.system_prompt = custom_system_prompt

    # Check if both maintain_format and select_pages are provided
    if maintain_format and select_pages is not None:
        warnings.warn(Messages.MAINTAIN_FORMAT_SELECTED_PAGES_WARNING)

    # If select_pages is a single integer, convert it to a list for consistency
    if isinstance(select_pages, int):
        select_pages = [select_pages]

    # Sort the pages to maintain consistency
    if select_pages is not None:
        select_pages = sorted(select_pages)

    # Ensure the output directory exists
    if output_dir:
        await async_os.makedirs(output_dir, exist_ok=True)

    ## delete tmp_dir if exists and then recreate it
    if temp_dir:
        if os.path.exists(temp_dir):
            await async_shutil.rmtree(temp_dir)
        await async_os.makedirs(temp_dir, exist_ok=True)


    # Create a temporary directory to store the PDF and images
    with tempfile.TemporaryDirectory() as temp_dir_:

        if temp_dir:
            ## use the user provided temp directory
            temp_directory = temp_dir
        else:
            ## use the system temp directory
            temp_directory = temp_dir_

        # Download the PDF. Get file name.
        local_path = await download_file(file_path=file_path, temp_dir=temp_directory)
        if not local_path:
            raise FileUnavailable()
        
        raw_file_name = os.path.splitext(os.path.basename(local_path))[0]
        file_name = "".join(c.lower() if c.isalnum() else "_" for c in raw_file_name)
        # Truncate file name to 255 characters to prevent ENAMETOOLONG errors
        file_name = file_name[:255]

        # create a subset pdf in temp dir with only the requested pages if select_pages is provided
        if select_pages is not None:
            subset_pdf_create_kwargs = {"original_pdf_path":local_path, "select_pages":select_pages, 
                                    "save_directory":temp_directory, "suffix":"_selected_pages"}
            local_path = await asyncio.to_thread(create_selected_pages_pdf, 
                                                 **subset_pdf_create_kwargs)

        # Convert the file to a series of images, below function returns a list of image paths in page order
        images = await convert_pdf_to_images(local_path=local_path, temp_dir=temp_directory)

        if maintain_format:
            for image in images:
                result, input_token_count, output_token_count, prior_page = await process_page(
                    image,
                    vision_model,
                    temp_directory,
                    input_token_count,
                    output_token_count,
                    prior_page,
                )

                if result:
                    aggregated_markdown.append(result)
        else:
            results = await process_pages_in_batches(
                images,
                concurrency,
                vision_model,
                temp_directory,
                input_token_count,
                output_token_count,
                prior_page,
            )

            aggregated_markdown = [result[0] for result in results if isinstance(result[0], str)]

            ## add token usage
            input_token_count += sum([result[1] for result in results])
            output_token_count += sum([result[2] for result in results])

        # Write the aggregated markdown to a file
        if output_dir:
            result_file_path = os.path.join(output_dir, f"{file_name}.md")
            async with aiofiles.open(result_file_path, "w") as f:
                await f.write("\n\n".join(aggregated_markdown))

        # Cleanup the downloaded PDF file
        if cleanup and os.path.exists(temp_directory):
            await async_shutil.rmtree(temp_directory)

        # Format JSON response
        end_time = datetime.now()
        completion_time = (end_time - start_time).total_seconds() * 1000

        # Adjusting the formatted_pages logic to account for select_pages to output the correct page numbers
        if select_pages is not None:
            # Map aggregated markdown to the selected pages
            formatted_pages = [
                        Page(content=content, page=select_pages[i], content_length=len(content))
                        for i, content in enumerate(aggregated_markdown)
                    ]
        else:
            # Default behavior when no select_pages is provided
            formatted_pages = [
                        Page(content=content, page=i + 1, content_length=len(content))
                        for i, content in enumerate(aggregated_markdown)
                    ]

        return ZeroxOutput(
            completion_time=completion_time,
            file_name=file_name,
            input_tokens=input_token_count,
            output_tokens=output_token_count,
            pages=formatted_pages,
        )