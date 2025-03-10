// =============================
// 🔥 Grab All Relevant Elements
// =============================
const sections = document.querySelectorAll('.onboarding-section');
const nextButtons = document.querySelectorAll('.next-btn');

let currentSectionIndex = 0;

// =============================
// 🔥 Scroll Handling
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

// Prevent accidental overscroll after transition
const onboardingContainer = document.querySelector('.onboarding-container');
if (onboardingContainer) {
    onboardingContainer.addEventListener('scroll', () => {
        clearTimeout(window.snapTimeout);
        window.snapTimeout = setTimeout(() => {
            scrollToSection(currentSectionIndex);
        }, 150); // Slight debounce
    });
}

// =============================
// 🔥 Gender Selection UI Only
// =============================

const genderButtons = document.querySelectorAll('.gender-btn');
genderButtons.forEach(button => {
    button.addEventListener('click', () => {
        genderButtons.forEach(btn => btn.classList.remove('selected'));
        button.classList.add('selected');
    });
});

// =============================
// 🔥 Multi-select UI Styling Only
// =============================

const optionButtons = document.querySelectorAll('.option-btn');
optionButtons.forEach(button => {
    button.addEventListener('click', () => {
        button.classList.toggle('selected');
    });
});

// ✅ Removed `if (startButton)` from this file since it belongs in `viewmodels/onboarding.js`


// // =============================
// // 🔥 Grab All Relevant Elements
// // =============================
// const sections = document.querySelectorAll('.onboarding-section');
// const nextButtons = document.querySelectorAll('.next-btn');
// const startButton = document.querySelector('.circle-arrow-btn');
// const genderButtons = document.querySelectorAll('.gender-btn');
// const optionButtons = document.querySelectorAll('.option-btn');

// let currentSectionIndex = 0;

// // =============================
// // 🔥 Scroll Handling
// // =============================

// function scrollToSection(index) {
//     if (sections[index]) {
//         sections[index].scrollIntoView({ behavior: 'smooth' });
//     }
// }

// // Attach next button listeners
// nextButtons.forEach((button, index) => {
//     button.addEventListener('click', () => {
//         currentSectionIndex = index + 1;
//         scrollToSection(currentSectionIndex);
//     });
// });

// // Prevent accidental overscroll after transition
// const onboardingContainer = document.querySelector('.onboarding-container');
// if (onboardingContainer) {
//     onboardingContainer.addEventListener('scroll', () => {
//         clearTimeout(window.snapTimeout);
//         window.snapTimeout = setTimeout(() => {
//             scrollToSection(currentSectionIndex);
//         }, 150); // Slight debounce
//     });
// }

// // =============================
// // 🔥 Gender Selection Logic
// // =============================

// genderButtons.forEach(button => {
//     button.addEventListener('click', () => {
//         // Remove "selected" from all, then add to the clicked one
//         genderButtons.forEach(btn => btn.classList.remove('selected'));
//         button.classList.add('selected');
//     });
// });

// // =============================
// // 🔥 Multi-select (Health Condition & Diet Type)
// // =============================

// optionButtons.forEach(button => {
//     button.addEventListener('click', () => {
//         button.classList.toggle('selected');
//     });
// });

// // =============================
// // 🔥 Final Navigation to Profile Page
// // =============================



// if (startButton) {
//     startButton.addEventListener('click', () => {
//         console.log("✅ Redirecting to profile.html..."); // Debugging
//         window.location.href = 'profile.html'; // Ensure this URL is correct
//     });
// } else {
//     console.error("❌ Error: Start button not found!");
// }
