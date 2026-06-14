import os
import joblib
from typing import Dict, Any

try:
    from .features import extract_all_features
except ImportError:
    from features import extract_all_features

# Lazy loading of model and vectorizer to prevent import issues
_MODEL = None
_VECTORIZER = None

def _get_model_and_vectorizer():
    global _MODEL, _VECTORIZER
    if _MODEL is None or _VECTORIZER is None:
        # Determine the directory of the current file (ats_model_app/)
        current_dir = os.path.dirname(os.path.abspath(__file__))
        model_path = os.path.join(current_dir, "model.joblib")
        vectorizer_path = os.path.join(current_dir, "vectorizer.joblib")
        
        if not os.path.exists(model_path) or not os.path.exists(vectorizer_path):
            raise FileNotFoundError(
                f"Model or Vectorizer file not found in {current_dir}. "
                f"Please ensure 'train.py' has been run to generate them."
            )
            
        _MODEL = joblib.load(model_path)
        _VECTORIZER = joblib.load(vectorizer_path)
        
    return _MODEL, _VECTORIZER

def predict_ats_match_rate(cv_text: str, job_description: str, target_role: str) -> int:
    """
    Predicts the ATS Match Rate (0-100) between CV text and a Job Description.
    Automatically handles missing, None, or empty text.
    """
    # Safeguard inputs
    cv_clean = (cv_text or "").strip()
    jd_clean = (job_description or "").strip()
    role_clean = (target_role or "").strip()
    
    if not cv_clean or not jd_clean:
        return 0
        
    try:
        model, vectorizer = _get_model_and_vectorizer()
        
        # Extract features using our shared module
        features_dict = extract_all_features(
            cv_text=cv_clean,
            job_description=jd_clean,
            target_role=role_clean,
            vectorizer=vectorizer
        )
        
        # Format as input array (maintaining training column order)
        # tfidf_similarity, evidence_score, experience_alignment, keyword_density
        input_data = [[
            features_dict["tfidf_similarity"],
            features_dict["evidence_score"],
            features_dict["experience_alignment"],
            features_dict["keyword_density"]
        ]]
        
        # Predict
        predicted_rate = model.predict(input_data)[0]
        
        # Return rounded, capped integer score
        return int(round(clip_score(predicted_rate)))
        
    except Exception as e:
        print(f"Error during custom model inference: {e}")
        # Fallback to a basic rule-based estimate if model fails to load/predict
        return fallback_scoring(cv_clean, jd_clean, role_clean)

def clip_score(score: float) -> float:
    return max(0.0, min(100.0, score))

def fallback_scoring(cv_text: str, job_description: str, target_role: str) -> int:
    """Simple non-ML fallback scoring in case of issues."""
    try:
        try:
            from .features import get_evidence_score, get_experience_alignment, get_keyword_density
        except ImportError:
            from features import get_evidence_score, get_experience_alignment, get_keyword_density
            
        evidence_score = get_evidence_score(cv_text, job_description, target_role)
        experience_alignment = get_experience_alignment(cv_text, job_description, target_role)
        keyword_density = get_keyword_density(cv_text)
        
        # Approximating TF-IDF similarity using Evidence Score as proxy for fallback purposes
        approx_tfidf = min(evidence_score * 0.85, 1.0)
        
        score = (
            40.0 * evidence_score +
            30.0 * approx_tfidf +
            20.0 * experience_alignment +
            10.0 * keyword_density
        )
        return int(round(max(0.0, min(100.0, score))))
    except Exception:
        return 20
