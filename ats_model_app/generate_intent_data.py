import os
import csv
import json
import time
from typing import List, Dict
from dotenv import load_dotenv
from groq import Groq

# Load environment variables
load_dotenv(override=True)

# Initialize Groq client
api_key = os.environ.get("GROQ_API_KEY", "")
if not api_key:
    print("WARNING: GROQ_API_KEY not found in environment. Please make sure it is set in .env")
client = Groq(api_key=api_key)

INTENTS = {
    "CAREER_EXPLORATION": "User ingin tahu karir yang cocok, eksplorasi karir, atau rekomendasi role baru.",
    "SKILL_INQUIRY": "User bertanya tentang skill, keahlian, atau kompetensi yang dibutuhkan untuk menjadi role tertentu.",
    "RESOURCE_REQUEST": "User meminta rekomendasi modul belajar, kursus online, playlist YouTube, atau bahan belajar lainnya.",
    "CONSTRAINT_UPDATE": "User memperbarui batasan mereka, seperti ketersediaan waktu belajar per minggu atau anggaran/budget kursus.",
    "PUSH_BACK": "User tidak setuju, keberatan, atau menolak rekomendasi roadmap/skill/kursus yang diberikan.",
    "CONFIRMATION": "User menyetujui, mengonfirmasi, mengiyakan, atau ingin melanjutkan ke langkah berikutnya.",
    "CV_REVIEW": "User meminta feedback, review, atau koreksi terhadap resume/CV mereka.",
    "LINKEDIN_REVIEW": "User meminta feedback, review, atau tips optimasi profil LinkedIn mereka."
}

def generate_phrases_for_intent(intent: str, description: str, num_samples: int = 120) -> List[str]:
    """Generates synthetic Indonesian user phrases for a specific intent class in batches."""
    phrases = []
    batch_size = 40
    num_batches = (num_samples + batch_size - 1) // batch_size
    
    print(f"Generating data for '{intent}' ({num_samples} samples, {num_batches} batches)...")
    
    for b in range(num_batches):
        current_batch_size = min(batch_size, num_samples - len(phrases))
        if current_batch_size <= 0:
            break
            
        prompt = f"""Kamu adalah asisten AI yang membantu mengumpulkan dataset latih bahasa Indonesia.
Buatkan {current_batch_size} variasi pesan singkat, pertanyaan, atau pernyataan dalam Bahasa Indonesia yang diucapkan oleh pengguna aplikasi chatbot karir.
Pesan-pesan ini harus diklasifikasikan ke kategori intent: `{intent}`.
Keterangan intent `{intent}`: {description}

Kriteria variasi kalimat:
1. Harus natural seperti bahasa sehari-hari orang Indonesia saat berinteraksi dengan chatbot karir.
2. Gunakan campuran gaya: formal, semi-formal, santai/gaul (misal pake kata 'gw', 'aku', 'lu', 'nih', 'dong', 'makasih', dll), serta kalimat pendek/panjang.
3. Hindari kalimat yang sama persis atau template yang terlalu monoton. Berikan variasi kata tanya, kosakata, dan struktur kalimat.
4. Output harus berupa JSON VALID berupa list string saja tanpa penjelasan apapun di luar JSON.

Format respons wajib:
[
  "contoh kalimat 1",
  "contoh kalimat 2",
  ...
]
"""
        # Call Groq API
        retries = 3
        while retries > 0:
            try:
                response = client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.85,
                    response_format={"type": "json_object"},
                    max_tokens=2048,
                )
                content = response.choices[0].message.content.strip()
                data = json.loads(content)
                
                # Check if it's a list or dictionary with a key
                if isinstance(data, list):
                    batch_phrases = [str(p).strip() for p in data if p]
                elif isinstance(data, dict):
                    # Sometimes LLM wraps it in a dict key like "phrases" or "sentences"
                    key = next(iter(data.keys()))
                    batch_phrases = [str(p).strip() for p in data[key] if p]
                else:
                    batch_phrases = []
                    
                if batch_phrases:
                    phrases.extend(batch_phrases)
                    print(f"  -> Batch {b+1}/{num_batches} success: Generated {len(batch_phrases)} phrases. Total so far: {len(phrases)}")
                    break
                else:
                    raise ValueError("Empty response list")
            except Exception as e:
                print(f"  -> Error in batch {b+1} (Retrying... {retries-1} left): {e}")
                retries -= 1
                time.sleep(2)
                
        time.sleep(1) # prevent rate limits
        
    return phrases[:num_samples]

def main():
    if not api_key:
        print("Error: Set GROQ_API_KEY in your .env file to generate synthetic data.")
        return
        
    dataset = []
    
    # Generate around 120 samples per intent category
    samples_per_intent = 120
    
    for intent, desc in INTENTS.items():
        try:
            phrases = generate_phrases_for_intent(intent, desc, samples_per_intent)
            for text in phrases:
                dataset.append({"text": text, "label": intent})
        except Exception as e:
            print(f"Failed to generate for {intent}: {e}")
            
    # Save to CSV file
    os.makedirs("ats_model_app", exist_ok=True)
    output_path = "ats_model_app/intent_dataset.csv"
    
    try:
        with open(output_path, mode="w", encoding="utf-8", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=["text", "label"])
            writer.writeheader()
            for row in dataset:
                writer.writerow(row)
        print(f"\nSUCCESS: Successfully generated and saved {len(dataset)} samples to {output_path}!")
    except Exception as e:
        print(f"Error saving dataset to CSV: {e}")

if __name__ == "__main__":
    main()
