from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    BackgroundTasks,
)

from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import SessionLocal
from app.services.seed_service import ensure_demo_data
from app.services.recovery_engine import analyse
from app.services.audit_service import add_audit
from app.services.razorpay_service import RazorpayService
from app.services.ml_service import (
    load_model,
    predict_transaction,
)

from datetime import datetime, timezone
from pydantic import BaseModel
from typing import Optional
import threading

from app.models.models import (
    Transaction,
    RecoveryCase,
    AuditLog,
    Policy,
)


router = APIRouter()


# ============================================================
# POLICY RE-EVALUATION JOB STATUS
# ============================================================

policy_update_status = {
    "status": "idle",
    "progress": 0,
    "checked": 0,
    "total": 0,
    "message": "",
    "policy_code": None,
    "started_at": None,
    "completed_at": None,
    "re_evaluated_cases": 0,
    "changed_cases": 0,
    "newly_escalated_cases": 0,
    "error": None,
}

policy_update_lock = threading.Lock()


# ============================================================
# DATABASE
# ============================================================

def get_db():

    db = SessionLocal()

    try:
        yield db

    finally:
        db.close()


# ============================================================
# TRANSACTION RESPONSE
# ============================================================

def tx(x):

    return {
        "id": x.id,
        "payment_id": x.payment_id,
        "order_id": x.order_id,
        "amount": x.amount,
        "currency": x.currency,
        "method": x.method,
        "status": x.status,
        "failure_reason": x.failure_reason,
        "customer_email": x.customer_email,
        "created_at": x.created_at.isoformat(),
        "recovered": x.recovered,
    }


# ============================================================
# RECOVERY CASE RESPONSE
# ============================================================

def case(x, db):

    transaction = (
        db.query(Transaction)
        .filter(
            Transaction.id == x.transaction_id
        )
        .first()
    )

    return {
        "id": x.id,

        "transaction_id":
            x.transaction_id,

        "amount": (
            float(transaction.amount)
            if transaction
            else 0
        ),

        "risk_score":
            x.risk_score,

        "ml_decision":
            x.ml_decision,

        "ml_probability":
            x.ml_probability,

        "diagnosis":
            x.diagnosis,

        "recommended_action":
            x.recommended_action,

        "status":
            x.status,

        "escalation_level":
            x.escalation_level,

        "recovery_amount":
            x.recovery_amount,

        "stopping_rule":
            x.stopping_rule,

        "created_at":
            x.created_at.isoformat(),

        "updated_at":
            x.updated_at.isoformat(),
    }


# ============================================================
# DASHBOARD
# ============================================================

@router.get("/dashboard")
def dashboard(
    db: Session = Depends(get_db)
):

    ensure_demo_data(db)

    total = (
        db.query(
            func.coalesce(
                func.sum(
                    Transaction.amount
                ),
                0
            )
        )
        .scalar()
        or 0
    )

    failed = (
        db.query(
            func.coalesce(
                func.sum(
                    Transaction.amount
                ),
                0
            )
        )
        .filter(
            Transaction.status == "FAILED",
            Transaction.recovered == False
        )
        .scalar()
        or 0
    )

    recovered = (
        db.query(
            func.coalesce(
                func.sum(
                    RecoveryCase.recovery_amount
                ),
                0
            )
        )
        .scalar()
        or 0
    )

    failed_count = (
        db.query(
            func.count(
                Transaction.id
            )
        )
        .filter(
            Transaction.status == "FAILED"
        )
        .scalar()
        or 0
    )

    case_count = (
        db.query(
            func.count(
                RecoveryCase.id
            )
        )
        .scalar()
        or 0
    )

    attention_count = (
        db.query(
            func.count(
                RecoveryCase.id
            )
        )
        .filter(
            RecoveryCase.status == "ATTENTION"
        )
        .scalar()
        or 0
    )

    return {

        "transaction_count":
            db.query(
                func.count(
                    Transaction.id
                )
            ).scalar()
            or 0,

        "total_transaction_value":
            round(
                float(total),
                2
            ),

        "revenue_at_risk":
            round(
                float(failed),
                2
            ),

        "money_recovered":
            round(
                float(recovered),
                2
            ),

        "recovery_rate":
            round(
                recovered /
                (
                    recovered +
                    failed
                )
                * 100,
                1
            )
            if recovered + failed
            else 0,

        "failed_transactions":
            failed_count,

        "active_cases":
            case_count,

        "attention_cases":
            attention_count,

        "audit_trail":
            True,

        "stopping_rules":
            True,

        "compliant_escalation":
            True,
    }


