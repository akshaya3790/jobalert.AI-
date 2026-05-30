import json
from agent import call_gemini_raw_text

def generate_cover_letter(resume_json: dict, jd_text: str, letter_type: str, custom_instructions: str = "", modifier: str = "") -> str:
    """Generates a plain-text cover letter based on career stage and instructions."""
    
    base_prompt = f"""
    You are an expert AI Resume Writer and Career Coach. Write a standard business cover letter for the candidate based on their resume and the provided Job Description.
    
    STRICT RULES:
    1. Do NOT hallucinate skills, experiences, or degrees the candidate does not have.
    2. Write in a professional, confident, and engaging tone.
    3. Output ONLY the raw text of the cover letter. No markdown formatting, no conversational filler (e.g. "Here is your letter:").
    4. Follow standard business block format:
       [Candidate Name]
       [Candidate Contact Info]
       
       [Date]
       
       [Hiring Manager Name or "Hiring Manager"]
       [Company Name]
       
       Dear [Hiring Manager Name or "Hiring Team"],
       
       [Body Paragraphs]
       
       Sincerely,
       [Candidate Name]
       
    Candidate Resume:
    {json.dumps(resume_json, indent=2)}
    
    Job Description:
    {jd_text[:8000]}
    """
    
    type_prompts = {
        "internship": "Focus heavily on academic achievements, relevant coursework, eagerness to learn, and foundational skills. Acknowledge the candidate's enthusiasm to transition from academia to industry. Do not invent corporate experience.",
        "fresher": "Highlight capstone projects, relevant internships, adaptability, and core technical skills. Position the candidate based on their project portfolio and rapid learning ability rather than years in the industry.",
        "experienced": "Focus strictly on quantifiable business metrics, leadership, advanced technical expertise, and career progression. Demonstrate how the candidate's extensive background directly maps to the Job Description's requirements.",
        "custom": f"Adhere strictly to the following custom instructions provided by the user: {custom_instructions}. Ensure standard business letter format is maintained."
    }
    
    modifier_prompts = {
        "shorter": "Make the letter significantly more concise, limiting the body to 2 short paragraphs.",
        "longer": "Expand on the candidate's experiences, providing more detailed examples and depth in 3 to 4 substantial body paragraphs.",
        "formal": "Make the tone highly formal, traditional, and strictly professional.",
        "casual": "Make the tone slightly more conversational, modern, and enthusiastic."
    }
    
    prompt = base_prompt + "\n\nSTRATEGY INSTRUCTION:\n" + type_prompts.get(letter_type, type_prompts["experienced"])
    
    if modifier and modifier in modifier_prompts:
        prompt += "\n\nMODIFIER:\n" + modifier_prompts[modifier]
        
    try:
        # We use raw text here because we want a standard string output, not JSON
        result = call_gemini_raw_text(prompt)
        return result.strip()
    except Exception as e:
        print(f"Error generating cover letter: {e}")
        return "Failed to generate cover letter. Please try again."
