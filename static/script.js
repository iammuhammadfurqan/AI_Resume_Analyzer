// Enhanced word counting
function updateWordCount(textareaId, counterId) {
    const textarea = document.getElementById(textareaId);
    if (!textarea) return;
    const counter = document.getElementById(counterId);
    const words = textarea.value.trim().split(/\s+/).filter(word => word.length > 0).length;
    counter.textContent = `${words} words`;
    
    // Color coding based on word count
    if (textareaId === 'resume') {
        if (words < 50) {
            counter.style.color = '#ff6b6b';
        } else if (words < 150) {
            counter.style.color = '#ffa502';
        } else {
            counter.style.color = '#2ed573';
        }
    }
}

// Initialize word counters
document.getElementById('resume').addEventListener('input', () => updateWordCount('resume', 'resume-counter'));
document.getElementById('job_description').addEventListener('input', () => updateWordCount('job_description', 'job-counter'));

// Initialize counters on page load
window.addEventListener('load', () => {
    updateWordCount('resume', 'resume-counter');
    updateWordCount('job_description', 'job-counter');
});

// File Upload Logic
document.getElementById('upload-resume-btn').addEventListener('click', () => {
    document.getElementById('resume-file-input').click();
});

document.getElementById('resume-file-input').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) {
        return;
    }

    const button = document.getElementById('upload-resume-btn');
    const originalHTML = button.innerHTML;
    button.innerHTML = '<div class="spinner"></div> Uploading...';
    button.disabled = true;

    const formData = new FormData();
    formData.append('resume_file', file);

    try {
        const response = await fetch('/api/upload-resume', {
            method: 'POST',
            body: formData,
        });

        const result = await response.json();

        if (response.ok) {
            const resumeTextarea = document.getElementById('resume');
            resumeTextarea.value = result.extracted_text;
            // Trigger input event to update word count
            resumeTextarea.dispatchEvent(new Event('input', { bubbles: true }));
            showNotification('Resume uploaded and text extracted!', 'success');
        } else {
            throw new Error(result.error || 'Failed to upload file');
        }
    } catch (error) {
        showNotification(error.message, 'error');
    } finally {
        button.innerHTML = originalHTML;
        button.disabled = false;
        // Clear the file input so the user can upload the same file again if needed
        event.target.value = '';
    }
});

// Enhanced button interactions
document.getElementById('load-sample').addEventListener('click', () => {
    const button = document.getElementById('load-sample');
    button.classList.add('pulse');
    showProgress();
    setTimeout(() => {
        window.location.href = '/sample';
    }, 300);
});

document.getElementById('clear-form').addEventListener('click', () => {
    const button = document.getElementById('clear-form');
    button.classList.add('pulse');
    showProgress();
    setTimeout(() => {
        window.location.href = '/';
    }, 300);
});

// Resume analysis functionality
document.getElementById('analyze-resume').addEventListener('click', async () => {
    const resumeText = document.getElementById('resume').value.trim();
    const button = document.getElementById('analyze-resume');
    const analysisPanel = document.getElementById('resume-analysis');
    
    if (!resumeText) {
        showNotification('Please enter your resume first', 'error');
        return;
    }

    // Show loading state
    const originalHTML = button.innerHTML;
    button.innerHTML = '<div class="spinner"></div> Analyzing...';
    button.disabled = true;

    try {
        // Use actual analysis from the backend API
        await analyzeResumeWithAPI(resumeText);
        analysisPanel.classList.add('active');
    } catch (error) {
        showNotification(`Analysis failed: ${error.message}`, 'error');
    } finally {
        button.innerHTML = originalHTML;
        button.disabled = false;
    }
});