# ============================================================
# RUN RECOVERY SCAN
# ============================================================

@router.post("/scan")
def scan(
    db: Session = Depends(get_db)
):

    ensure_demo_data(db)

    failed = (
        db.query(Transaction)
        .filter(
            Transaction.status == "FAILED",
            Transaction.recovered == False
        )
        .all()
    )

    created = 0
    re_evaluated = 0
    newly_escalated = 0

    for t in failed:

        # ----------------------------------------------------
        # CHECK EXISTING CASE
        # ----------------------------------------------------

        existing_case = (
            db.query(RecoveryCase)
            .filter(
                RecoveryCase.transaction_id
                == t.id
            )
            .first()
        )

        # ----------------------------------------------------
        # AI + POLICY ANALYSIS
        # ----------------------------------------------------

        d = analyse(
            t,
            db
        )

        # ----------------------------------------------------
        # CREATE NEW CASE
        # ----------------------------------------------------

        if not existing_case:

            c = RecoveryCase(
                transaction_id=t.id,
                **d
            )

            db.add(c)

            db.flush()

            add_audit(
                db,
                c.id,
                "CASE_CREATED",
                d["diagnosis"],
                f"Recommended action: "
                f"{d['recommended_action']}"
            )

            created += 1

        # ----------------------------------------------------
        # RE-EVALUATE EXISTING CASE
        # ----------------------------------------------------

        else:

            c = existing_case

            old_status = c.status
            old_action = (
                c.recommended_action
            )
            old_escalation = (
                c.escalation_level
            )

            c.risk_score = (
                d["risk_score"]
            )

            c.ml_decision = (
                d["ml_decision"]
            )

            c.ml_probability = (
                d["ml_probability"]
            )

            c.diagnosis = (
                d["diagnosis"]
            )

            c.recommended_action = (
                d["recommended_action"]
            )

            c.status = (
                d["status"]
            )

            c.escalation_level = (
                d["escalation_level"]
            )

            c.stopping_rule = (
                d["stopping_rule"]
            )

            c.updated_at = (
                datetime.now(
                    timezone.utc
                ).replace(
                    tzinfo=None
                )
            )

            re_evaluated += 1

            # ------------------------------------------------
            # AUDIT IF DECISION CHANGED
            # ------------------------------------------------

            if (
                old_status != c.status
                or old_action
                != c.recommended_action
                or old_escalation
                != c.escalation_level
            ):

                if (
                    c.escalation_level
                    == "MANUAL_REVIEW"
                    and
                    old_escalation
                    != "MANUAL_REVIEW"
                ):

                    newly_escalated += 1

                add_audit(
                    db,
                    case_id=c.id,
                    action="CASE_REEVALUATED",
                    actor=
                        "ReviveAI Policy Engine",
                    reason=(
                        "Recovery case re-evaluated "
                        "against current policies"
                    ),
                    result=(
                        f"{old_action} → "
                        f"{c.recommended_action}; "
                        f"{old_status} → "
                        f"{c.status}; "
                        f"{old_escalation} → "
                        f"{c.escalation_level}"
                    )
                )

    db.commit()

    return {

        "message":
            "Recovery scan completed",

        "transactions_scanned":
            db.query(
                Transaction
            ).count(),

        "failed_transactions":
            len(failed),

        "new_cases":
            created,

        "re_evaluated_cases":
            re_evaluated,

        "newly_escalated_cases":
            newly_escalated,
    }


# ============================================================
# ALL RECOVERY CASES
# ============================================================

@router.get("/cases")
def cases(
    db: Session = Depends(get_db)
):

    ensure_demo_data(db)

    # IMPORTANT:
    # Return ALL recovery cases.
    #
    # Do NOT use .limit(500).
    #
    # The Recovery frontend decides which
    # 100 cases to display.

    r = (
        db.query(RecoveryCase)
        .order_by(
            RecoveryCase.created_at.desc()
        )
        .all()
    )

    return {

        "items": [
            case(x, db)
            for x in r
        ],

        "total":
            len(r),
    }


# ============================================================
# SINGLE RECOVERY CASE
# ============================================================

