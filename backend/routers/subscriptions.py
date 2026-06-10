"""
Subscriptions Router — replaces the 'create-subscription' Supabase Edge Function.
Uses the Razorpay Python SDK to create subscription links.
"""

import os
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, Dict, Any
from pydantic import BaseModel
from .auth_utils import get_user_id_from_header

router = APIRouter()

# Razorpay credentials from environment
RAZORPAY_KEY_ID = os.environ.get("RAZORPAY_KEY_ID", "").strip()
RAZORPAY_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET", "").strip()


class SubscriptionCreate(BaseModel):
    plan_id: str
    total_count: int = 12
    customer_notify: int = 1
    customer: Optional[Dict[str, Any]] = None


@router.post("/create")
async def create_subscription(payload: SubscriptionCreate, x_user_id: str = Depends(get_user_id_from_header)):
    """
    Creates a Razorpay subscription link.
    Replaces the 'create-subscription' Edge Function.
    """
    try:
        if not x_user_id:
            raise HTTPException(status_code=401, detail="Not authenticated")

        if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET:
            raise HTTPException(
                status_code=500,
                detail="Razorpay credentials not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env.local"
            )

        try:
            import razorpay
        except ImportError:
            raise HTTPException(
                status_code=500,
                detail="razorpay package not installed. Run: pip install razorpay"
            )

        client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

        subscription_data = {
            "plan_id": payload.plan_id,
            "total_count": payload.total_count,
            "customer_notify": payload.customer_notify,
        }

        # Add customer details if provided
        if payload.customer:
            subscription_data["customer"] = payload.customer

        subscription = client.subscription.create(subscription_data)

        return {
            "id": subscription.get("id"),
            "short_url": subscription.get("short_url"),
            "status": subscription.get("status"),
            "plan_id": subscription.get("plan_id"),
            "total_count": subscription.get("total_count"),
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] create_subscription failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
