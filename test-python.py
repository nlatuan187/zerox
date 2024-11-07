import logging
from pyzerox import zerox
import os
import asyncio
import sys

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s',
    stream=sys.stdout
)

async def main():
    try:
        file_path = os.path.join(os.path.dirname(__file__), "examples", "generali test.pdf")
        output_dir = "./output"
        
        # Clean up output directory
        if os.path.exists(output_dir):
            import shutil
            shutil.rmtree(output_dir)
        os.makedirs(output_dir)
        
        print(f"\nProcessing Vietnamese PDF: {file_path}")
        print(f"File exists: {os.path.exists(file_path)}")
        print(f"File size: {os.path.getsize(file_path)} bytes")
        
        # Process first three pages
        print("\nProcessing first three pages...")
        result = await zerox(
            file_path=file_path,
            model="gpt-4o-mini",
            output_dir=output_dir,
            select_pages=[1, 2, 3],  # Process first three pages
            cleanup=False,  # Keep temporary files
            concurrency=1,  # Process one page at a time
            maintain_format=False
        )
        
        print("\nProcessing complete!")
        print("Result:", result)
        
        # Check output
        if os.path.exists(output_dir):
            print("\nFiles in output directory:")
            for file in os.listdir(output_dir):
                print(f"- {file}")
                if file.endswith('.md'):
                    with open(os.path.join(output_dir, file), 'r') as f:
                        print("\nMarkdown content:")
                        print(f.read())
        
    except Exception as e:
        print(f"\nError occurred: {type(e).__name__}")
        print(f"Error message: {str(e)}")
        import traceback
        print("\nFull traceback:")
        print(traceback.format_exc())

if __name__ == "__main__":
    print("Script started")
    asyncio.run(main())
    print("Script finished")
