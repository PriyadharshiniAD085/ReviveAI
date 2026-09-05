from datetime import datetime

from app.models.models import Policy
from app.services.ml_service import predict_transaction


# ============================================================
# DEFAULT POLICIES
# ============================================================

DEFAULT_POLICIES = [
    (
        "P-001",
        "Failed payment retry",
        "Maximum recovery amount allowed per case",
        25000,
        True,
    ),

    (
        "P-002",
        "Customer contact",
        "Maximum contact attempts per customer per day",
        2,
        True,
    ),

    (
        "P-003",
        "High-value escalation",
        "Transactions above this amount require human review",
        50000,
        True,
    ),

    (
        "P-004",
        "Maximum transaction recovery value",
        "Transactions at or above this value require human review",
        50000,
        True,
    ),
]


# ============================================================
# POLICY HELPERS
# ============================================================

def ensure_default_policies(db):
    """
    Create missing default policies.

    Existing policy values are NEVER overwritten.
    """

    changed = False

    for code, name, description, value, enabled in DEFAULT_POLICIES:

        policy = (
            db.query(Policy)
            .filter(Policy.code == code)
            .first()
        )

        if not policy:

            db.add(
                Policy(
                    code=code,
                    name=name,
                    description=description,
                    value=value,
                    enabled=enabled,
                    updated_at=datetime.utcnow(),
                )
            )

            changed = True

    if changed:
        db.flush()


def get_policy(
    db,
    code,
    default_value,
    default_enabled=True,
):
    """
    Read the latest policy configuration from MySQL.

    Returns:
        (value, enabled)
    """

    if db is None:
        return (
            float(default_value),
            default_enabled,
        )

    ensure_default_policies(db)

    policy = (
        db.query(Policy)
        .filter(Policy.code == code)
        .first()
    )

    if not policy:
        return (
            float(default_value),
            default_enabled,
        )

    return (
        float(
            policy.value
            if policy.value is not None
            else default_value
        ),
        bool(policy.enabled),
    )


# ============================================================
# MANUAL REVIEW RESPONSE
# ============================================================

def manual_review(
    diagnosis,
    stopping_rule,
    ml_decision,
    ml_probability,
):
    """
    Standard response when autonomous recovery
    is stopped and human review is required.
    """

    return {
        "risk_score": round(
            min(
                0.99,
                max(
                    0.50,
                    1 - ml_probability,
                ),
            ),
            2,
        ),

        "diagnosis": diagnosis,

        "recommended_action": "MANUAL_REVIEW",

        "status": "ATTENTION",

        "escalation_level": "MANUAL_REVIEW",

        "stopping_rule": stopping_rule,

        "ml_decision": ml_decision,

        "ml_probability": ml_probability,
    }


# ============================================================
# RECOVERY ANALYSIS
# ============================================================