@router.get("/cases/{case_id}")
def get_case(
    case_id: int,
    db: Session = Depends(get_db)
):

    c = (
        db.query(RecoveryCase)
        .filter(
            RecoveryCase.id == case_id
        )
        .first()
    )

    if not c:

        raise HTTPException(
            status_code=404,
            detail=
                "Recovery case not found"
        )

    return case(
        c,
        db
    )


# ============================================================
# AUTOMATED RECOVERY
# ============================================================

@router.post(
    "/cases/{case_id}/recover"
)
def recover(
    case_id: int,
    db: Session = Depends(get_db)
):

    c = (
        db.query(RecoveryCase)
        .filter(
            RecoveryCase.id == case_id
        )
        .first()
    )

    if not c:

        raise HTTPException(
            status_code=404,
            detail=
                "Recovery case not found"
        )

    # --------------------------------------------------------
    # ALREADY RECOVERED
    # --------------------------------------------------------

    if c.status == "RECOVERED":

        return {

            "success": True,

            "message":
                "Already recovered",

            "case":
                case(c, db),
        }

    # --------------------------------------------------------
    # MANUAL REVIEW STOPPING RULE
    # --------------------------------------------------------

    if (
        c.escalation_level
        == "MANUAL_REVIEW"
    ):

        c.status = "ATTENTION"

        add_audit(
            db,
            c.id,
            "RECOVERY_BLOCKED",
            c.stopping_rule
            or
            "Manual review required",
            "Automatic recovery stopped "
            "and escalated"
        )

        db.commit()

        return {

            "success": False,

            "message":
                "Automatic recovery stopped",

            "reason":
                "Manual review required",

            "case":
                case(c, db),
        }

    # --------------------------------------------------------
    # GET ORIGINAL TRANSACTION
    # --------------------------------------------------------

    t = (
        db.query(Transaction)
        .filter(
            Transaction.id
            == c.transaction_id
        )
        .first()
    )

    if not t:

        raise HTTPException(
            status_code=404,
            detail=
                "Transaction not found"
        )

    # --------------------------------------------------------
    # RE-CHECK CURRENT POLICY
    # --------------------------------------------------------

    decision = analyse(
        t,
        db
    )

    c.risk_score = (
        decision["risk_score"]
    )

    c.ml_decision = (
        decision["ml_decision"]
    )

    c.ml_probability = (
        decision["ml_probability"]
    )

    c.diagnosis = (
        decision["diagnosis"]
    )

    c.recommended_action = (
        decision["recommended_action"]
    )

    c.status = (
        decision["status"]
    )

    c.escalation_level = (
        decision["escalation_level"]
    )

    c.stopping_rule = (
        decision["stopping_rule"]
    )

    c.updated_at = (
        datetime.utcnow()
    )

    # --------------------------------------------------------
    # CURRENT POLICY REQUIRES HUMAN REVIEW
    # --------------------------------------------------------

    if (
        c.escalation_level
        == "MANUAL_REVIEW"
    ):

        add_audit(
            db,
            c.id,
            "RECOVERY_BLOCKED",
            c.stopping_rule
            or
            "Manual review required",
            "Current policy stopped "
            "automatic recovery"
        )

        db.commit()

        return {

            "success": False,

            "message":
                "Automatic recovery stopped",

            "reason":
                "Current policy requires "
                "manual review",

            "case":
                case(c, db),
        }

    # --------------------------------------------------------
    # DEMO RECOVERY
    # --------------------------------------------------------

    t.recovered = True

    c.status = "RECOVERED"

    c.recovery_amount = (
        t.amount
    )

    add_audit(
        db,
        c.id,
        "RECOVERY_EXECUTED",
        f"Approved action: "
        f"{c.recommended_action}",
        f"Demo recovered amount: "
        f"INR {t.amount:.2f}"
    )

    db.commit()

    return {

        "success": True,

        "message":
            "Recovery completed in demo mode",

        "recovered_amount":
            t.amount,

        "case":
            case(c, db),
    }


# ============================================================
# HUMAN APPROVED RECOVERY
# ============================================================

