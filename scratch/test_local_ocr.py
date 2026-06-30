import sys
from ocrmac import ocrmac

def test():
    image_path = "/Users/chirayumarathe/Documents/Dabby_Final/backend/routers/0338e803-e024-4bae-bfcd-e0f88262770d/h1yd5m8izvh.png"
    print(f"Running native macOS OCR on: {image_path}")
    try:
        annotations = ocrmac.OCR(image_path).recognize()
        print("OCR SUCCESS! Extracted lines:")
        full_text = " ".join([ann[0] for ann in annotations])
        print(full_text)
    except Exception as e:
        print(f"OCR ERROR: {e}")

if __name__ == "__main__":
    test()
