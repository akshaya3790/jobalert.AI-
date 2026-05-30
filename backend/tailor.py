import json
from agent import call_gemini_with_retry

def tailor_resume_to_jd(resume_json: dict, jd_text: str) -> dict:
    """
    Sends the user's current resume (in JSON schema) and the JD to Gemini.
    Returns the modified JSON strictly adhering to the hallucination rules.
    """
    
    prompt = f"""
    You are an elite Executive Career Coach and AI Resume Writer. 
    Your task is to tailor the candidate's existing resume strictly to match the provided Job Description. 

    STRICT RULES:
    1. DO NOT invent or hallucinate any fake jobs, companies, degrees, or years of experience. You must only enhance the user's existing truth.
    2. Weave missing keywords from the Job Description naturally into the existing experience bullet points where relevant.
    3. Rephrase weak or passive verbs into strong, active verbs that match the tone of the Job Description.
    4. Ensure the output remains highly professional, concise, and ATS-friendly.
    5. ONLY return a valid JSON object matching the input schema exactly. Do not add markdown backticks outside of the JSON.

    Input Resume JSON:
    {json.dumps(resume_json, indent=2)}

    Job Description:
    {jd_text[:8000]}
    """
    
    try:
        tailored = call_gemini_with_retry(prompt)
        
        # Merge back any missing structural fields just in case the LLM dropped them
        if not isinstance(tailored, dict):
            raise Exception("LLM did not return a dictionary.")
            
        return tailored
    except Exception as e:
        print(f"Tailoring failed: {e}")
        # Fallback to original if tailoring fails
        return resume_json
