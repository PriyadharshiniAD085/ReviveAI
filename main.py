from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
import hashlib

from app.database import SessionLocal
from app.database import init_db
from app.api.routes import router
from app.models.models import User
from app.database import verify_password


# ============================================================
# REVIVEAI APPLICATION
# ============================================================

app = FastAPI(
    title="ReviveAI Revenue Recovery Control Tower API",
    version="1.0.0"
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


# ============================================================
# DATABASE STARTUP
# ============================================================

@app.on_event("startup")
def startup():
    init_db()


# ============================================================
# LOGIN REQUEST
# ============================================================

class LoginRequest(BaseModel):
    email: str
    password: str


# ============================================================
# AUTHENTICATION
# ============================================================

@app.post("/api/auth/login")
def login(payload: LoginRequest):

    db: Session = SessionLocal()

    try:

        # ----------------------------------------------------
        # VALIDATE INPUT
        # ----------------------------------------------------

        email = payload.email.strip().lower()
        password = payload.password

        if not email or not password:

            raise HTTPException(
                status_code=400,
                detail="Email and password are required."
            )


        # ----------------------------------------------------
        # FIND USER
        # ----------------------------------------------------

        user = (
            db.query(User)
            .filter(User.email == email)
            .first()
        )

        if user is None:

            raise HTTPException(
                status_code=401,
                detail="Invalid email or password."
            )


        # ----------------------------------------------------
        # VERIFY PASSWORD
        #
        # Database format:
        #
        # salt$hash
        #
        # Example:
        #
        # e9ee0a54...$919a8c3c...
        #
        # ----------------------------------------------------

        stored_password = user.password_hash

        password_valid = False

        try:

            if "$" in stored_password:

                salt, expected_hash = (
                    stored_password.split("$", 1)
                )

                # SHA-256 password verification
                calculated_hash = hashlib.sha256(
                    (password + salt).encode("utf-8")
                ).hexdigest()

                password_valid = (
                    calculated_hash == expected_hash
                )

        except Exception as e:

            print(
                "PASSWORD VERIFICATION ERROR:",
                e
            )

            password_valid = False


        # ----------------------------------------------------
        # INVALID PASSWORD
        # ----------------------------------------------------

        if not password_valid:

            raise HTTPException(
                status_code=401,
                detail="Invalid email or password."
            )


        # ----------------------------------------------------
        # SUCCESS
        # ----------------------------------------------------

        return {

            "success": True,

            "message":
                "Login successful",

            "user": {

                "id":
                    user.id,

                "email":
                    user.email,

                "role":
                    user.role

            }

        }

    finally:

        db.close()


# ============================================================
# API ROUTER
# ============================================================

app.include_router(
    router,
    prefix="/api"
)


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():

    return {

        "project":
            "ReviveAI",

        "status":
            "running",

        "message":
            "Revenue Recovery Control Tower API"

    }


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/health")
def health():

    return {

        "status":
            "healthy"

    }