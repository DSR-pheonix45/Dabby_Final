import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from groq import Groq
from services.groq_pool import GroqPool

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
    
    try:
        # Attempt generation with primary model using the key pool
        completion = GroqPool.execute(
            lambda client: client.chat.completions.create(
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
                completion = GroqPool.execute(
                    lambda client: client.chat.completions.create(
                        model=request.fallbackModel,
                        messages=[
                            {"role": "system", "content": request.systemPrompt},
                            {"role": "user", "content": request.userMsg}
                        ],
                        response_format={"type": "json_object"}
                    )
                )
                content = completion.choices[0].message.content
                return {"content": content}
            except Exception as fe:
                print(f"[ERROR] Fallback model also failed: {str(fe)}")
                raise HTTPException(status_code=500, detail=f"AI Generation failed: {str(fe)}")
        
        raise HTTPException(status_code=500, detail=str(e))

from typing import Optional

class CategorizeRequest(BaseModel):
    description: str
    labels: Optional[list] = None
    accounts: Optional[list] = None

@router.post("/categorize-transaction")
async def categorize_transaction(request: CategorizeRequest):
    from services.ai_service import ai_service
    accs = request.labels if request.labels is not None else (request.accounts or [])
    res = await ai_service.categorize_transaction(request.description, accs)
    return res
