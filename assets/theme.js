// assets/theme.js
// Centralized theme control for all pages

// ============================================
// THEME FUNCTIONS
// ============================================

function setTheme(mode) {
    const body = document.body;
    
    if (mode === 'light') {
        body.classList.add('light-mode');
        localStorage.setItem('theme', 'light');
    } else {
        body.classList.remove('light-mode');
        localStorage.setItem('theme', 'dark');
    }
    
    // Update all theme toggle buttons on the page
    updateThemeButtons(mode);
}

function toggleTheme() {
    const body = document.body;
    const isLight = body.classList.contains('light-mode');
    
    if (isLight) {
        setTheme('dark');
    } else {
        setTheme('light');
    }
}

function loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    
    // Default to dark if no preference saved
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
    } else {
        document.body.classList.remove('light-mode');
        // If no theme saved, set default to dark
        if (!savedTheme) {
            localStorage.setItem('theme', 'dark');
        }
    }
    
    // Update any theme buttons on the page
    const currentTheme = document.body.classList.contains('light-mode') ? 'light' : 'dark';
    updateThemeButtons(currentTheme);
}

function updateThemeButtons(mode) {
    // Update all theme toggle buttons on the page
    document.querySelectorAll('.theme-toggle, .theme-btn').forEach(btn => {
        const icon = btn.querySelector('.theme-icon');
        const label = btn.querySelector('.theme-label');
        
        if (icon) {
            icon.textContent = mode === 'light' ? '🌙' : '☀️';
        }
        if (label) {
            label.textContent = mode === 'light' ? 'Dark Mode' : 'Light Mode';
        }
    });
}

function getCurrentTheme() {
    return document.body.classList.contains('light-mode') ? 'light' : 'dark';
}

// ============================================
// AUTO-LOAD THEME ON PAGE LOAD
// ============================================

// Load theme immediately when script runs
loadTheme();

// Also load when DOM is ready (for safety)
document.addEventListener('DOMContentLoaded', loadTheme);

console.log('🎨 Theme controller loaded. Current theme:', getCurrentTheme());
