// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-analytics.js";
import { getAuth, signInWithEmailAndPassword  } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA6oRNKYzLUlvrRBcr24vRLy4JMQJCHUYI",
  authDomain: "vidia-application.firebaseapp.com",
  projectId: "vidia-application",
  storageBucket: "vidia-application.firebasestorage.app",
  messagingSenderId: "128760641576",
  appId: "1:128760641576:web:4afb7d5daabf7967ab1d1d",
  measurementId: "G-030V44ZV1H"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth();

// Login buttonm
const login = document.getElementById('loginBtn');
signup.addEventListener("click",function(event){
    event.preventDefault();

    // Inputs : Login
    const email = document.getElementById('login_email').value
    const password = document.getElementById('login_password').value

    signInWithEmailAndPassword (auth, email, password)
  .then((userCredential) => {
    // Logged in 
    const user = userCredential.user;
    window.location.href = "home.html";
    // ...
  })
  .catch((error) => {
    const errorCode = error.code;
    const errorMessage = error.message;
    alert("Error :(")
    // ..
  });
})

