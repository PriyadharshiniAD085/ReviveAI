from pathlib import Path
from functools import lru_cache
from datetime import datetime
import joblib
import pandas as pd

MODEL_PATH = Path(__file__).resolve().parents[2] / 'ml' / 'models' / 'recovery_model.joblib'

@lru_cache(maxsize=1)
def load_model():
    if not MODEL_PATH.exists():
        return None
    return joblib.load(MODEL_PATH)

def predict_transaction(t):
    """Return an ML-backed decision signal for a failed transaction.

    The current bundled model is a Pipeline trained on amount, failure_reason and hour
    and predicts AUTOMATED_RECOVERY vs MANUAL_REVIEW. The service also exposes a
    probability/confidence value for the selected class.
    """
    model = load_model()
    amount = float(t.amount or 0)
    reason = t.failure_reason or 'UNKNOWN'
    created = t.created_at or datetime.utcnow()
    hour = created.hour
    row = pd.DataFrame([{
        'amount': amount,
        'failure_reason': reason,
        'hour': hour,
    }])

    if model is None:
        return {
            'available': False,
            'decision': 'AUTOMATED_RECOVERY',
            'probability': 0.50,
            'model': 'fallback',
        }

    probabilities = model.predict_proba(row)[0]
    classes = list(model.classes_)
    best_idx = int(probabilities.argmax())
    decision = str(classes[best_idx])
    probability = float(probabilities[best_idx])

    return {
        'available': True,
        'decision': decision,
        'probability': round(probability, 4),
        'model': 'recovery_model.joblib',
    }
