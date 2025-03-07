const sections = document.querySelectorAll('.onboarding-section');
const nextButtons = document.querySelectorAll('.next-btn');
const startButton = document.querySelector('.start-btn');
const genderButtons = document.querySelectorAll('.gender-btn');
const optionButtons = document.querySelectorAll('.option-btn');

let currentSectionIndex = 0;

// Scroll to the next section when "Next" is clicked
nextButtons.forEach((button, index) => {
    button.addEventListener('click', () => {
        currentSectionIndex = index + 1;
        scrollToSection(currentSectionIndex);
    });
});

// Smooth scroll
function scrollToSection(index) {
    sections[index].scrollIntoView({ behavior: 'smooth' });
}

// Gender selection
genderButtons.forEach(button => {
    button.addEventListener('click', () => {
        genderButtons.forEach(b => b.classList.remove('selected'));
        button.classList.add('selected');
    });
});

// Multi-select toggle (Health Condition & Diet Type)
optionButtons.forEach(button => {
    button.addEventListener('click', () => {
        button.classList.toggle('selected');
    });
});

// Final navigation to profile page (update the URL if needed)
startButton.addEventListener('click', () => {
    window.location.href = 'profile.html';
});
