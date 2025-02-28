// Import the Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// Your Firebase configuration (replace with your actual config)
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "vidia-application", // Use your project ID
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


// Function to get the current user's UID
function getUID(){
    let uid;
    onAuthStateChanged(auth, (user) => {
        if (user) {
          uid = user.uid;
        } else {
          // Handle the case where the user is not signed in.  You might redirect to the login page
          console.log("User is not signed in");
          window.location.href = "signup.html"; // Redirect to signup if not logged in
        }
    });
    return uid;
}


// Function to handle profile saving or updating
async function saveProfile() {
    const uid = getUID();
    if(!uid) return;
    const userRef = doc(db, "users", uid);

    const birthday = document.getElementById("birthday").value;
    const gender = document.getElementById("sex").value;
    const weight = parseFloat(document.getElementById("weight").value);
    const height = parseFloat(document.getElementById("height").value);
    const healthConditions = Array.from(document.getElementById("health-condition").selectedOptions).map(option => option.value);
    const dietType = document.getElementById("diet-type").value;
    const allergies = Array.from(document.getElementById("allergies").selectedOptions).map(option => option.value);
    const goalType = document.getElementById("goal-type").value;
    const goalTarget = parseFloat(document.getElementById("goal-target").value);
    const targetDate = document.getElementById("target-date").value;
    const budgetSpan = document.querySelector('input[name="budget-span"]:checked').value;
    const budgetAmount = parseFloat(document.getElementById("budget-amount").value);

    //Data Validation - Add more robust checks as needed.
    if(isNaN(weight) || isNaN(height) || isNaN(goalTarget) || isNaN(budgetAmount)){
        alert("Please enter valid numbers for weight, height, goal target and budget amount.");
        return;
    }


    try {
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
          // User exists, update the document
          await updateDoc(userRef, {
            birthday,
            gender,
            weight,
            height,
            healthConditions,
            dietType,
            allergies,
            goalType,
            goalTarget,
            targetDate,
            budgetSpan,
            budgetAmount
          });
          alert("Profile updated successfully!");
        } else {
          // User doesn't exist, create a new document
          await setDoc(userRef, {
            birthday,
            gender,
            weight,
            height,
            healthConditions,
            dietType,
            allergies,
            goalType,
            goalTarget,
            targetDate,
            budgetSpan,
            budgetAmount
          });
          alert("Profile created successfully!");
        }
    } catch (error) {
        console.error("Error saving profile:", error);
        alert("Error saving profile. Please try again later.");
    }
}


// Add event listener to save button (you'll need to add a save button to your HTML)
document.getElementById("saveProfileButton").addEventListener("click", saveProfile);


// Add event listeners for tab switching (basic example)
const filterBtns = document.querySelectorAll('.filter-btn');
const tabItems = document.querySelectorAll('.tab-item');

filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const targetTab = btn.dataset.tab;
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        tabItems.forEach(item => {
            if(item.dataset.tab === targetTab){
                item.classList.add('selected_tab');
            } else {
                item.classList.remove('selected_tab');
            }
        });
    });
});
