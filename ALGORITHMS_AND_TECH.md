# GradPlacement Portal: Algorithms, Scoring Metrics & Advanced Technologies

This document provides a detailed technical breakdown of the architecture, algorithms, match-scoring system, and advanced technologies driving the **GradPlacement Portal**.

---

## 1. Match Scoring System (XAI)
The **Explainable AI (XAI) Match Score** determines how well a candidate's profile aligns with a scanned job posting. The final match percentage is a **weighted average** of 5 distinct evaluation sub-scores:

| Sub-Score Dimension | Weight | Evaluation Method & Logic |
| :--- | :--- | :--- |
| **Skills Match** | **35%** | Compares candidate skills list against requirements in the job description (JD). Under Gemini mode, the model extracts semantic skills. Under fallback mode, it uses a vocabulary scanner to count matching and missing skills: `Score = (matching_skills / total_jd_skills) * 100`. |
| **Role Alignment** | **25%** | Evaluates job title against desired roles. It checks for exact substring matches, followed by a keyword overlap algorithm that ignores standard stop words (e.g. *developer*, *engineer*, *junior*, *senior*). Matches yield `100%`, partial word matches yield `80%`, and mismatches fall back to `30%`. |
| **Location Fit** | **20%** | Compares preferred cities and remote flags. If both prefer Remote, yields `100%`. If a preferred city matches the JD location, yields `100%`. If the job is remote but the user didn't specify remote, yields `80%`. Total mismatches yield `0%`. |
| **Experience Level** | **10%** | Parses the JD for required years using regex (e.g., `\b(\d+)\+?\s*years?\b`). If candidate experience meets or exceeds the required years, yields `100%`. Otherwise, decreases proportionally: `Score = Max(20, 100 - (required_years - candidate_years) * 20)`. |
| **Work Type** | **10%** | Compares work arrangements (Remote, Hybrid, On-site). Perfect match yields `100%`. Hybrid-seekers getting Remote yields `80%`. Remote-seekers getting Hybrid yields `60%`. Remote-seekers getting On-site yields `0%`. |

---

## 2. Advanced Algorithms & AI Agents
The portal implements an **agentic multi-agent workflow** that divides tasks across specialized modules:

### A. Resume Parsing Agent (`ResumeParser`)
- **LLM-Based Parser**: Sends raw PDF/Word extracted text to Gemini 2.0 Flash to extract structural JSON (name, email, phone, links, skills, summary, and a strengths/weaknesses resume critique).
- **Regex Fallback Engine**: If the API key is missing or quota-limited (HTTP 429), it falls back to a deterministic regex parser using regular expression tokenizers to isolate contact details and match technical keywords against an index vocabulary.

### B. Job Matching Agent (`JobMatcherAgent`)
- **Semantic JD Matcher**: Feeds the parsed profile and full JD text to Gemini to identify contextual fits, pros, cons, resume tailoring recommendations, and questions for application fields.
- **Explainable AI Breakdown**: Runs a local deterministic scoring algorithm over the extracted details to explain exactly how the final match score is computed.

### C. Application Tailoring Agent (`ApplicationAssistantAgent`)
- **Cover Letter Generator**: Drafts a highly professional, contextual cover letter incorporating candidate highlights, details from the JD, and answers to custom application questions.
- **Resume Point Rewriter**: Dynamically recommends tailored bullet points to optimize the candidate's CV for applicant tracking systems (ATS).

### D. Multi-Resume Router Agent (`PersonaRouterAgent`)
- When a user uploads multiple resumes (representing different career paths, e.g., Data Scientist vs. Web Developer), the **Router Agent** analyzes the scanned job posting and dynamically selects the best-matching candidate resume (persona) to run the evaluation against.

### E. Skill Gap Analyst Agent (`SkillGapAgent`)
- Aggregates text from up to 20 recently scanned job postings, compares the collective requirements against the candidate's resume, identifies the top 3 critical skill gaps, calculates how many matching jobs each skill would "unlock," and drafts custom, actionable learning plans for the student.

### F. Dynamic Company Classifier Engine (`classify_company_type`)
- Categorizes companies into **Product-based**, **Service-based**, or **Startups** using keyword pattern matching:
  - **Service-based**: Matches standard global consultants (TCS, Infosys, Wipro, Accenture) and keywords like *solutions, services, consulting, group*.
  - **Product-based**: Matches tech providers (Google, Microsoft, Stripe, Salesforce) and keywords like *saas, cloud, platform, software*.
  - **Startups**: Matches early-stage indicators (*early-stage, seed, series a, stealth*) and startup-suffix names (*labs, llc, studio*).
  - Uses a deterministic hash fallback (`hash(company_name) % 3`) to evenly categorize unclassified entries.

---

## 3. Modern Tech Stack & Tools
- **Gemini 2.0 Flash**: A state-of-the-art generative model selected for its sub-second latency, massive context window, and structural JSON output capability.
- **FastAPI (Python)**: High-performance, asynchronous REST API framework serving backend endpoints.
- **React 18 & Vite**: Ultra-fast frontend bundler driving the responsive user interface.
- **Vanilla CSS (Custom Premium Design)**: Uses responsive glassmorphism styles, custom gradients, interactive hover-glow cards, and CSS micro-animations to mimic high-end modern SaaS applications.
- **pdfplumber & python-docx**: Direct text extraction libraries for reading multiple CV file formats.
- **python-dotenv**: Handles localized SMTP parameters and API configurations.
- **SMTP Protocol**: Used to dispatch instant real-time email match notifications.
