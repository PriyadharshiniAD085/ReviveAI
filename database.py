import os
import hashlib
import secrets
import hmac

from dotenv import load_dotenv

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()


DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "mysql+pymysql://root:@localhost/reviveai"
)


if DATABASE_URL.startswith("sqlite"):

    engine = create_engine(
        DATABASE_URL,
        connect_args={
            "check_same_thread": False
        },
        pool_pre_ping=True
    )

else:

    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=1800,
        pool_size=5,
        max_overflow=5,
        pool_timeout=30
    )


SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


# ============================================================
# PASSWORD HASHING
# ============================================================

def hash_password(password: str) -> str:

    salt = secrets.token_hex(16)

    password_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        100000
    ).hex()

    return f"{salt}${password_hash}"


def verify_password(
    password: str,
    stored_password: str
) -> bool:

    try:

        salt, stored_hash = stored_password.split("$", 1)

        calculated_hash = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt.encode("utf-8"),
            100000
        ).hex()

        return hmac.compare_digest(
            calculated_hash,
            stored_hash
        )

    except (ValueError, AttributeError):

        return False


# ============================================================
# DATABASE INITIALIZATION
# ============================================================

def init_db():

    from app.models.models import (
        Transaction,
        RecoveryCase,
        AuditLog,
        Policy,
        User,
        PolicyCredential
    )

    Base.metadata.create_all(
        bind=engine
    )

    seed_default_policies()


def seed_default_policies():

    from app.models.models import Policy

    db = SessionLocal()

    try:

        default_policies = [

            {
                "code": "P-001",
                "name": "Maximum Recovery Amount",
                "description":
                    "Maximum amount allowed for automatic recovery per case.",
                "value": 50000,
                "enabled": True,
            },

            {
                "code": "P-002",
                "name": "Maximum Recovery Attempts",
                "description":
                    "Maximum number of recovery attempts per customer per day.",
                "value": 3,
                "enabled": True,
            },

            {
                "code": "P-003",
                "name": "High Value Escalation",
                "description":
                    "Cases above this value require additional review.",
                "value": 10000,
                "enabled": True,
            },

            {
                "code": "P-004",
                "name": "Daily Recovery Limit",
                "description":
                    "Maximum total automatic recovery amount allowed per day.",
                "value": 100000,
                "enabled": True,
            },
        ]

        for policy_data in default_policies:

            existing = (
                db.query(Policy)
                .filter(
                    Policy.code ==
                    policy_data["code"]
                )
                .first()
            )

            if not existing:

                db.add(
                    Policy(**policy_data)
                )

        db.commit()

    finally:

        db.close()