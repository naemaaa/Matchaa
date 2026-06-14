import os
import random
import numpy as np
import pandas as pd
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from features import extract_all_features

# Seed for reproducibility
random.seed(42)
np.random.seed(42)

ROLES = {
    "Software Engineer": [
        "python", "java", "javascript", "c++", "c#", "golang", "rust", "data structures",
        "algorithms", "git", "software architecture", "clean code", "agile", "scrum",
        "system design", "api design", "rest api", "unit testing", "sql", "nosql",
        "object oriented programming", "oop", "problem solving", "debugging"
    ],
    "Data Scientist": [
        "python", "machine learning", "statistics", "pandas", "numpy", "scikit-learn",
        "sql", "tensorflow", "pytorch", "deep learning", "data analysis", "r",
        "data visualization", "matplotlib", "seaborn", "tableau", "big data", "spark",
        "nlp", "natural language processing", "computer vision", "predictive modeling"
    ],
    "Product Manager": [
        "product strategy", "roadmap", "agile", "scrum", "analytics", "market research",
        "stakeholder management", "user stories", "ux", "leadership", "kpis",
        "product life cycle", "business analysis", "communication", "prioritization",
        "jira", "confluence", "customer feedback", "ab testing", "metrics"
    ],
    "DevOps Engineer": [
        "docker", "kubernetes", "aws", "terraform", "ci/cd", "jenkins", "linux",
        "bash", "monitoring", "ansible", "cloud computing", "git", "prometheus",
        "grafana", "shell scripting", "networking", "security", "azure", "gcp",
        "infrastructure as code", "iac", "helm"
    ],
    "UI/UX Designer": [
        "figma", "wireframing", "prototyping", "user research", "ui design", "ux research",
        "adobe xd", "interaction design", "usability testing", "design system",
        "information architecture", "mockups", "graphic design", "visual design",
        "user flows", "heuristics", "personas", "typography", "color theory"
    ]
}

ROLE_TEMPLATES_CV = [
    "Experienced {role} with a demonstrated history of working in the tech industry. Developed and implemented core modules. Skilled in {skills}. Strong engineering professional with a focus on delivering high quality software and user experiences.",
    "Detail-oriented {role} specialized in building scalable systems and leveraging modern tools. Designed, built, and optimized system performance. Proficient in {skills}. Passionate about technical excellence and agile collaboration.",
    "Certified {role} seeking to leverage skills in {skills} to drive impact. Strong background in problem solving, clean code, and working in cross-functional agile teams. Collaborated to create high-performing solutions."
]

ROLE_TEMPLATES_JD = [
    "We are seeking a talented {role} to join our growing team. You will be responsible for building, designing, and maintaining core applications. Required skills: {skills}. Must have strong communication and team collaboration skills.",
    "Looking for a senior {role} who excels in {skills}. The ideal candidate is passionate about innovation, mentoring junior developers, and following best practices such as unit testing and system design.",
    "Open vacancy for a {role} with expertise in {skills}. You will work in an agile environment and participate in product design, architecture planning, and deployment pipelines."
]

IRRELEVANT_CV_TEXTS = [
    "Experienced professional artist specializing in oil painting, fine arts, and digital sketching. Expert in Adobe Photoshop, canvas management, and color theory.",
    "Professional chef with 10 years experience running fine dining kitchens. Expert in culinary arts, menu design, kitchen management, and food safety standards.",
    "Licensed real estate agent with a proven track record in residential sales. Skilled in negotiation, client relationship management, marketing, and contract management."
]

