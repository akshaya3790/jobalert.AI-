import os
import json
import urllib.parse
from agent import call_gemini_with_retry

class SkillGapAnalyzer:
    @staticmethod
    def analyze_skills(resume_json: dict, jd_text: str) -> dict:
        """
        Uses Gemini to semantically extract required skills from the JD, compare them to the Resume,
        and output the exact matching/missing arrays.
        """
        
        prompt = f"""
        You are an expert AI Career Coach. 
        Perform a semantic skill gap analysis between the Candidate's Resume and the Job Description.
        
        1. Extract the core required skills (both technical and soft) from the Job Description.
        2. Semantically compare them to the skills present in the Candidate's Resume. 
           (e.g., "React.js" in the resume covers "React" in the JD. "AWS" covers "Amazon Web Services").
        3. Output an array of "matching_skills".
        4. Output an array of critical "missing_skills" (maximum 5) that the candidate lacks.
        5. For the top 2 "missing_skills", generate realistic, actionable mini-projects the candidate could build to learn them.
           Each project must have a "title", "description", and a "steps" array.
        
        Return ONLY a JSON object matching this schema exactly:
        {{
            "matching_skills": ["React", "Python", "Docker"],
            "missing_skills": ["Kubernetes", "GraphQL"],
            "project_recommendations": [
                {{
                    "title": "Cloud-Native E-Commerce API",
                    "description": "Containerize a basic CRUD API using Docker and deploy it to an AWS EC2 instance.",
                    "steps": ["Write the Dockerfile", "Provision EC2 instance", "Deploy via SSH"]
                }}
            ]
        }}
        
        Candidate Resume:
        {json.dumps(resume_json, indent=2)}
        
        Job Description:
        {jd_text[:8000]}
        """
        
        try:
            res = call_gemini_with_retry(prompt)
            if isinstance(res, dict) and "matching_skills" in res:
                
                # Attach learning resources to missing skills
                missing = res.get("missing_skills", [])
                resources = []
                for skill in missing:
                    resources.append(SkillGapAnalyzer.get_learning_resource(skill))
                
                res["learning_resources"] = resources
                return res
        except Exception as e:
            print(f"Error in Skill Gap Analysis: {e}")
            
        return {
            "matching_skills": [],
            "missing_skills": [],
            "learning_resources": [],
            "project_recommendations": []
        }

    @staticmethod
    def get_learning_resource(skill_name: str) -> dict:
        """
        Fetches a learning resource for a given skill. 
        If YOUTUBE_API_KEY is available, fetches real data. 
        Otherwise, falls back to dynamic search links.
        """
        import urllib.request
        
        api_key = os.getenv("YOUTUBE_API_KEY")
        if api_key:
            try:
                query = urllib.parse.quote(f"learn {skill_name} crash course")
                url = f"https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=1&q={query}&type=video&key={api_key}"
                
                req = urllib.request.Request(url)
                with urllib.request.urlopen(req, timeout=5) as response:
                    data = json.loads(response.read().decode())
                    if data.get("items") and len(data["items"]) > 0:
                        item = data["items"][0]
                        return {
                            "skill": skill_name,
                            "title": item["snippet"]["title"],
                            "url": f"https://www.youtube.com/watch?v={item['id']['videoId']}",
                            "platform": "YouTube",
                            "thumbnail": item["snippet"]["thumbnails"]["high"]["url"]
                        }
            except Exception as e:
                print(f"YouTube API Error for {skill_name}: {e}")
        
        # Fallback to dynamic URL generation
        query = urllib.parse.quote(f"learn {skill_name} tutorial")
        return {
            "skill": skill_name,
            "title": f"Top Free Tutorials for {skill_name}",
            "url": f"https://www.youtube.com/results?search_query={query}",
            "platform": "YouTube (Search)",
            "thumbnail": "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=500&h=300&fit=crop" # Generic Code/Tech image
        }
