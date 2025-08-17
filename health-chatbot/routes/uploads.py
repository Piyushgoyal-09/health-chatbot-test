"""
File upload routes for the Elyx Health Concierge API
"""
import base64
import io
from fastapi import APIRouter, HTTPException, UploadFile, File
from PIL import Image
from utils import process_pdf_bytes

router = APIRouter()


@router.post("/upload/pdf")
async def upload_pdf(file: UploadFile = File(...)):
    """Extract text from uploaded PDF"""
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="File must be a PDF")
    
    try:
        pdf_bytes = await file.read()
        text = process_pdf_bytes(pdf_bytes)
        return {"text": text, "filename": file.filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing PDF: {str(e)}")


@router.post("/upload/image")
async def upload_image(file: UploadFile = File(...)):
    """Process and return base64 encoded image"""
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    try:
        image_bytes = await file.read()
        image_base64 = base64.b64encode(image_bytes).decode()
        
        # Validate image can be processed
        image = Image.open(io.BytesIO(image_bytes))
        
        return {
            "image_data": f"data:{file.content_type};base64,{image_base64}",
            "filename": file.filename,
            "size": {"width": image.width, "height": image.height}
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")