async function analyzeResumeWithAPI(resumeText) {
    const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ resume: resumeText }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Server error');
    }

    const analysis = await response.json();

    // Populate analysis stats
    const statsContainer = document.getElementById('analysis-stats');
    statsContainer.innerHTML = `
        <div class="stat-item">
            <span class="stat-number">${analysis.word_count}</span>
            <span class="stat-label">Words</span>
        </div>
        <div class="stat-item">
            <span class="stat-number">${analysis.skill_count}</span>
            <span class="stat-label">Skills</span>
        </div>
        <div class="stat-item">
            <span class="stat-number">${Math.round(analysis.readability_score)}</span>
            <span class="stat-label">Score</span>
        </div>
    `;

    // Populate suggestions
    const suggestionsContainer = document.getElementById('suggestions');
    if (analysis.detected_skills.length > 0) {
        analysis.suggestions.unshift(`• Detected skills: ${analysis.detected_skills.slice(0, 5).join(', ')}`);
    }
    
    suggestionsContainer.innerHTML = `
        <h4 style="margin-bottom: 10px; color: white;">Suggestions:</h4>
        ${analysis.suggestions.join('<br>')}
    `;
}

function showProgress() {
    const progressBar = document.getElementById('progress-bar');
    const progressFill = document.getElementById('progress-fill');
    
    progressBar.style.display = 'block';
    progressFill.style.width = '0%';
    
    setTimeout(() => {
        progressFill.style.width = '100%';
    }, 100);
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 600;
        z-index: 10000;
        animation: slideInRight 0.3s ease-out;
        ${type === 'error' ? 'background: linear-gradient(135deg, #ff4757, #ff3742);' : 
          type === 'success' ? 'background: linear-gradient(135deg, #2ed573, #26d065);' :
          'background: linear-gradient(135deg, #3742fa, #2f36e8);'}
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Enhanced form submission
document.getElementById('main-form').addEventListener('submit', (e) => {
    const button = document.getElementById('generate-button');
    const buttonText = button.querySelector('.button-text');
    const spinner = button.querySelector('.spinner');
    
    buttonText.style.display = 'none';
    spinner.style.display = 'inline-block';
    button.style.background = 'linear-gradient(135deg, #a0a0a0 0%, #808080 100%)';
    button.disabled = true;
    
    showProgress();
});

// Enhanced copy functionality
const copyButton = document.getElementById('copy-button');
if (copyButton) {
    copyButton.addEventListener('click', async () => {
        const coverLetterText = document.getElementById('cover-letter').innerText;
        try {
            await navigator.clipboard.writeText(coverLetterText);
            const originalHTML = copyButton.innerHTML;
            copyButton.innerHTML = '<div class="success-checkmark"></div> Copied!';
            
            showNotification('Cover letter copied to clipboard!', 'success');
            
            setTimeout(() => {
                copyButton.innerHTML = originalHTML;
            }, 2000);
        } catch (err) {
            copyButton.innerHTML = '<i class="fas fa-times"></i> Failed';
            showNotification('Copy failed. Please try again.', 'error');
            setTimeout(() => {
                copyButton.innerHTML = '<i class="fas fa-copy"></i> Copy';
            }, 2000);
        }
    });
}

// Download functionality
const downloadButton = document.getElementById('download-button');
if (downloadButton) {
    downloadButton.addEventListener('click', () => {
        const coverLetterText = document.getElementById('cover-letter').innerText;
        const blob = new Blob([coverLetterText], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'cover-letter.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showNotification('Cover letter downloaded!', 'success');
    });
}

// Enhanced parallax effect
document.addEventListener('mousemove', (e) => {
    const orbs = document.querySelectorAll('.glow-orb');
    const x = e.clientX / window.innerWidth;
    const y = e.clientY / window.innerHeight;
    
    orbs.forEach((orb, index) => {
        const speed = (index + 1) * 0.3;
        const xMove = (x - 0.5) * speed * 30;
        const yMove = (y - 0.5) * speed * 30;
        orb.style.transform = `translate(${xMove}px, ${yMove}px)`;
    });
});

// Enhanced entrance animations
window.addEventListener('load', () => {
    const card = document.querySelector('.glass-card');
    card.style.opacity = '0';
    card.style.transform = 'translateY(50px)';
    
    setTimeout(() => {
        card.style.transition = 'all 0.8s ease-out';
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
    }, 100);

    // Animate feature highlights
    const features = document.querySelectorAll('.feature-item');
    features.forEach((feature, index) => {
        feature.style.opacity = '0';
        feature.style.transform = 'translateY(20px)';
        setTimeout(() => {
            feature.style.transition = 'all 0.5s ease-out';
            feature.style.opacity = '1';
            feature.style.transform = 'translateY(0)';
        }, 200 + (index * 100));
    });
});

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style); 