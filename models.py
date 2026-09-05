from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    DateTime,
    Boolean,
    Text
)

from app.database import Base


# ============================================================
# USERS
# ============================================================

class User(Base):

    __tablename__ = "users"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    email = Column(
        String(255),
        unique=True,
        nullable=False,
        index=True
    )

    password_hash = Column(
        String(255),
        nullable=False
    )

    role = Column(
        String(50),
        nullable=False,
        default="ADMIN"
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )


# ============================================================
# POLICY SAFETY LOCKER CREDENTIAL
# ============================================================

class PolicyCredential(Base):

    __tablename__ = "policy_credentials"

    id = Column(
        Integer,
        primary_key=True
    )

    password_hash = Column(
        String(255),
        nullable=False
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )


# ============================================================
# TRANSACTIONS
# ============================================================

class Transaction(Base):

    __tablename__ = "transactions"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    payment_id = Column(
        String(120),
        unique=True,
        index=True,
        nullable=True
    )

    order_id = Column(
        String(120),
        nullable=True
    )

    amount = Column(
        Float,
        nullable=False
    )

    currency = Column(
        String(10),
        default="INR"
    )

    method = Column(
        String(30),
        nullable=True
    )

    status = Column(
        String(30),
        nullable=False
    )

    failure_reason = Column(
        String(255),
        nullable=True
    )

    customer_email = Column(
        String(255),
        nullable=True
    )

    recovered = Column(
        Boolean,
        default=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )


# ============================================================
# RECOVERY CASE
# ============================================================

class RecoveryCase(Base):

    __tablename__ = "recovery_cases"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    transaction_id = Column(
        Integer,
        nullable=False,
        index=True
    )

    # --------------------------------------------------------
    # Risk
    # --------------------------------------------------------

    risk_score = Column(
        Float,
        default=0
    )

    # --------------------------------------------------------
    # ML
    # --------------------------------------------------------

    ml_decision = Column(
        String(50),
        nullable=True
    )

    ml_probability = Column(
        Float,
        nullable=True
    )

    # --------------------------------------------------------
    # AI diagnosis
    # --------------------------------------------------------

    diagnosis = Column(
        String(255),
        nullable=True
    )

    recommended_action = Column(
        String(100),
        nullable=True
    )

    # --------------------------------------------------------
    # Workflow
    # --------------------------------------------------------

    status = Column(
        String(50),
        default="OPEN"
    )

    escalation_level = Column(
        String(50),
        default="NONE"
    )

    recovery_amount = Column(
        Float,
        default=0
    )

    # --------------------------------------------------------
    # Safety
    # --------------------------------------------------------

    stopping_rule = Column(
        String(255),
        nullable=True
    )

    # --------------------------------------------------------
    # Timestamps
    # --------------------------------------------------------

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )


# ============================================================
# AUDIT LOG
# ============================================================

class AuditLog(Base):

    __tablename__ = "audit_logs"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    case_id = Column(
        Integer,
        nullable=True,
        index=True
    )

    action = Column(
        String(100),
        nullable=False
    )

    actor = Column(
        String(100),
        default="ReviveAI Agent"
    )

    reason = Column(
        Text,
        nullable=True
    )

    result = Column(
        String(255),
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )


# ============================================================
# POLICY
# ============================================================

class Policy(Base):

    __tablename__ = "policies"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    code = Column(
        String(20),
        unique=True,
        nullable=False,
        index=True
    )

    name = Column(
        String(100),
        nullable=False
    )

    description = Column(
        String(255),
        nullable=True
    )

    value = Column(
        Float,
        nullable=False,
        default=0
    )

    enabled = Column(
        Boolean,
        default=True
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )