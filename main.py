from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import uvicorn
import io
import json
import os

from agent.graph import matcha_graph
from agent.nodes import skill_gap_analyzer_node
from agent.memory import init_db, save_session, load_session
from utils.helpers import extract_cv_text

init_db()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    session_id: str
    user_input: str
    agent_state: Optional[dict] = None

class JobRequest(BaseModel):
    session_id: str
    job_description: str
    agent_state: Optional[dict] = None

class ReviewRequest(BaseModel):
    session_id: str
    document_type: str  # 'cv' or 'linkedin'
    agent_state: Optional[dict] = None

class DeleteRequest(BaseModel):
    session_id: str
    document_type: str  # 'cv' or 'linkedin'

@app.post("/chat")
async def chat(request: ChatRequest):
    saved = load_session(request.session_id)
    
    current_state = {
        "messages": [],
        "profile_complete": False,
        "drift_detected": False,
        "previous_intent_history": [],
        "cv_text": None,
        "linkedin_text": None,
        **(request.agent_state or {}),
        **saved,
        "user_input": request.user_input,
    }
    
    result = matcha_graph.invoke(current_state)
    if result.get("cv_uploaded"):
        result["cv_reviewed"] = True
    if result.get("linkedin_uploaded"):
        result["linkedin_reviewed"] = True
    save_session(request.session_id, result)
    
    return {
        "response": result.get("agent_response", "Maaf, terjadi error."),
        "agent_state": result
    }

@app.post("/upload")
async def upload(
    file: UploadFile = File(...),
    session_id: str = Form(...),
    file_type: str = Form(...)
):
    contents = await file.read()
    file_like = io.BytesIO(contents)
    file_like.filename = file.filename
    extracted_text = extract_cv_text(file_like)
    
    # Save file to uploads folder for preview
    os.makedirs("uploads", exist_ok=True)
    prefix = f"{session_id}_{file_type}_"
    for filename in os.listdir("uploads"):
        if filename.startswith(prefix):
            try:
                os.remove(os.path.join("uploads", filename))
            except:
                pass
    
    file_path = os.path.join("uploads", f"{prefix}{file.filename}")
    with open(file_path, "wb") as f:
        f.write(contents)
    
    saved = load_session(session_id)
    if file_type == "cv":
        saved["cv_text"] = extracted_text
        saved["cv_uploaded"] = True
        saved["cv_filename"] = file.filename
        saved["cv_reviewed"] = False
        saved.pop("cv_review", None)
        saved.pop("ats_analysis", None)
    else:
        saved["linkedin_text"] = extracted_text
        saved["linkedin_uploaded"] = True
        saved["linkedin_filename"] = file.filename
        saved["linkedin_reviewed"] = False
        saved.pop("linkedin_review", None)
        saved.pop("ats_analysis", None)
    save_session(session_id, saved)
    
    return {"extracted_text": extracted_text, "filename": file.filename, "status": "success"}

@app.get("/preview/{session_id}/{file_type}")
async def preview(session_id: str, file_type: str):
    if not os.path.exists("uploads"):
        return {"error": "No uploads folder found"}
    prefix = f"{session_id}_{file_type}_"
    for filename in os.listdir("uploads"):
        if filename.startswith(prefix):
            file_path = os.path.join("uploads", filename)
            media_type = "application/pdf" if filename.lower().endswith(".pdf") else "application/octet-stream"
            original_filename = filename[len(prefix):]
            return FileResponse(
                file_path,
                media_type=media_type,
                headers={"Content-Disposition": f"inline; filename=\"{original_filename}\""}
            )
    return {"error": "File not found"}

@app.post("/review-document")
async def review_document(request: ReviewRequest):
    """
    Mark CV or LinkedIn as reviewed (already extracted at upload time).
    No LLM call needed — text was extracted on /upload.
    """
    saved = load_session(request.session_id)
    document_text = saved.get("cv_text") if request.document_type == "cv" else saved.get("linkedin_text")
    
    if not document_text:
        return {"error": f"No {request.document_type} document found"}
    
    if request.document_type == "cv":
        saved["cv_reviewed"] = True
    else:
        saved["linkedin_reviewed"] = True
    
    save_session(request.session_id, saved)
    
    return {
        "response": f"{request.document_type.upper()} berhasil diproses.",
        "agent_state": saved
    }

@app.post("/analyze-job")
async def analyze_job(request: JobRequest):
    """
    Endpoint utama untuk analisis karir + roadmap.
    Langsung invoke skill_gap_analyzer_node (skip intent_classifier + user_profiler)
    untuk hemat token secara signifikan.
    """
    saved = load_session(request.session_id)
    
    # Build state langsung — tidak perlu LLM intent+profiler
    current_state = {
        "messages": [],
        "profile_complete": True,
        "drift_detected": False,
        "previous_intent_history": [],
        "cv_text": None,
        "linkedin_text": None,
        **(request.agent_state or {}),
        **saved,
        "user_input": request.job_description,
        "job_description": request.job_description,
        "detected_intent": "CAREER_EXPLORATION",
    }
    
    # Merge user_profile dari agent_state jika ada
    incoming_profile = (request.agent_state or {}).get("user_profile") or {}
    saved_profile = saved.get("user_profile") or {}
    merged_profile = {**saved_profile, **{k: v for k, v in incoming_profile.items() if v}}
    current_state["user_profile"] = merged_profile

    # Langsung jalankan skill_gap_analyzer — hemat 2 LLM calls
    result = skill_gap_analyzer_node(current_state)
    
    if result.get("cv_uploaded"):
        result["cv_reviewed"] = True
    if result.get("linkedin_uploaded"):
        result["linkedin_reviewed"] = True
    save_session(request.session_id, result)
    
    return {
        "response": result.get("agent_response", "Maaf, terjadi error."),
        "agent_state": result
    }

@app.post("/delete-document")
async def delete_document(request: DeleteRequest):
    saved = load_session(request.session_id)
    
    # Clean up upload file on disk
    prefix = f"{request.session_id}_{request.document_type}_"
    if os.path.exists("uploads"):
        for filename in os.listdir("uploads"):
            if filename.startswith(prefix):
                try:
                    os.remove(os.path.join("uploads", filename))
                except:
                    pass
                    
    # Remove from session
    if request.document_type == "cv":
        saved["cv_text"] = None
        saved["cv_uploaded"] = False
        saved["cv_filename"] = ""
        saved["cv_reviewed"] = False
        saved.pop("cv_review", None)
    else:
        saved["linkedin_text"] = None
        saved["linkedin_uploaded"] = False
        saved["linkedin_filename"] = ""
        saved["linkedin_reviewed"] = False
        saved.pop("linkedin_review", None)
        
    # Clear ATS analysis since a document was deleted
    saved.pop("ats_analysis", None)
    
    save_session(request.session_id, saved)
    return {"status": "success", "agent_state": saved}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)