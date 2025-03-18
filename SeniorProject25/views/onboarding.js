import userOnboarding from "../viewmodels/onboarding.js"; // Ensure this import points to the correct location

// Grab all relevant elements
const startButton = document.getElementById("start-btn");
const inputFields = document.querySelectorAll("input[required]");
const genderButtons = document.querySelectorAll(".gender-btn");
const optionButtons = document.querySelectorAll(".option-btn");
const errorMessage = document.getElementById("error-message");

// =============================
// 🔥 Gender Selection Logic
// =============================

genderButtons.forEach((button) => {
    button.addEventListener("click", () => {
        genderButtons.forEach((btn) => btn.classList.remove("selected"));
        button.classList.add("selected");
    });
});

// =============================
// 🔥 Multi-select (Health Condition & Diet Type)
// =============================

optionButtons.forEach((button) => {
    button.addEventListener("click", () => {
        button.classList.toggle("selected");
    });
});

// =============================
// 🔥 Validate All Fields First, Then Save to Firestore
// =============================

if (startButton) {
    startButton.addEventListener("click", async () => {
        let isValid = true; // ✅ Fix: Initialize as true

        // Check required input fields
        inputFields.forEach((input) => {
            if (!input.value.trim()) {
                isValid = false;
                input.style.border = "2px solid red"; // Highlight missing fields
            } else {
                input.style.border = "1px solid #ccc"; // Reset border if fixed
            }
        });

        // Check if a gender is selected
        const genderSelected = Array.from(genderButtons).some((btn) =>
            btn.classList.contains("selected")
        );
        if (!genderSelected) {
            isValid = false;
            document.querySelector(".gender-options").style.border =
                "2px solid red";
        } else {
            document.querySelector(".gender-options").style.border = "none";
        }

        // Show error message if validation fails
        if (!isValid) {
            errorMessage.textContent =
                "⚠️ Please fill all required fields before proceeding.";
            errorMessage.style.color = "red";
            return; // 🚨 STOP: Don't proceed to save if validation fails
        }

        // ✅ Only proceed if `isValid` is true
        try {
            const onboardingInstance = new userOnboarding(); // Ensure this is correctly imported
            await onboardingInstance.submitData(); // Wait for Firestore save to complete
            console.log("✅ Data saved successfully. Redirecting to profile page...");
            window.location.href = "profile.html"; // Redirect after successful save
        } catch (error) {
            console.error("❌ Error saving data:", error);
            errorMessage.textContent = "⚠️ Error saving data. Please try again.";
            errorMessage.style.color = "red";
        }
    });
}


// import userOnboarding  from "../viewmodels/onboarding.js"; // Ensure this import points to the correct location

// // Grab all relevant elements
// const startButton = document.getElementById("start-btn");
// const inputFields = document.querySelectorAll("input[required]");
// const genderButtons = document.querySelectorAll(".gender-btn");
// const optionButtons = document.querySelectorAll(".option-btn");
// const errorMessage = document.getElementById("error-message");

// // =============================
// // 🔥 Gender Selection Logic
// // =============================

// genderButtons.forEach((button) => {
//     button.addEventListener("click", () => {
//         genderButtons.forEach((btn) => btn.classList.remove("selected"));
//         button.classList.add("selected");
//     });
// });

// // =============================
// // 🔥 Multi-select (Health Condition & Diet Type)
// // =============================

// optionButtons.forEach((button) => {
//     button.addEventListener("click", () => {
//         button.classList.toggle("selected");
//     });
// });

// // =============================
// // 🔥 Validate All Fields First, Then Save to Firestore
// // =============================

// if (startButton) {
//     startButton.addEventListener("click", async () => {
//         let isValid;

//         // Check required input fields
//         inputFields.forEach((input) => {
//             if (!input.value.trim()) {
//                 isValid = false;
//                 input.style.border = "2px solid red"; // Highlight missing fields
//             } else {
//                 input.style.border = "1px solid #ccc"; // Reset border if fixed
//             }
//         });

//         // Check if a gender is selected
//         const genderSelected = Array.from(genderButtons).some((btn) =>
//             btn.classList.contains("selected")
//         );
//         if (!genderSelected) {
//             isValid = false;
//             document.querySelector(".gender-options").style.border =
//                 "2px solid red";
//         } else {
//             document.querySelector(".gender-options").style.border = "none";
//         }

//         // Show error message if validation fails
//         if (!isValid) {
//             errorMessage.textContent =
//                 "⚠️ Please fill all required fields before proceeding.";
//             errorMessage.style.color = "red";
//             return; // 🚨 STOP: Don't proceed to save if validation fails
//         }

//         if(isValid){
//             // If valid, save to Firestore before redirecting
//         try {
//             const onboardingInstance = new userOnboarding(); // Ensure this is correctly imported
//             await onboardingInstance.submitData(); // Wait for Firestore save to complete
//             console.log("Data saved successfully. Redirecting to profile page...");
//             window.location.href = "profile.html"; // Redirect after successful save
//         } catch (error) {
//             console.error("Error saving data:", error);
//             errorMessage.textContent = "⚠️ Error saving data. Please try again.";
//             errorMessage.style.color = "red";
//         }
//         }

        
//     });
// }


// // Grab all relevant elements
// const startButton = document.getElementById('start-btn');
// const inputFields = document.querySelectorAll('input[required]');
// const genderButtons = document.querySelectorAll('.gender-btn');
// const optionButtons = document.querySelectorAll('.option-btn');
// const errorMessage = document.getElementById('error-message');

// // =============================
// // 🔥 Gender Selection Logic
// // =============================

// genderButtons.forEach(button => {
//     button.addEventListener('click', () => {
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
// // 🔥 Validation & Redirect to Profile Page
// // =============================

// if (startButton) {
//     startButton.addEventListener('click', () => {
//         let isValid = true;
        
//         // Check required input fields
//         inputFields.forEach(input => {
//             if (!input.value.trim()) {
//                 isValid = false;
//                 input.style.border = "2px solid red"; // Highlight missing fields
//             } else {
//                 input.style.border = "1px solid #ccc"; // Reset border if fixed
//             }
//         });

//         // Check if a gender is selected
//         const genderSelected = Array.from(genderButtons).some(btn => btn.classList.contains('selected'));
//         if (!genderSelected) {
//             isValid = false;
//             document.querySelector('.gender-options').style.border = "2px solid red";
//         } else {
//             document.querySelector('.gender-options').style.border = "none";
//         }

//         // Show error message if validation fails
//         if (!isValid) {
//             errorMessage.textContent = "⚠️ Please fill all required fields before proceeding.";
//             errorMessage.style.color = "red";
//             return;
//         }

//         // ✅ If everything is filled, redirect to profile page
//         errorMessage.textContent = "";
//         window.location.href = "profile.html";
//     });
// }