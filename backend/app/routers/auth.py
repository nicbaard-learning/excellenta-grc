from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models import User
from app.schemas.auth import (
    LoginRequest, TokenResponse, RegisterRequest, UserResponse,
    ChangePasswordRequest, ForgotPasswordRequest, UpdateProfileRequest
)
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    user = await service.authenticate(request.email, request.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    token_data = service.create_token(user, remember_me=request.remember_me)
    return TokenResponse(**token_data)


@router.post("/register", response_model=TokenResponse)
async def register(request: RegisterRequest, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    try:
        user = await service.register(
            email=request.email,
            password=request.password,
            full_name=request.full_name,
            organization_name=request.organization_name,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    token_data = service.create_token(user)
    return TokenResponse(**token_data)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse(
        id=str(current_user.id),
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role.value,
        organization_id=str(current_user.organization_id),
        is_active=current_user.is_active,
        theme_preference=current_user.theme_preference,
        email_verified=current_user.email_verified,
        created_at=current_user.created_at,
    )


@router.put("/profile", response_model=UserResponse)
async def update_profile(
    request: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AuthService(db)
    user = await service.update_profile(
        current_user,
        full_name=request.full_name,
        theme_preference=request.theme_preference,
    )
    return UserResponse(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        role=user.role.value,
        organization_id=str(user.organization_id),
        is_active=user.is_active,
        theme_preference=user.theme_preference,
        email_verified=user.email_verified,
        created_at=user.created_at,
    )


@router.post("/change-password")
async def change_password(
    request: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AuthService(db)
    success = await service.change_password(current_user, request.current_password, request.new_password)
    if not success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
    return {"detail": "Password changed successfully"}
