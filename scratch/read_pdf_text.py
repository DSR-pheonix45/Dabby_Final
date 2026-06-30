import io
from pypdf import PdfReader

def read_pdf():
    filepath = "/Users/chirayumarathe/Documents/Dabby_Final/backend/routers/0338e803-e024-4bae-bfcd-e0f88262770d/jfzlp702tbb.pdf"
    reader = PdfReader(filepath)
    print(f"Total pages: {len(reader.pages)}")
    for i, page in enumerate(reader.pages):
        print(f"--- Page {i+1} ---")
        text = page.extract_text()
        print(text)

if __name__ == "__main__":
    read_pdf()
