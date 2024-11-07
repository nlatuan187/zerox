import os
from PyPDF2 import PdfReader

def test_pdf():
    try:
        # Test with test.pdf first
        test_pdf_path = os.path.join(os.path.dirname(__file__), "examples", "test.pdf")
        print("\nTesting test.pdf...")
        print(f"File exists: {os.path.exists(test_pdf_path)}")
        if os.path.exists(test_pdf_path):
            reader = PdfReader(test_pdf_path)
            print(f"Number of pages: {len(reader.pages)}")
            print("First page text preview:", reader.pages[0].extract_text()[:100])

        # Then test generali pdf
        generali_pdf_path = os.path.join(os.path.dirname(__file__), "examples", "generali test.pdf")
        print("\nTesting generali test.pdf...")
        print(f"File exists: {os.path.exists(generali_pdf_path)}")
        if os.path.exists(generali_pdf_path):
            reader = PdfReader(generali_pdf_path)
            print(f"Number of pages: {len(reader.pages)}")
            print("First page text preview:", reader.pages[0].extract_text()[:100])

    except Exception as e:
        print(f"\nError occurred: {type(e).__name__}")
        print(f"Error message: {str(e)}")
        import traceback
        print("\nFull traceback:")
        print(traceback.format_exc())

if __name__ == "__main__":
    print("Starting PDF test")
    test_pdf()
    print("Test complete")
