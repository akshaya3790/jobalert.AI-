import json
import re
import pandas as pd
from datetime import datetime
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

# Load the embedding model globally so it's loaded once per worker process.
# We use a lightweight sentence-transformer model that runs on CPU efficiently.
try:
    print("Loading SentenceTransformer model for job deduplication...")
    embedder = SentenceTransformer('all-MiniLM-L6-v2')
except Exception as e:
    print(f"Error loading embedder: {e}")
    embedder = None

def normalize_job_data(job_dict: dict) -> dict:
    """
    Cleans and standardizes raw job data using basic pandas/python string ops.
    """
    df = pd.DataFrame([job_dict])
    
    # 1. Normalize Title & Company
    df['title'] = df['title'].str.strip().str.title()
    df['company'] = df['company'].str.strip()
    
    # 2. Normalize Location
    if 'location' in df.columns and pd.notna(df['location'].iloc[0]):
        loc = str(df['location'].iloc[0]).strip()
        if loc.lower() in ['anywhere', 'global', 'wfh']:
            loc = 'Remote'
        df['location'] = loc
        
    # 3. Clean Description whitespace
    if 'description' in df.columns and pd.notna(df['description'].iloc[0]):
        desc = str(df['description'].iloc[0])
        desc = re.sub(r'\s+', ' ', desc).strip()
        df['description'] = desc
        
    # 4. Standardize Salary Strings (Extracting numerical ranges if possible)
    if 'salary' in df.columns and pd.notna(df['salary'].iloc[0]):
        sal_str = str(df['salary'].iloc[0])
        # Simple extraction logic to unify formats like "$100k - $120k" or "100,000 - 120,000 USD"
        # In a full pipeline, we'd use a dedicated parser library
        df['salary'] = sal_str.strip()

    return df.to_dict('records')[0]

def compute_job_embedding(job: dict) -> list:
    """Generates an embedding vector for a job based on its key text fields."""
    if not embedder:
        return []
    
    # Combine fields to create a robust text representation
    title = job.get('title', '')
    company = job.get('company', '')
    desc = job.get('description', '')[:500] # First 500 chars is usually enough for similarity
    
    text_to_embed = f"Title: {title}. Company: {company}. Details: {desc}"
    try:
        embedding = embedder.encode(text_to_embed).tolist()
        return embedding
    except Exception as e:
        print(f"Embedding error: {e}")
        return []

def deduplicate_jobs(new_jobs: list, existing_db_jobs: list, similarity_threshold=0.92) -> list:
    """
    Filters out new_jobs that are highly similar to existing_db_jobs using cosine similarity.
    existing_db_jobs must have an 'embedding' field populated.
    """
    if not embedder or not existing_db_jobs or not new_jobs:
        return new_jobs
        
    # Prepare existing embeddings
    existing_embeddings = []
    for dbj in existing_db_jobs:
        if dbj.embedding:
            try:
                vec = json.loads(dbj.embedding)
                existing_embeddings.append(vec)
            except:
                pass
                
    if not existing_embeddings:
        return new_jobs
        
    existing_matrix = np.array(existing_embeddings)
    unique_jobs = []
    
    for job in new_jobs:
        emb = compute_job_embedding(job)
        if not emb:
            unique_jobs.append(job)
            continue
            
        job['embedding'] = json.dumps(emb)
        
        # Compare with existing
        emb_matrix = np.array([emb])
        similarities = cosine_similarity(emb_matrix, existing_matrix)[0]
        
        max_sim = np.max(similarities) if len(similarities) > 0 else 0
        
        if max_sim < similarity_threshold:
            unique_jobs.append(job)
        else:
            print(f"Duplicate filtered: {job.get('title')} at {job.get('company')} (Similarity: {max_sim:.2f})")
            
    return unique_jobs
