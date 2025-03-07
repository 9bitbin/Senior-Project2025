// Grab all relevant elements
const sections = document.querySelectorAll('.onboarding-section');
const nextButtons = document.querySelectorAll('.next-btn');
const startButton = document.querySelector('.circle-arrow-btn');
const genderButtons = document.querySelectorAll('.gender-btn');
const optionButtons = document.querySelectorAll('.option-btn');

let currentSectionIndex = 0;

// =============================
// Scroll Handling
// =============================

function scrollToSection(index) {
    if (sections[index]) {
        sections[index].scrollIntoView({ behavior: 'smooth' });
    }
}

// Attach next button listeners
nextButtons.forEach((button, index) => {
    button.addEventListener('click', () => {
        currentSectionIndex = index + 1;
        scrollToSection(currentSectionIndex);
    });
});

// Optional: Lock scroll position after each section scroll (prevents accidental overscroll)
document.querySelector('.onboarding-container').addEventListener('scroll', () => {
    clearTimeout(window.snapTimeout);
    window.snapTimeout = setTimeout(() => {
        scrollToSection(currentSectionIndex);
    }, 150); // Slight debounce
});

// =============================
// Gender Selection Logic
// =============================

genderButtons.forEach(button => {
    button.addEventListener('click', () => {
        genderButtons.forEach(btn => btn.classList.remove('selected'));
        button.classList.add('selected');
    });
});

// =============================
// Multi-select (Health Condition & Diet Type)
// =============================

optionButtons.forEach(button => {
    button.addEventListener('click', () => {
        button.classList.toggle('selected');
    });
});

// =============================
// Final Navigation to Profile Page
// =============================

if (startButton) {
    startButton.addEventListener('click', () => {
        window.location.href = 'profile.html';  // Update to your real profile URL if needed
    });
}

// Optional: Handle case where the button might not exist (helpful if reused across pages)