@router.post(
    "/cases/{case_id}/approve-recover"
)
def approve_and_recover(
    case_id: int,
    db: Session = Depends(get_db)
):

    c = (
        db.query(RecoveryCase)
        .filter(
            RecoveryCase.id == case_id
        )
        .first()
    )

    if not c:

        raise HTTPException(
            status_code=404,
            detail=
                "Recovery case not found"
        )

    t = (
        db.query(Transaction)
        .filter(
            Transaction.id
            == c.transaction_id
        )
        .first()
    )

    if not t:

        raise HTTPException(
            status_code=404,
            detail=
                "Transaction not found"
        )

    # --------------------------------------------------------
    # ALREADY RECOVERED
    # --------------------------------------------------------

    if c.status == "RECOVERED":

        return {

            "success": True,

            "message":
                "Transaction already recovered",

            "case":
                case(c, db),
        }

    # --------------------------------------------------------
    # HUMAN APPROVAL
    # --------------------------------------------------------

    if (
        c.escalation_level
        == "MANUAL_REVIEW"
    ):

        recovered_amount = float(
            t.amount or 0
        )

        t.recovered = True

        c.recovery_amount = (
            recovered_amount
        )

        c.status = "RECOVERED"

        c.updated_at = (
            datetime.now(
                timezone.utc
            ).replace(
                tzinfo=None
            )
        )

        add_audit(
            db,

            case_id=c.id,

            action=
                "HUMAN_APPROVED_RECOVERY",

            actor=
                "Human Reviewer",

            reason=
                "Manual review approved recovery",

            result=
                f"₹{recovered_amount:.2f} recovered"
        )

        db.commit()

        db.refresh(c)

        return {

            "success": True,

            "message":
                "Human-approved recovery completed",

            "recovered_amount":
                recovered_amount,

            "case":
                case(c, db),
        }

    # --------------------------------------------------------
    # NORMAL AUTOMATED RECOVERY
    # --------------------------------------------------------

    recovered_amount = float(
        t.amount or 0
    )

    t.recovered = True

    c.recovery_amount = (
        recovered_amount
    )

    c.status = "RECOVERED"

    c.updated_at = (
        datetime.now(
            timezone.utc
        ).replace(
            tzinfo=None
        )
    )

    add_audit(
        db,

        case_id=c.id,

        action=
            "AUTOMATED_RECOVERY",

        actor=
            "ReviveAI Agent",

        reason=
            "Recovery passed policy gates",

        result=
            f"₹{recovered_amount:.2f} recovered"
    )

    db.commit()

    db.refresh(c)

    return {

        "success": True,

        "message":
            "Automated recovery completed",

        "recovered_amount":
            recovered_amount,

        "case":
            case(c, db),
    }


# ============================================================
# TRANSACTIONS
# ============================================================

@router.get("/transactions")
def transactions(
    db: Session = Depends(get_db)
):

    ensure_demo_data(db)

    r = (
        db.query(Transaction)
        .order_by(
            Transaction.created_at.desc()
        )
        .limit(5000)
        .all()
    )

    return {

        "items": [
            tx(x)
            for x in r
        ],

        "total":
            len(r),
    }


# ============================================================
# SINGLE TRANSACTION
# ============================================================

@router.get(
    "/transactions/{transaction_id}"
)
def get_tx(
    transaction_id: int,
    db: Session = Depends(get_db)
):

    t = (
        db.query(Transaction)
        .filter(
            Transaction.id
            == transaction_id
        )
        .first()
    )

    if not t:

        raise HTTPException(
            status_code=404,
            detail=
                "Transaction not found"
        )

    return tx(t)


# ============================================================
# AUDIT LOG
# ============================================================

@router.get("/audit")
def audit(
    db: Session = Depends(get_db)
):

    r = (
        db.query(AuditLog)
        .order_by(
            AuditLog.created_at.desc()
        )
        .limit(500)
        .all()
    )

    return {

        "items": [

            {

                "id":
                    x.id,

                "case_id":
                    x.case_id,

                "action":
                    x.action,

                "actor":
                    x.actor,

                "reason":
                    x.reason,

                "result":
                    x.result,

                "created_at":
                    x.created_at.isoformat(),
            }

            for x in r
        ]
    }


# ============================================================
# ML STATUS
# ============================================================

@router.get("/ml/status")
def ml_status():

    model = load_model()

    if model is None:

        return {

            "loaded":
                False,

            "model":
                None,
        }

    return {

        "loaded":
            True,

        "model":
            "recovery_model.joblib",

        "classes": [

            str(x)
            for x in model.classes_

        ],
    }


# ============================================================
# TRANSACTION ML PREDICTION
# ============================================================