def analyse(t, db=None):
    """
    ReviveAI AI + Policy Decision Engine.

    ML determines recovery suitability.
    MySQL policies determine the governance boundary.

    P-001 = per-case recovery limit
    P-002 = customer contact limit
    P-003 = high-value escalation
    P-004 = maximum individual transaction value
    """

    # ========================================================
    # TRANSACTION DATA
    # ========================================================

    amount = float(
        t.amount or 0
    )

    reason = (
        t.failure_reason or ""
    ).upper()


    # ========================================================
    # ML PREDICTION
    # ========================================================

    ml = predict_transaction(t)

    ml_probability = float(
        ml.get(
            "probability",
            0.50,
        )
    )

    ml_decision = ml.get(
        "decision",
        "MANUAL_REVIEW",
    )


    # ========================================================
    # READ CURRENT POLICIES
    # ========================================================

    high_value_threshold, high_value_enabled = get_policy(
        db,
        "P-003",
        50000,
        True,
    )

    case_limit, case_limit_enabled = get_policy(
        db,
        "P-001",
        25000,
        True,
    )

    transaction_limit, transaction_limit_enabled = get_policy(
        db,
        "P-004",
        50000,
        True,
    )


    # ========================================================
    # STOP 1
    # SUSPICIOUS TRANSACTION
    # ========================================================

    if reason == "SUSPICIOUS_TRANSACTION":

        return manual_review(
            "Suspicious transaction requires human review",
            "Suspicious transaction",
            ml_decision,
            ml_probability,
        )


    # ========================================================
    # STOP 2
    # P-004 MAXIMUM TRANSACTION VALUE
    # ========================================================
    #
    # P-004 applies to the INDIVIDUAL transaction amount.
    #
    # Example when P-004 = ₹50,000:
    #
    # ₹12,862  -> allowed
    # ₹25,000  -> allowed
    # ₹49,999  -> allowed
    # ₹50,000  -> manual review
    # ₹74,749  -> manual review
    #
    # It does NOT calculate recovered_today.
    # It does NOT affect every transaction.
    #
    # ========================================================

    if (
        transaction_limit_enabled
        and amount >= transaction_limit
    ):

        return manual_review(
            "Transaction exceeds autonomous recovery limit",
            (
                f"Policy P-004: "
                f"Transaction amount >= INR "
                f"{transaction_limit:,.0f}"
            ),
            ml_decision,
            ml_probability,
        )


    # ========================================================
    # STOP 3
    # P-003 HIGH-VALUE POLICY
    # ========================================================

    if (
        high_value_enabled
        and amount >= high_value_threshold
    ):

        return manual_review(
            "High-value transaction requires human review",
            (
                f"Policy P-003: "
                f"High-value transaction >= INR "
                f"{high_value_threshold:,.0f}"
            ),
            ml_decision,
            ml_probability,
        )


    # ========================================================
    # STOP 4
    # P-001 PER-CASE VALUE POLICY
    # ========================================================

    if (
        case_limit_enabled
        and amount > case_limit
    ):

        return manual_review(
            "Transaction exceeds automated recovery case limit",
            (
                f"Policy P-001: "
                f"Amount exceeds INR "
                f"{case_limit:,.0f} case limit"
            ),
            ml_decision,
            ml_probability,
        )


    # ========================================================
    # STOP 5
    # ML MANUAL REVIEW
    # ========================================================

    if ml_decision == "MANUAL_REVIEW":

        return manual_review(
            "ML model recommends manual review",
            "ML manual-review decision",
            ml_decision,
            ml_probability,
        )


    # ========================================================
    # AUTOMATED RECOVERY ACTIONS
    # ========================================================

    actions = {

        "BANK_TIMEOUT": (
            "RETRY_PAYMENT",
            "Likely transient bank failure",
        ),

        "NETWORK_ERROR": (
            "RETRY_PAYMENT",
            "Likely transient network failure",
        ),

        "INSUFFICIENT_FUNDS": (
            "SEND_PAYMENT_LINK",
            "Balance-related failure",
        ),

        "LIMIT_EXCEEDED": (
            "REQUEST_ALTERNATIVE_METHOD",
            "Payment limit issue",
        ),

        "AUTHENTICATION_FAILED": (
            "REQUEST_REAUTHENTICATION",
            "Authentication failure",
        ),

        "PAYMENT_DECLINED": (
            "SEND_PAYMENT_LINK",
            "Payment was declined",
        ),
    }


    action, diagnosis = actions.get(
        reason,
        (
            "SEND_PAYMENT_LINK",
            "Failed payment eligible for bounded recovery",
        ),
    )


    # ========================================================
    # FINAL AUTOMATED DECISION
    # ========================================================

    return {

        "risk_score": round(
            min(
                0.99,
                max(
                    0.01,
                    1 - ml_probability,
                ),
            ),
            2,
        ),

        "diagnosis": diagnosis,

        "recommended_action": action,

        "status": "OPEN",

        "escalation_level": "NONE",

        "stopping_rule": "None",

        "ml_decision": ml_decision,

        "ml_probability": ml_probability,
    }