import { saveUser, saveWeight } from "../models/user.js"; // Import saveUser and saveWeight functions
import { getAuth } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

class userOnboarding {
    constructor() {
        this.userData = {
            firstName: "",
            lastName: "",
            birthday: "",
            gender: "",
            weight: "",
            height: "",
            healthConditions: [],
            dietType: [],
            allergies: []
        };
        this.auth = getAuth();
        this.initEventListeners();
    }

    initEventListeners() {
        document.querySelectorAll("input").forEach(input => {
            input.addEventListener("input", (event) => this.handleInputChange(event));
        });

        document.querySelectorAll(".gender-btn").forEach(button => {
            button.addEventListener("click", (event) => this.handleGenderSelection(event));
        });

        document.querySelectorAll(".option-btn").forEach(button => {
            button.addEventListener("click", (event) => this.handleMultiSelect(event));
        });

        document.getElementById("start-btn").addEventListener("click", async () => {
            if (this.validateUserData()) {
                await this.submitData();
            } else {
                alert("⚠️ Please fill out all required fields before proceeding.");
            }
        });
    }

    validateUserData() {
        let isValid = true;

        // Check text input fields
        if (!this.userData.firstName.trim()) isValid = false;
        if (!this.userData.lastName.trim()) isValid = false;
        if (!this.userData.birthday.trim()) isValid = false;
        if (!this.userData.weight.trim()) isValid = false;
        if (!this.userData.height.trim()) isValid = false;
        
        // Check gender selection
        if (!this.userData.gender.trim()) isValid = false;

        // Check multi-select fields
        if (this.userData.healthConditions.length === 0) isValid = false;
        if (this.userData.dietType.length === 0) isValid = false;
        if (this.userData.allergies.length === 0) isValid = false;

        return isValid;
    }

    handleInputChange(event) {
        const input = event.target;
        const value = input.value.trim();

        if (input.placeholder.includes("First Name")) {
            this.userData.firstName = value;
        } else if (input.placeholder.includes("Last Name")) {
            this.userData.lastName = value;
        } else if (input.type === "date") {
            this.userData.birthday = value;
        } else if (input.placeholder.includes("weight")) {
            this.userData.weight = value;
        } else if (input.placeholder.includes("height")) {
            this.userData.height = value;
        }
        console.log("Updated userData:", this.userData);
    }

    handleGenderSelection(event) {
        this.userData.gender = event.target.dataset.gender;
        console.log("Selected Gender:", this.userData.gender);
    }

    handleMultiSelect(event) {
        const button = event.target;
        const category = button.closest(".card").querySelector("h3").textContent;

        let dataField = "";
        if (category.includes("Health Condition")) {
            dataField = "healthConditions";
        } else if (category.includes("Diet Type")) {
            dataField = "dietType";
        } else if (category.includes("Allergies")) {
            dataField = "allergies";
        }

        if (button.textContent.includes("None")) {
            this.userData[dataField] = ["None"];
        } else {
            if (!this.userData[dataField].includes(button.textContent)) {
                this.userData[dataField].push(button.textContent);
            } else {
                this.userData[dataField] = this.userData[dataField].filter(item => item !== button.textContent);
            }
        }
        console.log("Updated userData:", this.userData);
    }

    async submitData() {
        console.log("Final Submitted Data:", this.userData);
        const user = this.auth.currentUser;
        const messageElement = document.getElementById("error-message");
    
        if (!user) {
            console.error("No authenticated user found.");
            alert("Error: No authenticated user found.");
            messageElement.textContent = "Error: No authenticated user found.";
            messageElement.style.color = "red";
            return;
        }
    
        const uid = user.uid;
        try {
            console.log(`Saving user data for UID: ${uid}...`);
            await saveUser(uid, this.userData); // Save user data first (without weight)
            console.log("User profile saved successfully.");
            alert("Profile saved successfully!");
            messageElement.textContent = "Profile saved successfully!";
            messageElement.style.color = "green";
    
            // Ensure weight is stored in a subcollection
            if (this.userData.weight) {
                console.log(`Saving weight entry: ${this.userData.weight} for UID: ${uid}...`);
                await saveWeight(uid, this.userData.weight);
                console.log("Weight saved successfully.");
                alert("Weight saved successfully!");
            }
    
            // Redirect to profile.html after Firestore save is complete
            window.location.href = "profile.html";
        } catch (error) {
            console.error("Error saving user data:", error);
            alert("Error saving profile. Please try again.");
            messageElement.textContent = "Error saving profile. Please try again.";
            messageElement.style.color = "red";
        }
    }    
}

document.addEventListener("DOMContentLoaded", () => {
    new userOnboarding();
});

export default userOnboarding;