@router.get(
    "/transactions/{transaction_id}/prediction"
)
def transaction_prediction(
    transaction_id: int,
    db: Session = Depends(get_db)
):

    t = (
        db.query(Transaction)
        .filter(
            Transaction.id
            == transaction_id
        )
        .first()
    )

    if not t:

        raise HTTPException(
            status_code=404,
            detail=
                "Transaction not found"
        )

    return predict_transaction(t)


# ============================================================
# RAZORPAY
# ============================================================

@router.get("/razorpay/status")
def rp_status():

    return RazorpayService().status()


@router.get("/razorpay/payments")
def rp_payments():

    return RazorpayService().get_payments(100)


# ============================================================
# POLICY SCHEMAS
# ============================================================

class PolicyUnlockRequest(BaseModel):

    password: str


class PolicyUpdate(BaseModel):

    value: Optional[float] = None

    enabled: Optional[bool] = None

    policy_password: str


class PolicyCreate(BaseModel):

    code: str

    name: str

    description: str

    value: float

    enabled: bool = True

    policy_password: str


# ============================================================
# POLICY PASSWORD VERIFICATION
# ============================================================

def verify_policy_password(
    db: Session,
    password: str
):

    HARDCODED_POLICY_PASSWORD = "admin123"

    if password == HARDCODED_POLICY_PASSWORD:

        return True

    raise HTTPException(
        status_code=401,
        detail=
            "Incorrect Policy Safety Locker password."
    )


# ============================================================
# UNLOCK POLICY SAFETY LOCKER
# ============================================================

@router.post("/policies/unlock")
def unlock_policies(
    payload: PolicyUnlockRequest,
    db: Session = Depends(get_db)
):

    if not payload.password:

        raise HTTPException(
            status_code=400,
            detail=
                "Policy password is required."
        )

    verify_policy_password(
        db,
        payload.password
    )

    return {

        "success":
            True,

        "message":
            "Policy Safety Locker unlocked",
    }


# ============================================================
# GET POLICIES
# ============================================================

@router.get("/policies")
def get_policies(
    db: Session = Depends(get_db)
):

    from app.services.recovery_engine import (
        ensure_default_policies
    )

    ensure_default_policies(db)

    policies = (
        db.query(Policy)
        .order_by(
            Policy.id
        )
        .all()
    )

    return {

        "items": [

            {

                "id":
                    p.id,

                "code":
                    p.code,

                "name":
                    p.name,

                "description":
                    p.description,

                "value":
                    p.value,

                "enabled":
                    p.enabled,

                "updated_at":
                    (
                        p.updated_at.isoformat()
                        if p.updated_at
                        else None
                    ),
            }

            for p in policies
        ],

        "total":
            len(policies),
    }


# ============================================================
# BACKGROUND POLICY RE-EVALUATION
# ============================================================