def generate_synthetic_data(num_samples=800):
    data = []
    
    # Seniorities to inject variety into experience alignment
    seniorities = ["Junior", "Senior", "Lead", "Associate", ""]
    
    # 1. High Match Samples (approx 35%)
    for _ in range(int(num_samples * 0.35)):
        role = random.choice(list(ROLES.keys()))
        skills = ROLES[role]
        
        # Pick 8-12 skills for JD, and 7-10 for CV (high overlap)
        jd_skills = random.sample(skills, random.randint(8, 12))
        cv_skills = random.sample(jd_skills, random.randint(7, len(jd_skills)))
        
        seniority = random.choice(seniorities)
        role_cv = f"{seniority} {role}".strip() if seniority else role
        role_jd = f"{seniority} {role}".strip() if seniority else role
        
        cv_text = random.choice(ROLE_TEMPLATES_CV).format(role=role_cv, skills=", ".join(cv_skills))
        jd_text = random.choice(ROLE_TEMPLATES_JD).format(role=role_jd, skills=", ".join(jd_skills))
        
        data.append({
            "cv_text": cv_text,
            "job_description": jd_text,
            "target_role": role_jd,
            "match_category": "high"
        })
        
    # 2. Medium Match Samples (approx 35%)
    for _ in range(int(num_samples * 0.35)):
        role = random.choice(list(ROLES.keys()))
        skills = ROLES[role]
        
        # JD skills
        jd_skills = random.sample(skills, random.randint(8, 12))
        # CV skills only have a few overlapping, plus some skills from other roles
        overlap_skills = random.sample(jd_skills, random.randint(3, 5))
        other_roles = [r for r in ROLES.keys() if r != role]
        other_role = random.choice(other_roles)
        other_skills = random.sample(ROLES[other_role], 4)
        cv_skills = overlap_skills + other_skills
        
        # Mismatched seniorities
        role_cv = f"{random.choice(['Junior', ''])} {role}".strip()
        role_jd = f"Senior {role}"
        
        cv_text = random.choice(ROLE_TEMPLATES_CV).format(role=role_cv, skills=", ".join(cv_skills))
        jd_text = random.choice(ROLE_TEMPLATES_JD).format(role=role_jd, skills=", ".join(jd_skills))
        
        data.append({
            "cv_text": cv_text,
            "job_description": jd_text,
            "target_role": role_jd,
            "match_category": "medium"
        })
        
    # 3. Low Match Samples (approx 30%)
    for _ in range(int(num_samples * 0.30)):
        role = random.choice(list(ROLES.keys()))
        skills = ROLES[role]
        jd_skills = random.sample(skills, random.randint(8, 12))
        
        role_jd = f"Senior {role}"
        jd_text = random.choice(ROLE_TEMPLATES_JD).format(role=role_jd, skills=", ".join(jd_skills))
        
        # Either totally irrelevant career, or mismatch role completely
        if random.random() < 0.5:
            cv_text = random.choice(IRRELEVANT_CV_TEXTS)
        else:
            other_roles = [r for r in ROLES.keys() if r != role]
            other_role = random.choice(other_roles)
            other_skills = random.sample(ROLES[other_role], 6)
            role_cv = f"Junior {other_role}"
            cv_text = random.choice(ROLE_TEMPLATES_CV).format(role=role_cv, skills=", ".join(other_skills))
            
        data.append({
            "cv_text": cv_text,
            "job_description": jd_text,
            "target_role": role_jd,
            "match_category": "low"
        })
        
    return pd.DataFrame(data)

def compute_target_score(row_features):
    # Features are: tfidf_similarity, evidence_score, experience_alignment, keyword_density
    # Weights: 40% Evidence, 30% TF-IDF, 20% Experience, 10% Keyword Density
    score = (
        40.0 * row_features['evidence_score'] +
        30.0 * row_features['tfidf_similarity'] +
        20.0 * row_features['experience_alignment'] +
        10.0 * row_features['keyword_density']
    )
    
    # Add random Gaussian noise to simulate human/market subjectivity
    noise = np.random.normal(0, 3.0)
    score = score + noise
    
    return float(np.clip(score, 0.0, 100.0))

def train_model():
    print("Generating synthetic CV-JD pairs...")
    df = generate_synthetic_data(num_samples=1000)
    
    print("Fitting TF-IDF Vectorizer...")
    # Gather all CV and JD texts to fit vectorizer vocabulary
    all_texts = pd.concat([df['cv_text'], df['job_description']]).unique()
    vectorizer = TfidfVectorizer(max_features=1000, stop_words='english')
    vectorizer.fit(all_texts)
    
    print("Extracting features from text pairs...")
    features_list = []
    for _, row in df.iterrows():
        feat = extract_all_features(
            row['cv_text'], 
            row['job_description'], 
            row['target_role'], 
            vectorizer=vectorizer
        )
        features_list.append(feat)
        
    features_df = pd.DataFrame(features_list)
    
    # Explicitly enforce stable column ordering
    feature_cols = ["tfidf_similarity", "evidence_score", "experience_alignment", "keyword_density"]
    features_df = features_df[feature_cols]
    
    print("Computing target match rates...")
    df['match_rate'] = [compute_target_score(row) for _, row in features_df.iterrows()]
    
    # Combine features and labels
    X = features_df.values
    y = df['match_rate']
    
    # Split into train/test
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print(f"Training Random Forest Regressor on {len(X_train)} samples...")
    model = RandomForestRegressor(n_estimators=100, max_depth=6, random_state=42)
    model.fit(X_train, y_train)
    
    train_score = model.score(X_train, y_train)
    test_score = model.score(X_test, y_test)
    print(f"Training R^2 Score: {train_score:.4f}")
    print(f"Testing R^2 Score: {test_score:.4f}")
    
    # Feature Importances
    importances = model.feature_importances_
    for name, importance in zip(features_df.columns, importances):
        print(f"Feature '{name}': {importance:.4f}")
        
    # Save artifacts in the current folder (ats_model_app/)
    os.makedirs("ats_model_app", exist_ok=True)
    model_path = "ats_model_app/model.joblib"
    vectorizer_path = "ats_model_app/vectorizer.joblib"
    
    joblib.dump(model, model_path)
    joblib.dump(vectorizer, vectorizer_path)
    print(f"Successfully saved trained model to {model_path}")
    print(f"Successfully saved TF-IDF vectorizer to {vectorizer_path}")

if __name__ == "__main__":
    train_model()
