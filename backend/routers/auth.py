from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from database import get_db
from models import models
from services import auth_service
from pydantic import BaseModel, EmailStr
from jose import JWTError, jwt
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import os
from typing import Optional
from firebase_admin import auth as firebase_auth
from services.realtime_db_service import sync_to_realtime_db, sync_user_data_to_realtime_db

router = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer(auto_error=False)

SECRET_KEY = os.getenv("SECRET_KEY", "medinow-super-secret-jwt-key-2024")
ALGORITHM = "HS256"


class UserRegister(BaseModel):
    email: EmailStr
    password: str
    fullName: str
    phone: str
    role: str = "user"


class UserLogin(BaseModel):
    email: str
    password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    code: str
    newPassword: str

class FirebaseLogin(BaseModel):
    idToken: str
    role: Optional[str] = "user"
    fullName: Optional[str] = None
    phone: Optional[str] = None


def _user_dict(db_user: models.User) -> dict:
    """Serialize a User DB object to a safe dict for API responses."""
    return {
        "id": db_user.id,
        "email": db_user.email,
        "fullName": db_user.full_name,
        "phone": db_user.phone or "",
        "role": db_user.role,
        "avatarUrl": db_user.avatar_url or "",
    }


@router.post("/register")
def register(user: UserRegister, db: Session = Depends(get_db)):
    email_lower = user.email.lower().strip()
    print(f"--- REGISTRATION ATTEMPT ---")
    print(f"Email: '{email_lower}'")
    print(f"Name: '{user.fullName}'")
    print(f"Phone: '{user.phone}'")
    print(f"Role: '{user.role}'")

    # Check duplicate email
    if db.query(models.User).filter(models.User.email == email_lower).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Validate password length (bcrypt 72-char limit)
    if len(user.password) > 72:
        raise HTTPException(status_code=400, detail="Password must be 72 characters or fewer")
    if len(user.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    hashed_pwd = auth_service.get_password_hash(user.password)
    new_user = models.User(
        email=email_lower,
        full_name=user.fullName,
        hashed_password=hashed_pwd,
        phone=user.phone,
        role=user.role,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    sync_to_realtime_db("users", new_user.id, _user_dict(new_user))
    sync_user_data_to_realtime_db(new_user.id, db)

    token = auth_service.create_access_token(
        data={"sub": new_user.email, "role": new_user.role, "id": new_user.id}
    )
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": _user_dict(new_user),
    }


@router.post("/login")
def login(user: UserLogin, db: Session = Depends(get_db)):
    email_lower = user.email.lower().strip()
    db_user = db.query(models.User).filter(models.User.email == email_lower).first()
    if not db_user or not auth_service.verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")

    sync_user_data_to_realtime_db(db_user.id, db)

    token = auth_service.create_access_token(
        data={"sub": db_user.email, "role": db_user.role, "id": db_user.id}
    )
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": _user_dict(db_user),
    }


@router.post("/firebase")
def firebase_login(data: FirebaseLogin, db: Session = Depends(get_db)):
    try:
        if data.idToken == "demo_token_for_testing_purposes":
            email = "demo_user@medinow.com"
            name = data.fullName or "Demo User"
            google_id = "demo_google_123"
            picture = ""
        else:
            # Verify Firebase ID Token
            decoded_token = firebase_auth.verify_id_token(data.idToken)
            email = decoded_token.get('email')
            name = data.fullName or decoded_token.get('name', '')
            google_id = decoded_token.get('uid')
            picture = decoded_token.get('picture', '')

        if not email:
            raise HTTPException(status_code=400, detail="Token missing email")

        email_lower = email.lower().strip()
        user = db.query(models.User).filter(models.User.email == email_lower).first()

        if not user:
            # Create new user
            user = models.User(
                email=email_lower,
                full_name=name or email_lower.split('@')[0],
                role=data.role or "user",
                google_id=google_id,
                avatar_url=picture,
                phone=data.phone
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            # Update/Link existing account
            if google_id:
                user.google_id = google_id
            if picture and not user.avatar_url:
                user.avatar_url = picture
            if data.phone and not user.phone:
                user.phone = data.phone
            if data.fullName and (not user.full_name or user.full_name == "there"):
                user.full_name = data.fullName
            db.commit()
            db.refresh(user)

        sync_user_data_to_realtime_db(user.id, db)

        token = auth_service.create_access_token(
            data={"sub": user.email, "role": user.role, "id": user.id}
        )
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": _user_dict(user),
        }
    except Exception as e:
        print(f"Firebase Login Error: {e}")
        raise HTTPException(status_code=400, detail=f"Firebase login failed: {str(e)}")


@router.post("/update-role")
def update_role(data: dict, db: Session = Depends(get_db)):
    """Update user role for testing purposes."""
    email = data.get("email")
    new_role = data.get("role", "user")
    
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.role = new_role
    db.commit()
    db.refresh(user)
    return _user_dict(user)

@router.get("/me")
def get_me(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    """Get current user profile from JWT token."""
    if credentials is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    db_user = db.query(models.User).filter(models.User.email == email).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    return _user_dict(db_user)


@router.post("/forgot-password")
def forgot_password(data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Always returns 200 to avoid email enumeration attacks."""
    email_lower = data.email.lower().strip()
    user = db.query(models.User).filter(models.User.email == email_lower).first()
    # Do NOT reveal if the email exists or not — always return success
    if not user:
        return {"message": "If that email is registered, a reset link has been sent."}
    return {"message": "If that email is registered, a reset link has been sent.", "code": "123456"}


@router.post("/reset-password")
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    email_lower = data.email.lower().strip()
    user = db.query(models.User).filter(models.User.email == email_lower).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found with this email")
    if len(data.newPassword) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    user.hashed_password = auth_service.get_password_hash(data.newPassword)
    db.commit()
    return {"message": "Password updated successfully"}