def re_evaluate_cases_background(
    policy_code: str
):

    db = SessionLocal()

    try:

        # ------------------------------------------------------
        # GET ALL ACTIVE CASES
        # ------------------------------------------------------

        active_cases = (
            db.query(RecoveryCase)
            .filter(
                RecoveryCase.status
                != "RECOVERED"
            )
            .all()
        )

        total = len(
            active_cases
        )

        policy_update_status.update({

            "status":
                "processing",

            "progress":
                0,

            "checked":
                0,

            "total":
                total,

            "message":
                "Updating recovery decisions...",

            "policy_code":
                policy_code,

            "started_at":
                datetime.utcnow().isoformat(),

            "completed_at":
                None,

            "re_evaluated_cases":
                0,

            "changed_cases":
                0,

            "newly_escalated_cases":
                0,

            "error":
                None,
        })

        re_evaluated = 0
        changed_cases = 0
        newly_escalated = 0

        # ------------------------------------------------------
        # RE-EVALUATE CASES
        # ------------------------------------------------------

        for index, c in enumerate(
            active_cases,
            start=1,
        ):

            t = (
                db.query(Transaction)
                .filter(
                    Transaction.id
                    == c.transaction_id
                )
                .first()
            )

            if not t:

                policy_update_status[
                    "checked"
                ] = index

                if total:

                    policy_update_status[
                        "progress"
                    ] = round(
                        index /
                        total *
                        100
                    )

                continue

            old_status = c.status

            old_action = (
                c.recommended_action
            )

            old_escalation = (
                c.escalation_level
            )

            old_stopping_rule = (
                c.stopping_rule
            )

            decision = analyse(
                t,
                db
            )

            c.risk_score = (
                decision["risk_score"]
            )

            c.ml_decision = (
                decision["ml_decision"]
            )

            c.ml_probability = (
                decision["ml_probability"]
            )

            c.diagnosis = (
                decision["diagnosis"]
            )

            c.recommended_action = (
                decision["recommended_action"]
            )

            c.status = (
                decision["status"]
            )

            c.escalation_level = (
                decision["escalation_level"]
            )

            c.stopping_rule = (
                decision["stopping_rule"]
            )

            c.updated_at = (
                datetime.utcnow()
            )

            re_evaluated += 1

            changed = (

                old_status
                != c.status

                or
                old_action
                != c.recommended_action

                or
                old_escalation
                != c.escalation_level

                or
                old_stopping_rule
                != c.stopping_rule
            )

            if changed:

                changed_cases += 1

            if (
                c.escalation_level
                == "MANUAL_REVIEW"

                and
                old_escalation
                != "MANUAL_REVIEW"
            ):

                newly_escalated += 1

            if changed:

                add_audit(
                    db,

                    case_id=c.id,

                    action=
                        "POLICY_REEVALUATION",

                    actor=
                        "ReviveAI Policy Engine",

                    reason=(
                        f"Policy {policy_code} "
                        "changed; active recovery "
                        "case re-evaluated"
                    ),

                    result=(
                        f"{old_action} → "
                        f"{c.recommended_action}; "

                        f"{old_status} → "
                        f"{c.status}; "

                        f"{old_escalation} → "
                        f"{c.escalation_level}; "

                        f"rule={c.stopping_rule}"
                    ),
                )

            policy_update_status[
                "checked"
            ] = index

            if total:

                policy_update_status[
                    "progress"
                ] = round(
                    index /
                    total *
                    100
                )

            policy_update_status[
                "re_evaluated_cases"
            ] = re_evaluated

            policy_update_status[
                "changed_cases"
            ] = changed_cases

            policy_update_status[
                "newly_escalated_cases"
            ] = newly_escalated

            policy_update_status[
                "message"
            ] = (
                "Checking recovery decisions... "
                f"{index:,} / {total:,} "
                "cases checked"
            )

            if index % 25 == 0:

                db.commit()

        # ------------------------------------------------------
        # FINAL AUDIT
        # ------------------------------------------------------

        add_audit(
            db,
            case_id=None,
            action="POLICY_UPDATED",
            actor="Policy Administrator",
            reason=(
                f"Policy {policy_code} "
                "configuration changed"
            ),
            result=(
                f"re-evaluated="
                f"{re_evaluated}; "

                f"changed="
                f"{changed_cases}; "

                f"new_escalations="
                f"{newly_escalated}"
            ),
        )

        db.commit()

        # ------------------------------------------------------
        # COMPLETED
        # ------------------------------------------------------

        policy_update_status.update({

            "status":
                "completed",

            "progress":
                100,

            "checked":
                total,

            "total":
                total,

            "message":(
                f"Recovery queue updated. "
                f"All {total:,} cases have been "
                "re-evaluated against the latest policies."
            ),

            "completed_at":
                datetime.utcnow().isoformat(),

            "re_evaluated_cases":
                re_evaluated,

            "changed_cases":
                changed_cases,

            "newly_escalated_cases":
                newly_escalated,

            "error":
                None,
        })

    except Exception as e:

        db.rollback()

        policy_update_status.update({

            "status":
                "failed",

            "message":
                "Policy re-evaluation failed.",

            "error":
                str(e),

            "completed_at":
                datetime.utcnow().isoformat(),
        })

    finally:

        db.close()

        try:

            policy_update_lock.release()

        except RuntimeError:

            pass


# ============================================================
# UPDATE POLICY
# ============================================================

