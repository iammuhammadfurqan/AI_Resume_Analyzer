from flask import Flask, render_template, request, jsonify
import openai
import os
from datetime import datetime
import json
import re
from dotenv import load_dotenv
import docx
import PyPDF2
from werkzeug.utils import secure_filename

load_dotenv()
app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Configure OpenAI API (you'll need to set this environment variable)
openai.api_key = os.getenv('OPENAI_API_KEY')

# Mock data for sample functionality
MOCK_RESUME = {
    "name": "Ayesha Khan",
    "experience": "3 years in data science, working with NLP and time-series forecasting.",
    "skills": ["Python", "TensorFlow", "Pandas", "Prompt Engineering"],
    "projects": ["AI-powered chatbot for finance", "Anomaly detection for manufacturing sensors"]
}

MOCK_JOB_DESCRIPTION = {
    "title": "NLP Research Associate",
    "requirements": ["NLP", "ML deployment", "LLM fine-tuning", "Python"]
}

def format_mock_data():
    """Format mock data into readable resume and job description strings"""
    resume_text = f"""
{MOCK_RESUME['name']}

EXPERIENCE:
{MOCK_RESUME['experience']}

SKILLS:
{', '.join(MOCK_RESUME['skills'])}

PROJECTS:
• {MOCK_RESUME['projects'][0]}
• {MOCK_RESUME['projects'][1]}
    """.strip()
    
    job_text = f"""
Position: {MOCK_JOB_DESCRIPTION['title']}

Requirements:
• {', '.join(MOCK_JOB_DESCRIPTION['requirements'])}
• Experience with machine learning model deployment
• Strong programming skills in Python
• Experience with natural language processing techniques
• Ability to work independently and collaboratively
• Strong analytical and problem-solving skills
    """.strip()
    
    return resume_text, job_text

def generate_cover_letter_with_openai(resume, job_description):
    """Generate cover letter using OpenAI API"""
    if not openai.api_key:
        raise ValueError("OpenAI API key is not configured.")
    try:
        prompt = f"""
You are an expert career counselor and professional writer. Create a compelling, personalized cover letter based on the following resume and job description.

RESUME:
{resume}

JOB DESCRIPTION:
{job_description}

Instructions:
1. Write a professional cover letter that highlights relevant experience and skills
2. Match the candidate's qualifications to the job requirements
3. Show enthusiasm and cultural fit
4. Keep it concise but impactful (3-4 paragraphs)
5. Use a professional but engaging tone
6. Include specific examples from the resume that relate to the job
7. End with a strong call to action

Format the letter professionally with proper salutation and closing.
        """
        
        response = openai.ChatCompletion.create(
            model="gpt-4.1-mini",
            messages=[
                {"role": "system", "content": "You are a professional cover letter writer with expertise in matching candidate qualifications to job requirements."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=10000,
            temperature=0.6
        )
        
        return response.choices[0].message.content.strip()
    
    except Exception as e:
        print(f"OpenAI API Error: {str(e)}")
        return generate_fallback_cover_letter(resume, job_description)

def generate_fallback_cover_letter(resume, job_description):
    """Generate a template cover letter when API is not available"""
    # Extract key information from resume and job description
    name = extract_name_from_resume(resume)
    skills = extract_skills_from_text(resume)
    job_title = extract_job_title_from_description(job_description)
    
    cover_letter = f"""Dear Hiring Manager,

I am writing to express my strong interest in the {job_title} position. After reviewing the job requirements, I am confident that my background and skills make me an ideal candidate for this role.

My experience aligns well with your requirements. Based on my resume, I have demonstrated expertise in key areas such as {', '.join(skills[:3]) if skills else 'relevant technologies and methodologies'}. My practical experience has equipped me with the technical skills and problem-solving abilities that would contribute to your team's success.

I am particularly excited about this opportunity because it combines my passion for technology with my desire to work on challenging projects that make a real impact. I would welcome the opportunity to discuss how my background and enthusiasm can contribute to your organization.

Thank you for considering my application. I look forward to hearing from you soon.

Sincerely,
{name if name else 'Your Name'}"""
    
    return cover_letter

def extract_name_from_resume(resume):
    """Extract name from resume text"""
    lines = resume.strip().split('\n')
    # Assume first non-empty line is the name
    for line in lines:
        line = line.strip()
        if line and not line.startswith(('EXPERIENCE', 'EDUCATION', 'SKILLS', 'PROJECTS')):
            # Simple name validation
            if len(line.split()) <= 4 and any(c.isalpha() for c in line):
                return line
    return None

def extract_skills_from_text(text):
    """Extract skills from text"""
    skills_keywords = ['Python', 'JavaScript', 'Java', 'C++', 'React', 'Node.js', 'SQL', 
                      'Machine Learning', 'Data Science', 'TensorFlow', 'PyTorch', 'Pandas',
                      'HTML', 'CSS', 'Git', 'Docker', 'AWS', 'Azure', 'GCP']
    
    found_skills = []
    text_upper = text.upper()
    
    for skill in skills_keywords:
        if skill.upper() in text_upper:
            found_skills.append(skill)
    
    return found_skills

def extract_job_title_from_description(job_description):
    """Extract job title from job description"""
    lines = job_description.strip().split('\n')
    for line in lines:
        line = line.strip()
        if line and ('position' in line.lower() or 'role' in line.lower() or 'title' in line.lower()):
            # Extract title after colon or similar
            if ':' in line:
                return line.split(':', 1)[1].strip()
        # If first line looks like a job title
        if line and len(line.split()) <= 6:
            return line
    return "the position"

def extract_text_from_docx(file_path):
    doc = docx.Document(file_path)
    return "\n".join([para.text for para in doc.paragraphs])

def extract_text_from_pdf(file_path):
    with open(file_path, 'rb') as f:
        reader = PyPDF2.PdfReader(f)
        text = ""
        for page in reader.pages:
            text += page.extract_text()
    return text

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/sample')
def load_sample():
    resume_text, job_text = format_mock_data()
    return render_template('index.html', 
                         resume=resume_text, 
                         job_description=job_text)

@app.route('/generate', methods=['POST'])
def generate_cover_letter():
    try:
        resume = request.form.get('resume', '').strip()
        job_description = request.form.get('job_description', '').strip()
        
        # Validation
        if not resume or not job_description:
            return render_template('index.html', 
                                 error="Please provide both resume and job description.",
                                 resume=resume,
                                 job_description=job_description)
        
        if len(resume) < 50:
            return render_template('index.html', 
                                 error="Resume seems too short. Please provide more details.",
                                 resume=resume,
                                 job_description=job_description)
        
        if len(job_description) < 30:
            return render_template('index.html', 
                                 error="Job description seems too short. Please provide more details.",
                                 resume=resume,
                                 job_description=job_description)
        
        # Generate cover letter
        cover_letter = generate_cover_letter_with_openai(resume, job_description)
        
        return render_template('index.html', 
                             cover_letter=cover_letter,
                             resume=resume,
                             job_description=job_description)
    
    except Exception as e:
        return render_template('index.html', 
                             error=f"An error occurred while generating the cover letter: {str(e)}",
                             resume=request.form.get('resume', ''),
                             job_description=request.form.get('job_description', ''))

@app.route('/api/upload-resume', methods=['POST'])
def upload_resume():
    if 'resume_file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['resume_file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    if file:
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)

        try:
            if filename.endswith('.pdf'):
                text = extract_text_from_pdf(file_path)
            elif filename.endswith('.docx'):
                text = extract_text_from_docx(file_path)
            elif filename.endswith('.txt'):
                with open(file_path, 'r') as f:
                    text = f.read()
            else:
                return jsonify({'error': 'Unsupported file type'}), 400
            
            return jsonify({'extracted_text': text})
        except Exception as e:
            return jsonify({'error': f'Error processing file: {str(e)}'}), 500
        finally:
            os.remove(file_path) # Clean up the uploaded file

@app.route('/api/analyze', methods=['POST'])
def analyze_resume():
    """API endpoint for resume analysis"""
    try:
        data = request.get_json()
        resume = data.get('resume', '')
        
        if not resume:
            return jsonify({'error': 'Resume text is required'}), 400
        
        # Simple analysis
        skills = extract_skills_from_text(resume)
        word_count = len(resume.split())
        
        analysis = {
            'word_count': word_count,
            'detected_skills': skills,
            'skill_count': len(skills),
            'readability_score': min(100, max(0, 100 - (word_count / 10))),  # Simple readability metric
            'suggestions': [
                'Consider adding more quantifiable achievements',
                'Include relevant keywords from job descriptions',
                'Ensure consistent formatting throughout'
            ]
        }
        
        return jsonify(analysis)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True) 