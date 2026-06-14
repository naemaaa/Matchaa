import streamlit as st
import os
import joblib
from pypdf import PdfReader
from model import predict_ats_match_rate
from features import extract_all_features, clean_and_tokenize

# Set Streamlit page configuration
st.set_page_config(
    page_title="Matcha ATS Match Rate Analyzer",
    page_icon="🎯",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# Custom premium CSS injection
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');
    
    /* Main container styling */
    .stApp {
        background-color: #0d0f14;
        color: #e2e8f0;
        font-family: 'Plus Jakarta Sans', sans-serif;
    }
    
    h1, h2, h3 {
        font-family: 'Outfit', sans-serif !important;
        font-weight: 700 !important;
        background: linear-gradient(135deg, #38bdf8 0%, #818cf8 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin-bottom: 0.5rem !important;
    }
    
    .subtitle {
        color: #94a3b8;
        font-size: 1.1rem;
        margin-bottom: 2rem;
    }
    
    /* Glassmorphic boxes */
    .glass-card {
        background: rgba(30, 41, 59, 0.4);
        backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 16px;
        padding: 24px;
        margin-bottom: 24px;
    }
    
    /* Input custom styling */
    div[data-baseweb="textarea"] {
        background-color: rgba(15, 23, 42, 0.6) !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
        border-radius: 8px !important;
    }
    
    div[data-baseweb="textarea"] textarea {
        color: #f1f5f9 !important;
    }
    
    /* Button custom styling */
    .stButton>button {
        background: linear-gradient(135deg, #0284c7 0%, #4f46e5 100%) !important;
        color: white !important;
        font-family: 'Outfit', sans-serif !important;
        font-weight: 600 !important;
        border: none !important;
        border-radius: 12px !important;
        padding: 12px 28px !important;
        transition: all 0.3s ease !important;
        box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3) !important;
    }
    
    .stButton>button:hover {
        transform: translateY(-2px) !important;
        box-shadow: 0 6px 20px rgba(79, 70, 229, 0.5) !important;
    }
    
    /* Progress bar custom styling */
    .stProgress > div > div > div > div {
        background: linear-gradient(90deg, #38bdf8 0%, #818cf8 100%) !important;
    }
</style>
""", unsafe_allow_html=True)

def extract_text_from_pdf(uploaded_file) -> str:
    """Helper to parse raw text out of a PDF file using pypdf."""
    try:
        reader = PdfReader(uploaded_file)
        text = ""
        for page in reader.pages:
            content = page.extract_text()
            if content:
                text += content + "\n"
        return text
    except Exception as e:
        st.error(f"Error parsing PDF file: {e}")
        return ""

def render_score_gauge(score: int):
    # Determine level and color
    if score >= 80:
        color = "linear-gradient(90deg, #10b981 0%, #059669 100%)" # Emerald Green
        status = "Strong Match"
        status_color = "#10b981"
        subtext = "Excellent keyword overlap and role alignment! Your profile matches this job perfectly."
    elif score >= 50:
        color = "linear-gradient(90deg, #f59e0b 0%, #d97706 100%)" # Amber Orange
        status = "Good Match"
        status_color = "#f59e0b"
        subtext = "Decent alignment, but there are keyword gaps. Add more skills mentioned in the JD to optimize."
    else:
        color = "linear-gradient(90deg, #ef4444 0%, #dc2626 100%)" # Crimson Red
        status = "Low Match"
        status_color = "#ef4444"
        subtext = "Significant skill gaps detected. Customize your resume to target this job role's requirements."

    gauge_html = f"""
    <div style="background: rgba(30, 41, 59, 0.45); backdrop-filter: blur(12px); border-radius: 16px; padding: 28px; border: 1px solid rgba(255, 255, 255, 0.08); margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <span style="font-size: 1.15rem; font-weight: 600; color: #cbd5e1;">ATS Match Rate</span>
            <span style="font-size: 1rem; font-weight: 700; color: {status_color}; text-transform: uppercase; letter-spacing: 0.05em;">{status}</span>
        </div>
        <div style="background-color: rgba(15, 23, 42, 0.6); border-radius: 12px; height: 26px; width: 100%; position: relative; overflow: hidden; margin-bottom: 14px; border: 1px solid rgba(255,255,255,0.05);">
            <div style="background: {color}; height: 100%; width: {score}%; border-radius: 12px; transition: width 1s ease-in-out;"></div>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: flex-end;">
            <span style="font-size: 0.95rem; color: #94a3b8; max-width: 70%; line-height: 1.4;">{subtext}</span>
            <span style="font-size: 2.8rem; font-weight: 800; color: #f8fafc; line-height: 1; font-family: 'Outfit', sans-serif;">{score}%</span>
        </div>
    </div>
    """
    st.markdown(gauge_html, unsafe_allow_html=True)

def render_metric_cards(tfidf_sim: float, evidence_score: float, experience_alignment: float, keyword_density: float):
    cols = st.columns(4)
    
    # TF-IDF Cosine Similarity Card
    with cols[0]:
        st.markdown(f"""
        <div style="background: rgba(30, 41, 59, 0.3); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 12px; padding: 18px; text-align: center; height: 100%;">
            <div style="font-size: 0.85rem; color: #94a3b8; font-weight: 500;">Text Similarity</div>
            <div style="font-size: 1.8rem; font-weight: 700; color: #38bdf8; margin-top: 8px; font-family: 'Outfit', sans-serif;">{tfidf_sim * 100:.1f}%</div>
            <div style="font-size: 0.75rem; color: #64748b; margin-top: 6px;">Cosine Similarity</div>
        </div>
        """, unsafe_allow_html=True)
        
    # Evidence Score Card
    with cols[1]:
        st.markdown(f"""
        <div style="background: rgba(30, 41, 59, 0.3); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 12px; padding: 18px; text-align: center; height: 100%;">
            <div style="font-size: 0.85rem; color: #94a3b8; font-weight: 500;">Evidence Score</div>
            <div style="font-size: 1.8rem; font-weight: 700; color: #34d399; margin-top: 8px; font-family: 'Outfit', sans-serif;">{evidence_score * 100:.0f}%</div>
            <div style="font-size: 0.75rem; color: #64748b; margin-top: 6px;">Required skills matching</div>
        </div>
        """, unsafe_allow_html=True)
        
    # Experience Alignment Card
    with cols[2]:
        st.markdown(f"""
        <div style="background: rgba(30, 41, 59, 0.3); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 12px; padding: 18px; text-align: center; height: 100%;">
            <div style="font-size: 0.85rem; color: #94a3b8; font-weight: 500;">Experience Align</div>
            <div style="font-size: 1.8rem; font-weight: 700; color: #fbbf24; margin-top: 8px; font-family: 'Outfit', sans-serif;">{experience_alignment * 100:.0f}%</div>
            <div style="font-size: 0.75rem; color: #64748b; margin-top: 6px;">Seniority & active verbs</div>
        </div>
        """, unsafe_allow_html=True)
        
    # Keyword Density Card
    with cols[3]:
        st.markdown(f"""
        <div style="background: rgba(30, 41, 59, 0.3); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 12px; padding: 18px; text-align: center; height: 100%;">
            <div style="font-size: 0.85rem; color: #94a3b8; font-weight: 500;">Keyword Density</div>
            <div style="font-size: 1.8rem; font-weight: 700; color: #a78bfa; margin-top: 8px; font-family: 'Outfit', sans-serif;">{keyword_density * 100:.0f}%</div>
            <div style="font-size: 0.75rem; color: #64748b; margin-top: 6px;">ATS keyword coverage</div>
        </div>
        """, unsafe_allow_html=True)

def main():
    # Header Area
    st.markdown('<h1 style="text-align: center;">🎯 Matcha ATS Match Rate Analyzer</h1>', unsafe_allow_html=True)
    st.markdown('<div class="subtitle" style="text-align: center;">Custom Random Forest Model for CV and Job Description Alignment Evaluation</div>', unsafe_allow_html=True)
    
    # Check if model exists
    current_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(current_dir, "model.joblib")
    
    if not os.path.exists(model_path):
        st.warning("⚠️ Model files not found! Please run the training command first: `python ats_model_app/train.py` to train the RandomForestRegressor and generate joblib model artifacts.")
        
    # Columns for Inputs
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown('<h3>📄 Upload your CV</h3>', unsafe_allow_html=True)
        cv_source = st.radio("Choose input method:", ["Upload PDF File", "Paste Text Directly"], label_visibility="collapsed")
        
        cv_text = ""
        if cv_source == "Upload PDF File":
            uploaded_file = st.file_uploader("Upload your CV/Resume (PDF):", type=["pdf"])
            if uploaded_file is not None:
                with st.spinner("Extracting text from PDF..."):
                    cv_text = extract_text_from_pdf(uploaded_file)
                if cv_text:
                    st.success(f"Successfully extracted {len(cv_text.split())} words from PDF!")
        else:
            cv_text = st.text_area("Paste your CV / Resume plain text here:", height=300, placeholder="E.g., John Doe\nSoftware Engineer...\nExperience...\nSkills...")
            
    with col2:
        st.markdown('<h3>💼 Target Job & Role</h3>', unsafe_allow_html=True)
        target_role = st.text_input("Target Job Role (e.g. Software Engineer, Data Scientist):", placeholder="E.g., Software Engineer")
        job_description = st.text_area("Paste the Target Job Description here:", height=274, placeholder="E.g., We are looking for a Software Engineer with 3 years experience. Must have Python, SQL, and Git skills...")
        
    # Analyze Trigger Button
    st.write("")
    analyze_btn = st.button("Calculate Match Rate", use_container_width=True)
    
    if analyze_btn:
        if not cv_text.strip():
            st.error("Please provide your CV text or upload a PDF CV.")
            return
        if not job_description.strip():
            st.error("Please provide the Job Description to match against.")
            return
            
        with st.spinner("Analyzing matching score using FastAPI model endpoint..."):
            import requests
            
            api_url = os.environ.get("ATS_MODEL_API_URL", "http://localhost:8080").rstrip("/")
            
            payload = {
                "cv_text": cv_text,
                "job_description": job_description,
                "target_role": target_role
            }
            
            # Call API /predict endpoint
            api_success = False
            try:
                response = requests.post(f"{api_url}/predict", json=payload, timeout=4)
                if response.status_code == 200:
                    score = response.json().get("match_rate", 0)
                    api_success = True
                    st.info(f"🔗 Connected: Predicted match rate using model served at {api_url}/predict")
                else:
                    st.warning(f"⚠️ API Server returned error code {response.status_code}. Using local fallback prediction.")
            except Exception:
                st.warning(f"⚠️ API Server offline. Please run 'python ats_model_app/api.py' to serve the model as an endpoint at {api_url}. Running local fallback prediction.")
            
            if not api_success:
                score = predict_ats_match_rate(cv_text, job_description, target_role)
                
            # Call API /features endpoint
            feats_success = False
            try:
                response_feat = requests.post(f"{api_url}/features", json=payload, timeout=4)
                if response_feat.status_code == 200:
                    feats = response_feat.json()
                    feats_success = True
            except Exception:
                pass
                
            if not feats_success:
                # Extract metrics locally
                vectorizer = None
                vectorizer_path = os.path.join(current_dir, "vectorizer.joblib")
                if os.path.exists(vectorizer_path):
                    try:
                        vectorizer = joblib.load(vectorizer_path)
                    except Exception:
                        pass
                        
                feats = extract_all_features(cv_text, job_description, target_role, vectorizer=vectorizer)
            
        st.markdown("<hr style='border-color: rgba(255,255,255,0.08); margin: 2rem 0;' />", unsafe_allow_html=True)
        
        # Results Section
        st.markdown('<h2>📊 Analysis Results</h2>', unsafe_allow_html=True)
        
        # Render Gauge and Metric Cards
        render_score_gauge(score)
        render_metric_cards(
            tfidf_sim=feats["tfidf_similarity"],
            evidence_score=feats["evidence_score"],
            experience_alignment=feats["experience_alignment"],
            keyword_density=feats["keyword_density"]
        )
        
        st.write("")
        st.write("")
        
        # Details & Advice Column layout
        adv_col1, adv_col2 = st.columns(2)
        
        # Keyword extraction logic for analysis
        cv_tokens = clean_and_tokenize(cv_text)
        jd_tokens = clean_and_tokenize(job_description)
        missing_tokens = jd_tokens.difference(cv_tokens)
        
        # Limit to first 12 interesting words
        missing_skills = [w for w in missing_tokens if len(w) > 3][:12]
        matched_skills = [w for w in jd_tokens.intersection(cv_tokens) if len(w) > 3][:12]
        
        with adv_col1:
            st.markdown("""
            <div class="glass-card">
                <h4 style="color: #34d399; margin-top:0;">✅ Matched Skills & Keywords</h4>
                <p style="color: #94a3b8; font-size: 0.9rem; margin-bottom: 12px;">These key terms from the job description are present in your CV:</p>
            </div>
            """, unsafe_allow_html=True)
            if matched_skills:
                st.write(", ".join(f"`{w}`" for w in matched_skills))
            else:
                st.info("No matching skill keywords found in both texts.")
                
        with adv_col2:
            st.markdown("""
            <div class="glass-card">
                <h4 style="color: #fbbf24; margin-top:0;">⚠️ Suggestions for Optimization</h4>
                <p style="color: #94a3b8; font-size: 0.9rem; margin-bottom: 12px;">Add these relevant terms to increase your ATS Match Rate score:</p>
            </div>
            """, unsafe_allow_html=True)
            if missing_skills:
                st.write(", ".join(f"`{w}`" for w in missing_skills))
            else:
                st.success("All main job description keywords are present in your CV!")
                
            # Additional tips based on length ratio
            if feats["length_ratio"] < 0.4:
                st.warning("💡 **Tip**: Your CV is significantly shorter than the Job Description. Try adding more detailed descriptions of your past projects and responsibilities.")
            elif feats["length_ratio"] > 1.6:
                st.warning("💡 **Tip**: Your CV is much longer than the Job Description. Keep it concise, remove irrelevant descriptions, and target key requirements.")

if __name__ == "__main__":
    main()
