import os
import json
import asyncio
from bs4 import BeautifulSoup
import google.generativeai as genai
from dotenv import load_dotenv

try:
    from playwright.async_api import async_playwright
except ImportError:
    async_playwright = None

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    
def get_gemini_model():
    return genai.GenerativeModel('gemini-2.5-flash')

async def fetch_career_page_text(url: str) -> str:
    """Uses Playwright to fetch and render a dynamic career page, extracting clean text."""
    if not async_playwright:
        print("Playwright not installed. Crawler cannot run.")
        return ""
        
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            
            # Anti-bot evasion techniques
            await page.set_extra_http_headers({
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            })
            
            await page.goto(url, wait_until="networkidle", timeout=20000)
            html = await page.content()
            await browser.close()
            
            # Clean HTML to just get text
            soup = BeautifulSoup(html, 'html.parser')
            for script in soup(["script", "style", "nav", "footer"]):
                script.extract()
            text = soup.get_text(separator=' ')
            return ' '.join(text.split())
            
    except Exception as e:
        print(f"Failed to crawl {url}: {e}")
        return ""

def extract_jobs_with_llm(raw_text: str, company_name: str, base_url: str) -> list:
    """Uses Gemini to extract job postings from raw scraped text."""
    if not GEMINI_API_KEY:
        return []
        
    prompt = f"""
    You are an AI Data Engineer. Extract all open job roles from the following scraped text of {company_name}'s career page.
    
    Raw Text: {raw_text[:8000]} # Limit to 8000 chars to save tokens
    
    Return a strict JSON array of objects. Each object must have:
    - title (string)
    - location (string or null)
    - work_type (string: Remote, Hybrid, or Onsite)
    - extract_description (a short 1-2 sentence summary of the role, if available)
    
    Only output the JSON array. No markdown blocks.
    """
    
    try:
        model = get_gemini_model()
        response = model.generate_content(prompt)
        text = response.text.strip()
        if text.startswith("```json"):
            text = text[7:-3]
            
        jobs = json.loads(text)
        
        # Format to unified schema
        formatted_jobs = []
        for j in jobs:
            formatted_jobs.append({
                "title": j.get('title'),
                "company": company_name,
                "location": j.get('location', 'Remote'),
                "work_type": j.get('work_type', 'Remote'),
                "description": j.get('extract_description', ''),
                "url": base_url, # Link back to career page since precise URL might be hidden
                "source": "LLM Crawler"
            })
        return formatted_jobs
        
    except Exception as e:
        print(f"LLM Extraction failed: {e}")
        return []

async def crawl_and_extract(url: str, company_name: str) -> list:
    print(f"Crawling career page for {company_name}...")
    raw_text = await fetch_career_page_text(url)
    if not raw_text:
        return []
    return extract_jobs_with_llm(raw_text, company_name, url)
