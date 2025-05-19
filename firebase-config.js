
// ✅ Import necessary Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-app.js";
import { getAuth, sendPasswordResetEmail, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

// 🔹 Firebase project configuration object
const firebaseConfig = {
  apiKey: "AIzaSyD1iXSx2Y22IzeVcmUoVacPR5fVMp1SJpg",
  authDomain: "testingvidia.firebaseapp.com",
  projectId: "testingvidia",
  storageBucket: "testingvidia.firebasestorage.app",
  messagingSenderId: "98113240298",
  appId: "1:98113240298:web:f1871fda29b7d5f7996b93"
};

// 🔹 Initialize the Firebase app using the config object
const app = initializeApp(firebaseConfig);

// 🔹 Get Firebase Authentication instance
const auth = getAuth(app);

// 🔹 Set up Google Auth Provider (not used here but available)
const provider = new GoogleAuthProvider();

// 🔹 Initialize Firestore database
const db = getFirestore(app);

// ✅ Export Firebase instances to use in other modules if needed
export { auth, provider, db };

// 🔹 Get the reset button element from the DOM
const reset = document.getElementById("reset");

// 🔹 Add click event listener to the reset button
reset.addEventListener("click", function(event) {
  event.preventDefault(); // Prevent form submission or page reload

  // 🔹 Get the email input value and trim whitespace
  const email = document.getElementById("email").value.trim();

  // 🔹 If email is empty, show an alert and stop further execution
  if (!email) {
    alert("❗Please enter your email address.");
    return;
  }

  // ✅ Try sending the password reset email
  sendPasswordResetEmail(auth, email)
    .then(() => {
      // 🔹 Success: Show confirmation alert
      alert("✅ Email has been successfully sent. Check your inbox 📥");
    })
    .catch((error) => {
      // 🔹 If email is not linked to any account
      if (error.code === "auth/user-not-found") {
        alert("❌ This email is not associated with an account. Please sign up.");
      } else {
        // 🔹 Handle other potential errors
        alert("⚠️ Error: " + error.message);
      }
    });
});

