import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from groq import Groq

router = APIRouter()

# Router level initialization deferred to request handler
class TemplateGenRequest(BaseModel):
    systemPrompt: str
    userMsg: str
    model: str
    fallbackModel: Optional[str] = None

@router.post("/generate-template")
async def generate_template(request: TemplateGenRequest):
    print(f"[DEBUG] Received template generation request for model: {request.model}")
    
    # Get key at runtime
    groq_key = os.environ.get("VITE_GROQ_API_KEY") or os.environ.get("GROQ_API_KEY")
    
    if not groq_key:
        print("[ERROR] GROQ API Key not found in environment variables (VITE_GROQ_API_KEY or GROQ_API_KEY)")
        raise HTTPException(status_code=500, detail="GROQ_API_KEY is not configured on the server")

    # Sanitize key (remove spaces, quotes)
    sanitized_key = groq_key.strip().strip('"').strip("'")
    client = Groq(api_key=sanitized_key)
    try:
        # Attempt generation with primary model
        completion = client.chat.completions.create(
            model=request.model,
            messages=[
                {"role": "system", "content": request.systemPrompt},
                {"role": "user", "content": request.userMsg}
            ],
            temperature=0.7,
            max_tokens=2048,
            top_p=1,
            stream=False,
            response_format={"type": "json_object"}
        )
        
        content = completion.choices[0].message.content
        print("[DEBUG] AI Response received successfully")
        return {"content": content}
        
    except Exception as e:
        print(f"[WARNING] Primary model failed: {str(e)}")
        
        # Try fallback if primary fails and fallback is provided
        if request.fallbackModel:
            try:
                print(f"[DEBUG] Attempting fallback model: {request.fallbackModel}")
                completion = client.chat.completions.create(
                    model=request.fallbackModel,
                    messages=[
                        {"role": "system", "content": request.systemPrompt},
                        {"role": "user", "content": request.userMsg}
                    ],
                    response_format={"type": "json_object"}
                )
                content = completion.choices[0].message.content
                return {"content": content}
            except Exception as fe:
                print(f"[ERROR] Fallback model also failed: {str(fe)}")
                raise HTTPException(status_code=500, detail=f"AI Generation failed: {str(fe)}")
        
        raise HTTPException(status_code=500, detail=str(e))

class CategorizeRequest(BaseModel):
    description: str
    accounts: list  # List of workbench_accounts

@router.post("/categorize-transaction")
async def categorize_transaction(request: CategorizeRequest):
    from services.ai_service import ai_service
    res = await ai_service.categorize_transaction(request.description, request.accounts)
    return res
