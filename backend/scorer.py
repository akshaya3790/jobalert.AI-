import re
import json
from agent import call_gemini_with_retry

class JobMatchCalculator:
    @staticmethod
    def _extract_jd_data(jd_text: str) -> dict:
        """Uses LLM to extract skills, YOE, and salary from JD text."""
        prompt = f"""
        Analyze the following Job Description and extract:
        1. "skills": Array of required technical and soft skills.
        2. "yoe": Integer representing the MINIMUM years of experience required (return 0 if not specified).
        3. "salary_min": Integer representing the minimum offered salary in USD (return 0 if not specified).
        
        Return ONLY a strict JSON object with keys: "skills", "yoe", "salary_min". No markdown backticks.
        
        Job Description:
        {jd_text[:8000]}
        """
        try:
            res = call_gemini_with_retry(prompt)
            if isinstance(res, dict):
                return {
                    "skills": [s.lower() for s in res.get("skills", [])],
                    "yoe": int(res.get("yoe", 0)),
                    "salary_min": int(res.get("salary_min", 0))
                }
        except Exception as e:
            print(f"Error extracting JD data: {e}")
        return {"skills": [], "yoe": 0, "salary_min": 0}

    @staticmethod
    def _get_user_yoe(profile: dict) -> int:
        """Estimates user YOE based on experience array length or explicit field."""
        if profile.get("years_of_experience"):
            try:
                return int(profile["years_of_experience"])
            except:
                pass
        
        exp_list = profile.get("experience", [])
        # Rough estimation: 2 years per job if not explicitly stated
        return len(exp_list) * 2

    @staticmethod
    def _get_user_salary(profile: dict) -> int:
        """Extracts expected salary."""
        salary = profile.get("expected_salary", 0)
        try:
            # strip out strings like "$100k" or "$100,000"
            if isinstance(salary, str):
                s = re.sub(r'[^\d]', '', salary)
                if s:
                    val = int(s)
                    if 'k' in salary.lower() and val < 1000:
                        val *= 1000
                    return val
            return int(salary)
        except:
            return 0

    @classmethod
    def calculate_match(cls, profile_json: dict, jd_text: str) -> dict:
        jd_data = cls._extract_jd_data(jd_text)
        
        # 1. Skills Match
        jd_skills = jd_data["skills"]
        user_skills = [s.lower() for s in profile_json.get("skills", [])]
        
        # also check if skill is embedded in experience text
        exp_text = " ".join([j.get("description", "") + " ".join(j.get("bullets", [])) for j in profile_json.get("experience", [])]).lower()
        
        matching_skills = []
        missing_skills = []
        for s in jd_skills:
            if s in user_skills or s in exp_text:
                matching_skills.append(s)
            else:
                missing_skills.append(s)
                
        skills_score = int((len(matching_skills) / len(jd_skills)) * 100) if jd_skills else 100
        
        # 2. Experience Match
        user_yoe = cls._get_user_yoe(profile_json)
        req_yoe = jd_data["yoe"]
        
        if req_yoe <= 0:
            exp_score = 100
        elif user_yoe >= req_yoe:
            exp_score = 100
        else:
            exp_score = int((user_yoe / req_yoe) * 100)
            
        # 3. Salary Match
        user_sal = cls._get_user_salary(profile_json)
        jd_sal = jd_data["salary_min"]
        
        sal_score = 100
        sal_indicator = "Matching or Not Specified"
        
        if jd_sal > 0 and user_sal > 0:
            if user_sal <= jd_sal:
                sal_score = 100
                sal_indicator = "Within your range"
            else:
                diff = user_sal - jd_sal
                pct = (diff / user_sal) * 100
                sal_score = max(0, 100 - int(pct * 2)) # penalize 2% for every 1% over budget
                sal_indicator = f"{int(pct)}% below your expected range"
                
        # 4. Overall Weighted Score
        if jd_sal == 0:
            # Redistribute weight if no salary info
            overall = (skills_score * 0.6) + (exp_score * 0.4)
        else:
            overall = (skills_score * 0.5) + (exp_score * 0.3) + (sal_score * 0.2)
            
        return {
            "overall_score": int(overall),
            "sub_scores": {
                "skills": skills_score,
                "experience": exp_score,
                "salary": sal_score
            },
            "metrics": {
                "skills": {
                    "matching_skills": [s.title() for s in matching_skills],
                    "missing_skills": [s.title() for s in missing_skills]
                },
                "experience": {
                    "user_yoe": user_yoe,
                    "required_yoe": req_yoe
                },
                "salary": {
                    "user_expected": user_sal,
                    "jd_offered_min": jd_sal,
                    "indicator": sal_indicator
                }
            }
        }
