from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import Organization, User, UserRole
from app.core.security import verify_password, get_password_hash, create_access_token, decode_access_token


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def authenticate(self, email: str, password: str) -> Optional[User]:
        result = await self.db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if not user or not verify_password(password, user.hashed_password):
            return None
        if not user.is_active:
            return None
        return user

    async def register(self, email: str, password: str, full_name: str, organization_name: str) -> User:
        slug = organization_name.lower().replace(" ", "-")
        result = await self.db.execute(select(Organization).where(Organization.slug == slug))
        org = result.scalar_one_or_none()
        if not org:
            org = Organization(
                name=organization_name,
                slug=slug,
            )
            self.db.add(org)
            await self.db.flush()

        result = await self.db.execute(select(User).where(User.email == email))
        if result.scalar_one_or_none():
            raise ValueError("User with this email already exists")

        user = User(
            email=email,
            hashed_password=get_password_hash(password),
            full_name=full_name,
            organization_id=org.id,
            role=UserRole.ADMIN,
        )
        self.db.add(user)
        await self.db.flush()
        return user

    async def get_current_user(self, token: str) -> Optional[User]:
        payload = decode_access_token(token)
        if payload is None:
            return None
        user_id = payload.get("sub")
        if not user_id:
            return None
        result = await self.db.execute(
            select(User).options(selectinload(User.organization)).where(User.id == user_id)
        )
        return result.scalar_one_or_none()

    def create_token(self, user: User, remember_me: bool = False) -> dict:
        expires_in = 60 * 24 * 30 if remember_me else 480
        token = create_access_token(
            data={"sub": str(user.id), "org": str(user.organization_id), "role": user.role.value},
        )
        return {"access_token": token, "token_type": "bearer", "expires_in": expires_in}

    async def change_password(self, user: User, current_password: str, new_password: str) -> bool:
        if not verify_password(current_password, user.hashed_password):
            return False
        user.hashed_password = get_password_hash(new_password)
        await self.db.flush()
        return True

    async def update_profile(self, user: User, full_name: Optional[str] = None, theme_preference: Optional[str] = None) -> User:
        if full_name:
            user.full_name = full_name
        if theme_preference:
            user.theme_preference = theme_preference
        await self.db.flush()
        return user