@router.put(
    "/policies/{code}"
)
def update_policy(
    code: str,
    payload: PolicyUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):

    # --------------------------------------------------------
    # PREVENT MULTIPLE SIMULTANEOUS POLICY JOBS
    # --------------------------------------------------------

    if not policy_update_lock.acquire(
        blocking=False
    ):

        raise HTTPException(
            status_code=409,
            detail=(
                "Another policy update is already "
                "being processed. Please wait."
            ),
        )

    try:

        # ----------------------------------------------------
        # FIND POLICY
        # ----------------------------------------------------

        policy = (
            db.query(Policy)
            .filter(
                Policy.code == code
            )
            .first()
        )

        if not policy:

            policy_update_lock.release()

            raise HTTPException(
                status_code=404,
                detail=
                    "Policy not found",
            )

        # ----------------------------------------------------
        # UPDATE VALUE
        # ----------------------------------------------------

        if payload.value is not None:

            if payload.value < 0:

                policy_update_lock.release()

                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Policy value cannot "
                        "be negative"
                    ),
                )

            policy.value = float(
                payload.value
            )

        # ----------------------------------------------------
        # UPDATE ENABLED
        # ----------------------------------------------------

        if payload.enabled is not None:

            policy.enabled = bool(
                payload.enabled
            )

        policy.updated_at = (
            datetime.utcnow()
        )

        db.flush()

        # ----------------------------------------------------
        # SAVE POLICY
        # ----------------------------------------------------

        db.commit()

        db.refresh(
            policy
        )

        # ----------------------------------------------------
        # INITIALIZE JOB STATUS
        # ----------------------------------------------------

        policy_update_status.update({

            "status":
                "starting",

            "progress":
                0,

            "checked":
                0,

            "total":
                0,

            "message":
                (
                    "Policy updated. "
                    "Preparing recovery queue "
                    "re-evaluation..."
                ),

            "policy_code":
                policy.code,

            "started_at":
                datetime.utcnow().isoformat(),

            "completed_at":
                None,

            "re_evaluated_cases":
                0,

            "changed_cases":
                0,

            "newly_escalated_cases":
                0,

            "error":
                None,
        })

        # ----------------------------------------------------
        # START BACKGROUND JOB
        # ----------------------------------------------------

        background_tasks.add_task(
            re_evaluate_cases_background,
            policy.code,
        )

        # ----------------------------------------------------
        # IMMEDIATE RESPONSE
        # ----------------------------------------------------

        return {

            "success":
                True,

            "message":(
                "Policy updated. "
                "Recovery decisions are being "
                "re-evaluated in the background."
            ),

            "processing":
                True,

            "policy": {

                "id":
                    policy.id,

                "code":
                    policy.code,

                "name":
                    policy.name,

                "description":
                    policy.description,

                "value":
                    float(
                        policy.value
                    ),

                "enabled":
                    bool(
                        policy.enabled
                    ),

                "updated_at":
                    (
                        policy.updated_at.isoformat()
                        if policy.updated_at
                        else None
                    ),
            },

            "job": {

                "status":
                    "starting",

                "progress":
                    0,

                "checked":
                    0,

                "total":
                    0,

                "message":
                    (
                        "Preparing recovery queue "
                        "re-evaluation..."
                    ),
            },
        }

    except Exception:

        try:

            policy_update_lock.release()

        except RuntimeError:

            pass

        raise


# ============================================================
# POLICY UPDATE STATUS
# ============================================================

@router.get(
    "/policies/update-status"
)
def get_policy_update_status():

    return {

        "status":
            policy_update_status[
                "status"
            ],

        "progress":
            policy_update_status[
                "progress"
            ],

        "checked":
            policy_update_status[
                "checked"
            ],

        "total":
            policy_update_status[
                "total"
            ],

        "message":
            policy_update_status[
                "message"
            ],

        "policy_code":
            policy_update_status[
                "policy_code"
            ],

        "started_at":
            policy_update_status[
                "started_at"
            ],

        "completed_at":
            policy_update_status[
                "completed_at"
            ],

        "re_evaluated_cases":
            policy_update_status[
                "re_evaluated_cases"
            ],

        "changed_cases":
            policy_update_status[
                "changed_cases"
            ],

        "newly_escalated_cases":
            policy_update_status[
                "newly_escalated_cases"
            ],

        "error":
            policy_update_status[
                "error"
            ],
    }


# ============================================================
# CREATE POLICY
# ============================================================

