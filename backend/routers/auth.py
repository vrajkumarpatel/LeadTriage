"""Auth endpoint: POST /api/v1/auth/login."""
import logging

from fastapi import APIRouter, HTTPException, status

from schemas import LoginRequest, TokenResponse
from services.auth_service import create_access_token, verify_admin_credentials

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Log in as the single admin user",
    description="Checks the given username/password against ADMIN_USERNAME / "
    "ADMIN_PASSWORD_HASH env vars and returns a bearer JWT on success.",
)
def login(payload: LoginRequest) -> TokenResponse:
    if not verify_admin_credentials(payload.username, payload.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")

    token = create_access_token(subject=payload.username)
    return TokenResponse(access_token=token, token_type="bearer")
