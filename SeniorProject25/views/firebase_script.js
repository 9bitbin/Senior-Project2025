import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyA6oRNKYzLUlvrRBcr24vRLy4JMQJCHUYI",
    authDomain: "vidia-application.firebaseapp.com",
    projectId: "vidia-application",
    storageBucket: "vidia-application.firebasestorage.app",
    messagingSenderId: "128760641576",
    appId: "1:128760641576:web:4afb7d5daabf7967ab1d1d",
    measurementId: "G-030V44ZV1H",
    databaseURL: "https://vidia-application-default-rtdb.firebaseio.com"

};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

window.saveProfileToFirebase = function () {
    const profileData = {
        birthday: document.getElementById('birthday').value,
        gender: document.getElementById('sex').value,
        weight: document.getElementById('weight').value,
        height: document.getElementById('height').value,
        healthCondition: Array.from(document.getElementById('health-condition').selectedOptions).map(option => option.value),
        dietType: document.getElementById('diet-type').value,
        allergies: Array.from(document.getElementById('allergies').selectedOptions).map(option => option.value),
        goalType: document.getElementById('goal-type').value,
        goalTarget: document.getElementById('goal-target').value,
        targetDate: document.getElementById('target-date').value,
        budgetSpan: document.querySelector('input[name="budget-span"]:checked')?.value,
        budgetAmount: document.getElementById('budget-amount').value
    };

    const userId = "user123"; // Ideally, dynamically pull from logged-in user
    set(ref(database, 'users/' + userId + '/profile'), profileData)
        .then(() => {
            alert('Profile saved successfully!');
        })
        .catch((error) => {
            alert('Failed to save profile: ' + error.message);
        });
}
