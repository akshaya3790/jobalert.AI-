import os
import json
import time
import urllib.request
import urllib.parse
from typing import List, Dict, Any
from agent import call_gemini_with_retry

# --- In-Memory Cache (TTL: 24 Hours) ---
# Format: { "skill_name": { "data": dict, "expires_at": float } }
LEARNING_CACHE = {}
CACHE_TTL = 86400  # 24 hours in seconds

class LearningAggregator:
    @staticmethod
    def get_recommendations(skills: List[str]) -> Dict[str, Any]:
        """Fetches aggregated learning resources for a list of missing skills."""
        results = {
            "youtube": [],
            "courses": [],
            "practice": []
        }
        
        for skill in skills[:3]: # Limit to top 3 to avoid overwhelming
            skill_lower = skill.lower()
            
            # Check Cache
            cached = LEARNING_CACHE.get(skill_lower)
            if cached and time.time() < cached["expires_at"]:
                print(f"[CACHE HIT] Returning cached resources for {skill}")
                results["youtube"].extend(cached["data"].get("youtube", []))
                results["courses"].extend(cached["data"].get("courses", []))
                results["practice"].extend(cached["data"].get("practice", []))
                continue
                
            print(f"[CACHE MISS] Fetching resources for {skill}")
            
            # Fetch Data
            yt = LearningAggregator._fetch_youtube(skill)
            crs = LearningAggregator._fetch_courses(skill)
            prac = LearningAggregator._fetch_practice(skill)
            
            # Update Cache
            LEARNING_CACHE[skill_lower] = {
                "data": {
                    "youtube": yt,
                    "courses": crs,
                    "practice": prac
                },
                "expires_at": time.time() + CACHE_TTL
            }
            
            results["youtube"].extend(yt)
            results["courses"].extend(crs)
            results["practice"].extend(prac)
            
        return results

    @staticmethod
    def _fetch_youtube(skill: str) -> List[Dict]:
        """Fetches top 3 videos via YouTube API or Fallback."""
        api_key = os.getenv("YOUTUBE_API_KEY")
        if api_key and api_key != "YOUR_API_KEY":
            try:
                query = urllib.parse.quote(f"learn {skill} full course tutorial")
                url = f"https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=3&q={query}&type=video&key={api_key}"
                
                req = urllib.request.Request(url)
                with urllib.request.urlopen(req, timeout=5) as response:
                    data = json.loads(response.read().decode())
                    videos = []
                    for item in data.get("items", []):
                        videos.append({
                            "skill": skill,
                            "title": item["snippet"]["title"],
                            "url": f"https://www.youtube.com/watch?v={item['id']['videoId']}",
                            "platform": "YouTube",
                            "thumbnail": item["snippet"]["thumbnails"]["high"]["url"],
                            "author": item["snippet"]["channelTitle"]
                        })
                    return videos
            except Exception as e:
                print(f"YouTube API Error for {skill}: {e}")
                
        # Fallback Strategy: Dynamic Search links
        return [
            {
                "skill": skill,
                "title": f"Top Free Tutorials for {skill}",
                "url": f"https://www.youtube.com/results?search_query={urllib.parse.quote('learn ' + skill)}",
                "platform": "YouTube (Search)",
                "thumbnail": "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=500&h=300&fit=crop",
                "author": "Various Creators"
            }
        ]

    @staticmethod
    def _fetch_courses(skill: str) -> List[Dict]:
        """Uses Gemini to hallucinate/recommend highly accurate actual courses."""
        prompt = f"""
        Act as a Learning Recommendation Engine. The user needs to learn '{skill}'.
        Recommend exactly 2 highly-rated, popular, real-world online courses or certifications for this skill.
        
        Return ONLY a JSON array of objects with the exact schema:
        [
            {{
                "skill": "{skill}",
                "title": "Course Name",
                "url": "Search URL or official URL",
                "platform": "Coursera / Udemy / edX",
                "rating": "4.8",
                "price_status": "Free / Paid",
                "thumbnail": "Use a generic tech image URL like https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=500&h=300&fit=crop"
            }}
        ]
        """
        try:
            res = call_gemini_with_retry(prompt)
            if isinstance(res, list):
                return res
        except Exception as e:
            print(f"Error fetching courses for {skill}: {e}")
            
        return [{
            "skill": skill,
            "title": f"Mastering {skill} Fundamentals",
            "url": f"https://www.udemy.com/courses/search/?src=ukw&q={urllib.parse.quote(skill)}",
            "platform": "Udemy",
            "rating": "4.7",
            "price_status": "Paid",
            "thumbnail": "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=500&h=300&fit=crop"
        }]

    @staticmethod
    def _fetch_practice(skill: str) -> List[Dict]:
        """Matches skill to practice platforms via local dictionary."""
        skill_lower = skill.lower()
        
        if any(kw in skill_lower for kw in ['python', 'java', 'c++', 'algorithm', 'data structure']):
            return [{
                "skill": skill,
                "title": f"Algorithm Practice: {skill}",
                "url": "https://leetcode.com/problemset/all/",
                "platform": "LeetCode",
                "description": "Solve competitive programming challenges to master syntax and logic."
            }]
        elif any(kw in skill_lower for kw in ['data', 'machine', 'ai', 'sql', 'pandas', 'tensor']):
            return [{
                "skill": skill,
                "title": f"Data & ML Challenges: {skill}",
                "url": "https://www.kaggle.com/",
                "platform": "Kaggle",
                "description": "Explore datasets and participate in machine learning competitions."
            }]
        elif any(kw in skill_lower for kw in ['react', 'css', 'html', 'vue', 'angular', 'frontend']):
            return [{
                "skill": skill,
                "title": f"Frontend Mentor: {skill}",
                "url": "https://www.frontendmentor.io/challenges",
                "platform": "Frontend Mentor",
                "description": "Build real-world UI components and websites to practice styling and frameworks."
            }]
        else:
            return [{
                "skill": skill,
                "title": f"Open Source Contributions: {skill}",
                "url": f"https://github.com/search?q=label%3A%22good+first+issue%22+language%3A{urllib.parse.quote(skill)}&type=Issues",
                "platform": "GitHub",
                "description": "Find 'Good First Issues' on GitHub to practice building real software."
            }]
