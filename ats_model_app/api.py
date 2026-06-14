from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import os
import joblib
from model import predict_ats_match_rate
from features import extract_all_features

app = FastAPI(
    title="Matcha Custom ATS Model API",
    description="Microservice API for custom Random Forest Regressor predicting ATS CV-JD Match Rates.",
    version="1.0"
)

class MatchRequest(BaseModel):
    cv_text: str
    job_description: str
    target_role: str

@app.post("/predict")
async def predict_endpoint(req: MatchRequest):
    """Predicts the ATS Match Rate (0-100) using the custom RF model."""
    try:
        score = predict_ats_match_rate(
            cv_text=req.cv_text,
            job_description=req.job_description,
            target_role=req.target_role
        )
        return {"match_rate": score}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")

@app.post("/features")
async def features_endpoint(req: MatchRequest):
    """Extracts raw matching features used by the model."""
    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        vectorizer_path = os.path.join(current_dir, "vectorizer.joblib")
        
        vectorizer = None
        if os.path.exists(vectorizer_path):
            try:
                vectorizer = joblib.load(vectorizer_path)
            except Exception:
                pass
                
        feats = extract_all_features(
            cv_text=req.cv_text,
            job_description=req.job_description,
            target_role=req.target_role,
            vectorizer=vectorizer
        )
        return feats
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Feature extraction error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    import os
    # Read dynamic port from Railway environment, fallback to 8080 locally
    port = int(os.environ.get("PORT", 8080))
    # Disable reload in production to optimize performance
    is_dev = os.environ.get("ATS_MODEL_API_URL") is None
    uvicorn.run("api:app", host="0.0.0.0", port=port, reload=is_dev)
