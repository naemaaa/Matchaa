import re
import os
import json
from typing import Set, Dict, Any

# A curated set of common Indonesian and English stopwords to clean features
STOPWORDS: Set[str] = {
    # Indonesian
    'dan', 'yang', 'di', 'ke', 'dari', 'untuk', 'dengan', 'adalah', 'pada', 'sebagai',
    'itu', 'ini', 'saya', 'kami', 'anda', 'mereka', 'dia', 'atau', 'juga',
    'dalam', 'bisa', 'dapat', 'akan', 'telah', 'sudah', 'oleh', 'karena', 'tentang',
    'adapun', 'bahwa', 'seperti', 'olehnya', 'agar', 'supaya', 'tetapi', 'namun',
    # English
    'and', 'the', 'in', 'on', 'at', 'to', 'for', 'with', 'is', 'are', 'was', 'were',
    'of', 'by', 'an', 'a', 'this', 'that', 'these', 'those', 'it', 'they', 'we', 'you',
    'he', 'she', 'him', 'her', 'them', 'us', 'our', 'your', 'my', 'their', 'from', 'as',
    'or', 'but', 'so', 'if', 'then', 'else', 'can', 'will', 'should', 'would', 'could',
    'about', 'more', 'some', 'any', 'no', 'not', 'only', 'own', 'same', 'such', 'than',
    'too', 'very', 'just', 'moreover', 'however', 'withal', 'within'
}

def clean_and_tokenize(text: str) -> Set[str]:
    """Helper: lowercase, extract alphanumeric words >= 2 chars, and filter stopwords."""
    if not text:
        return set()
    # Find all alphabetic/alphanumeric words with length >= 2
    words = re.findall(r'\b[a-zA-Z0-9]{2,}\b', text.lower())
    return set(w for w in words if w not in STOPWORDS)

def load_taxonomy_skills() -> Set[str]:
    """Loads unique skill terms from keyword_per_skill.json or falls back to a curated default set."""
    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        parent_dir = os.path.dirname(current_dir)
        json_path = os.path.join(parent_dir, "data", "keyword_per_skill.json")
        if os.path.exists(json_path):
            with open(json_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return {item["skill"].lower() for item in data if "skill" in item}
    except Exception as e:
        print(f"Error loading skill taxonomy: {e}")
    
    # Curated default list of tech & business skills
    return {
        "python", "java", "javascript", "c++", "c#", "golang", "rust", "sql", "nosql",
        "react", "vue", "angular", "node", "express", "django", "flask", "fastapi",
        "docker", "kubernetes", "aws", "gcp", "azure", "terraform", "jenkins", "git",
        "figma", "wireframing", "prototyping", "sketch", "photoshop", "illustrator",
        "machine learning", "deep learning", "statistics", "pandas", "numpy", "scikit-learn",
        "tensorflow", "pytorch", "nlp", "agile", "scrum", "product strategy", "roadmap"
    }

def get_evidence_score(cv_text: str, job_description: str, target_role: str) -> float:
    """
    Calculate the Evidence Score:
    Measures what percentage of the required job skills (mentioned in JD or target_role)
    are explicitly found in the CV text.
    """
    skills = load_taxonomy_skills()
    cv_words = clean_and_tokenize(cv_text)
    jd_words = clean_and_tokenize(job_description)
    role_words = clean_and_tokenize(target_role)
    
    # Extract skills that are required by this specific JD/Role
    required_skills = {s for s in skills if s in jd_words or s in role_words}
    
    if not required_skills:
        # Fallback to general skill terms in JD
        required_skills = skills.intersection(jd_words)
        
    if not required_skills:
        return 0.0
        
    matched_skills = required_skills.intersection(cv_words)
    return len(matched_skills) / len(required_skills)

def get_experience_alignment(cv_text: str, job_description: str, target_role: str) -> float:
    """
    Measures seniority alignment and the density of experience-defining active verbs
    present in the CV.
    """
    cv_lower = cv_text.lower()
    jd_lower = job_description.lower()
    role_lower = target_role.lower()
    
    seniority_keywords = ["senior", "lead", "principal", "manager", "director", "head", "junior", "entry", "intern", "fresh graduate", "associate", "staff"]
    
    # 1. Seniority overlap
    jd_seniority = {w for w in seniority_keywords if w in jd_lower or w in role_lower}
    cv_seniority = {w for w in seniority_keywords if w in cv_lower}
    
    seniority_score = 0.5
    if jd_seniority:
        overlap = jd_seniority.intersection(cv_seniority)
        seniority_score = len(overlap) / len(jd_seniority)
        
    # 2. Active verbs density (Indonesian & English)
    verbs = {
        "mengembangkan", "membuat", "membangun", "lead", "manage", "built", "designed", 
        "developed", "architected", "implemented", "mendesain", "mengoptimalkan", 
        "memelihara", "mengintegrasikan", "collaborated", "created", "improved", "managed"
    }
    
    cv_words = clean_and_tokenize(cv_lower)
    cv_verbs = verbs.intersection(cv_words)
    
    # Capped score: 6+ active verbs yields a perfect score for this component
    verb_score = min(len(cv_verbs) / 6.0, 1.0)
    
    return 0.5 * seniority_score + 0.5 * verb_score

def get_keyword_density(cv_text: str) -> float:
    """
    Measures the density of taxonomy skill keywords in the CV.
    A high density of relevant skills indicates an ATS-optimized CV.
    """
    skills = load_taxonomy_skills()
    cv_words = clean_and_tokenize(cv_text)
    if not cv_words:
        return 0.0
        
    cv_skills = skills.intersection(cv_words)
    density = len(cv_skills) / len(cv_words)
    
    # Typically, if 10% of unique words are tech skills, it is extremely dense.
    return min(density / 0.10, 1.0)

def extract_all_features(cv_text: str, job_description: str, target_role: str, vectorizer=None) -> Dict[str, Any]:
    """
    Extracts the redesigned 4 features needed for the Random Forest Regressor model:
    - tfidf_similarity
    - evidence_score
    - experience_alignment
    - keyword_density
    """
    evidence_score = get_evidence_score(cv_text, job_description, target_role)
    exp_alignment = get_experience_alignment(cv_text, job_description, target_role)
    keyword_density = get_keyword_density(cv_text)
    
    tfidf_sim = 0.0
    if vectorizer is not None and cv_text and job_description:
        try:
            from sklearn.metrics.pairwise import cosine_similarity
            tfidf_cv = vectorizer.transform([cv_text])
            tfidf_jd = vectorizer.transform([job_description])
            tfidf_sim = float(cosine_similarity(tfidf_cv, tfidf_jd)[0][0])
        except Exception:
            tfidf_sim = 0.0
            
    return {
        "tfidf_similarity": tfidf_sim,
        "evidence_score": evidence_score,
        "experience_alignment": exp_alignment,
        "keyword_density": keyword_density
    }
