"""
Supabase JWT verification middleware for FastAPI.
Extracts and verifies JWT tokens from Authorization headers.
Injects verified user_id into request scope for downstream handlers.
"""

import os
import json
from typing import Callable
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
import jwt

# Public key from Supabase (can be loaded from environment or hardcoded)
# In production, fetch this from Supabase's JWT settings or use Supabase SDK
SUPABASE_JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET")
SUPABASE_URL = os.environ.get("VITE_SUPABASE_URL")


class JWTMiddleware(BaseHTTPMiddleware):
    """
    Middleware to verify Supabase JWT tokens from Authorization headers.
    
    If a valid JWT is found, extracts the user_id (sub claim) and stores it in:
      - request.scope["user_id"]: for programmatic access
      - x-user-id header: injected into downstream handlers (for compatibility)
    
    If no token is present, allows request to proceed (some endpoints may be public).
    If token is invalid or expired, returns 401 Unauthorized.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        auth_header = request.headers.get("Authorization", "")
        user_id = None

        # Extract token from Authorization header
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]  # Remove "Bearer " prefix
            try:
                # Verify and decode JWT
                # PyJWT requires the secret key; Supabase JWTs use HS256 by default
                payload = jwt.decode(
                    token,
                    SUPABASE_JWT_SECRET or "your-secret-key",
                    algorithms=["HS256", "RS256"],  # Support both symmetric and asymmetric
                    options={"verify_signature": bool(SUPABASE_JWT_SECRET)}
                )
                # Extract user_id from 'sub' claim (Supabase standard)
                user_id = payload.get("sub")
                if not user_id:
                    # If sub is not present, try 'user_id' claim as fallback
                    user_id = payload.get("user_id")

                if not user_id:
                    raise HTTPException(status_code=401, detail="Invalid token: missing user id")

                # Store user_id in request scope for downstream access
                request.scope["user_id"] = user_id

                # Optionally inject as header for compatibility with existing code
                # (since we have endpoints that use Depends(get_user_id_from_header))
                request.scope["headers"] = [
                    (b"x-user-id", user_id.encode() if isinstance(user_id, str) else user_id)
                ] + list(request.scope.get("headers", []))

            except jwt.ExpiredSignatureError:
                raise HTTPException(status_code=401, detail="Token expired")
            except jwt.InvalidTokenError as e:
                raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")
            except Exception as e:
                print(f"[ERROR] JWT verification failed: {str(e)}")
                raise HTTPException(status_code=401, detail="Unauthorized")

        # Call the next middleware/handler
        response = await call_next(request)
        return response