@router.post(
    "/policies"
)
def create_policy(
    payload: PolicyCreate,
    db: Session = Depends(get_db)
):

    # --------------------------------------------------------
    # VERIFY PASSWORD
    # --------------------------------------------------------

    verify_policy_password(
        db,
        payload.policy_password
    )

    # --------------------------------------------------------
    # VALIDATE VALUE
    # --------------------------------------------------------

    if payload.value < 0:

        raise HTTPException(
            status_code=400,
            detail=
                "Policy value cannot be negative"
        )

    # --------------------------------------------------------
    # CHECK DUPLICATE CODE
    # --------------------------------------------------------

    existing = (
        db.query(Policy)
        .filter(
            Policy.code
            == payload.code
        )
        .first()
    )

    if existing:

        raise HTTPException(
            status_code=400,
            detail=
                "Policy code already exists"
        )

    # --------------------------------------------------------
    # CREATE POLICY
    # --------------------------------------------------------

    policy = Policy(

        code=
            payload.code,

        name=
            payload.name,

        description=
            payload.description,

        value=
            float(
                payload.value
            ),

        enabled=
            bool(
                payload.enabled
            ),
    )

    db.add(
        policy
    )

    db.flush()

    # --------------------------------------------------------
    # RE-EVALUATE ACTIVE CASES
    # --------------------------------------------------------

    active_cases = (
        db.query(
            RecoveryCase
        )
        .filter(
            RecoveryCase.status
            != "RECOVERED"
        )
        .all()
    )

    re_evaluated = 0

    newly_escalated = 0

    changed_cases = 0

    for c in active_cases:

        t = (
            db.query(
                Transaction
            )
            .filter(
                Transaction.id
                == c.transaction_id
            )
            .first()
        )

        if not t:

            continue

        old_status = (
            c.status
        )

        old_action = (
            c.recommended_action
        )

        old_escalation = (
            c.escalation_level
        )

        old_stopping_rule = (
            c.stopping_rule
        )

        decision = analyse(
            t,
            db
        )

        c.risk_score = (
            decision["risk_score"]
        )

        c.ml_decision = (
            decision["ml_decision"]
        )

        c.ml_probability = (
            decision["ml_probability"]
        )

        c.diagnosis = (
            decision["diagnosis"]
        )

        c.recommended_action = (
            decision["recommended_action"]
        )

        c.status = (
            decision["status"]
        )

        c.escalation_level = (
            decision["escalation_level"]
        )

        c.stopping_rule = (
            decision["stopping_rule"]
        )

        c.updated_at = (
            datetime.utcnow()
        )

        re_evaluated += 1

        changed = (

            old_status
            != c.status

            or
            old_action
            != c.recommended_action

            or
            old_escalation
            != c.escalation_level

            or
            old_stopping_rule
            != c.stopping_rule
        )

        if changed:

            changed_cases += 1

            if (
                c.escalation_level
                == "MANUAL_REVIEW"

                and
                old_escalation
                != "MANUAL_REVIEW"
            ):

                newly_escalated += 1

            add_audit(

                db,

                case_id=c.id,

                action=
                    "POLICY_REEVALUATION",

                actor=
                    "ReviveAI Policy Engine",

                reason=(
                    f"New policy {policy.code} "
                    "created; active case "
                    "re-evaluated"
                ),

                result=(
                    f"{old_action} → "
                    f"{c.recommended_action}; "

                    f"{old_status} → "
                    f"{c.status}; "

                    f"{old_escalation} → "
                    f"{c.escalation_level}; "

                    f"rule={c.stopping_rule}"
                )
            )

    # --------------------------------------------------------
    # POLICY CREATION AUDIT
    # --------------------------------------------------------

    add_audit(

        db,

        case_id=None,

        action=
            "POLICY_CREATED",

        actor=
            "Policy Administrator",

        reason=(
            f"New policy {policy.code} "
            "created"
        ),

        result=(
            f"value={policy.value}; "
            f"enabled={policy.enabled}; "
            f"re-evaluated={re_evaluated}; "
            f"changed={changed_cases}; "
            f"new_escalations={newly_escalated}"
        )
    )

    # --------------------------------------------------------
    # COMMIT
    # --------------------------------------------------------

    db.commit()

    db.refresh(
        policy
    )

    return {

        "success":
            True,

        "message":
            "Policy created successfully",

        "policy": {

            "id":
                policy.id,

            "code":
                policy.code,

            "name":
                policy.name,

            "description":
                policy.description,

            "value":
                float(
                    policy.value
                ),

            "enabled":
                bool(
                    policy.enabled
                ),

            "updated_at":
                (
                    policy.updated_at.isoformat()
                    if policy.updated_at
                    else None
                ),
        },

        "re_evaluated_cases":
            re_evaluated,

        "changed_cases":
            changed_cases,

        "newly_escalated_cases":
            newly_escalated,
    }