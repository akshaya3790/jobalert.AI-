import json
import re
import math
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from agent import call_gemini_with_retry, call_gemini_raw_text

class ResumeAnalyzerEngine:
    
    @staticmethod
    def extract_jd_skills(jd_text: str) -> list:
        """Uses LLM to extract required hard and soft skills from the JD."""
        prompt = f"""
        You are an expert ATS parser. Extract the required hard skills, tools, technologies, and critical soft skills from the following Job Description.
        Return ONLY a valid JSON array of strings (the skill names).
        
        Job Description:
        {jd_text[:8000]}
        """
        try:
            skills = call_gemini_with_retry(prompt)
            if isinstance(skills, list):
                return [str(s).strip() for s in skills]
            return []
        except Exception as e:
            print(f"Error extracting JD skills: {e}")
            return []

    @staticmethod
    def detect_missing_skills(resume_text: str, jd_skills: list) -> list:
        """Finds which required JD skills are missing from the resume."""
        resume_lower = resume_text.lower()
        missing = []
        for skill in jd_skills:
            # Simple substring search. For more accuracy, word boundaries could be used.
            if skill.lower() not in resume_lower:
                missing.append(skill)
        return missing

    @staticmethod
    def keyword_gap_analysis(resume_text: str, jd_text: str) -> dict:
        """
        Uses TF-IDF to find high-value semantic keywords in the JD 
        that are missing or underrepresented in the resume.
        """
        try:
            # Simple TF-IDF with english stop words
            vectorizer = TfidfVectorizer(stop_words='english', ngram_range=(1, 2), max_features=100)
            
            # Fit on the JD to find what's important there
            tfidf_matrix = vectorizer.fit_transform([jd_text, resume_text])
            feature_names = vectorizer.get_feature_names_out()
            
            jd_scores = tfidf_matrix[0].toarray()[0]
            resume_scores = tfidf_matrix[1].toarray()[0]
            
            missing_keywords = []
            for i, word in enumerate(feature_names):
                # If it's a prominent word in JD (>0.05 TFIDF) but barely in resume
                if jd_scores[i] > 0.05 and resume_scores[i] < 0.01:
                    missing_keywords.append({
                        "keyword": word,
                        "importance_score": round(jd_scores[i] * 100, 1)
                    })
                    
            # Sort by importance descending
            missing_keywords = sorted(missing_keywords, key=lambda x: x['importance_score'], reverse=True)
            return {"missing_keywords": missing_keywords[:15]}
        except Exception as e:
            print(f"Error in keyword gap analysis: {e}")
            return {"missing_keywords": []}

    @staticmethod
    def generate_improvement_suggestions(resume_text: str) -> list:
        """Uses LLM to flag weak verbs and missing quantifiable metrics."""
        prompt = f"""
        You are an expert career coach reviewing a resume. 
        Identify 3 to 5 specific bullet points or sentences in this resume that are weak.
        A weak bullet point is one that:
        1. Lacks quantifiable metrics (numbers, percentages, dollar amounts).
        2. Uses passive or weak verbs (e.g., "helped", "worked on", "responsible for").
        
        Return a strict JSON array of objects, where each object has:
        - "original_text": A snippet of the weak text found.
        - "reason": Why it is weak.
        - "suggestion": How to rewrite it powerfully with placeholder metrics.
        
        Resume:
        {resume_text[:6000]}
        """
        try:
            suggestions = call_gemini_with_retry(prompt)
            if isinstance(suggestions, list):
                return suggestions
            return []
        except Exception as e:
            print(f"Error generating suggestions: {e}")
            return []

    @staticmethod
    def calculate_ats_score(resume_text: str, jd_text: str, missing_skills_count: int, total_jd_skills: int) -> int:
        """Calculates a weighted ATS score from 0-100."""
        # 1. Base TF-IDF Cosine Similarity Score (Weight: 40%)
        try:
            vectorizer = TfidfVectorizer(stop_words='english')
            tfidf_matrix = vectorizer.fit_transform([jd_text, resume_text])
            similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
        except:
            similarity = 0.5
            
        text_match_score = similarity * 100
        
        # 2. Hard Skills Match Score (Weight: 60%)
        if total_jd_skills > 0:
            skills_found = total_jd_skills - missing_skills_count
            skills_score = (skills_found / total_jd_skills) * 100
        else:
            skills_score = text_match_score # Fallback if no skills extracted

        # Weighted calculation
        final_score = (text_match_score * 0.4) + (skills_score * 0.6)
        
        # Add a small bump for overall length/detail (cap at 100)
        if len(resume_text) > 1500:
            final_score += 5
            
        return int(min(max(final_score, 0), 100))

    @staticmethod
    def predict_percentile_rank(ats_score: int) -> str:
        """
        Simulates competitive ranking using a normal distribution.
        Assumes average applicant ATS score is 45 with a std dev of 15.
        """
        mean = 45
        std_dev = 15
        
        # Calculate Z-score
        z = (ats_score - mean) / std_dev
        
        # Cumulative Distribution Function (CDF) approximation for normal distribution
        percentile = 0.5 * (1 + math.erf(z / math.sqrt(2)))
        percentile = int(percentile * 100)
        
        # Bound between 1 and 99
        percentile = max(1, min(percentile, 99))
        
        # If percentile is 99, it means top 1%. 
        # If percentile is 80, it means top 20%.
        top_percent = 100 - percentile
        
        if top_percent <= 5:
            return f"Exceptional! Your resume ranks in the top {top_percent}% of applicants."
        elif top_percent <= 25:
            return f"Strong match. Your resume ranks in the top {top_percent}% of applicants."
        elif top_percent <= 50:
            return f"Average match. Your resume ranks in the top {top_percent}% of applicants."
        else:
            return f"Below average. You are in the bottom {percentile}% of applicants. Significant tailoring needed."

    @classmethod
    def analyze(cls, resume_text: str, jd_text: str) -> dict:
        """Runs the full analysis pipeline."""
        
        # 1. Extract Skills
        jd_skills = cls.extract_jd_skills(jd_text)
        
        # 2. Find Missing
        missing_skills = cls.detect_missing_skills(resume_text, jd_skills)
        
        # 3. Gap Analysis
        gap_data = cls.keyword_gap_analysis(resume_text, jd_text)
        
        # 4. ATS Score
        score = cls.calculate_ats_score(resume_text, jd_text, len(missing_skills), len(jd_skills))
        
        # 5. Predictions
        rank = cls.predict_percentile_rank(score)
        
        # 6. Suggestions
        suggestions = cls.generate_improvement_suggestions(resume_text)
        
        return {
            "ats_score": score,
            "percentile_rank": rank,
            "total_jd_skills": len(jd_skills),
            "missing_skills": missing_skills,
            "missing_keywords": gap_data["missing_keywords"],
            "improvement_suggestions": suggestions
        }
