import json
from agent import call_gemini_with_retry

class AutoApplyVerifier:
    @staticmethod
    def verify_eligibility(resume_json: dict, jd_text: str) -> dict:
        """
        Runs a pre-flight check to verify if the candidate meets the absolute hard constraints of the JD,
        and identifies what specific dynamic fields the application requires.
        """
        
        prompt = f"""
        You are an elite Applicant Tracking System (ATS) pre-screener.
        Analyze the Candidate Resume against the Job Description.

        1. Determine if the candidate meets the HARD constraints (e.g., minimum years of experience, citizenship/visa requirements, exact degree required).
           If they fail a hard constraint, set "eligible" to false and provide a short "reason".
        2. Identify any standard application fields that are MISSING from the candidate's JSON profile that the JD implies or typically asks for 
           (e.g., "github_url", "portfolio_url", "visa_sponsorship_needed", "notice_period_days").
           Return these as an array of strings in "missing_fields".
        
        Return ONLY a JSON object matching this schema exactly:
        {{
            "eligible": true/false,
            "reason": "Clear explanation if false, otherwise 'Eligible'",
            "missing_fields": ["github_url", "visa_status"]
        }}
        
        Candidate Resume:
        {json.dumps(resume_json, indent=2)}
        
        Job Description:
        {jd_text[:8000]}
        """
        
        try:
            res = call_gemini_with_retry(prompt)
            if isinstance(res, dict) and "eligible" in res:
                return res
        except Exception as e:
            print(f"Error in Pre-Flight Verification: {e}")
            
        # Fallback to safe optimistic approach if LLM fails
        return {
            "eligible": True,
            "reason": "Verification skipped due to error. Proceed with caution.",
            "missing_fields": ["linkedin_url", "visa_sponsorship_needed"]
        }
