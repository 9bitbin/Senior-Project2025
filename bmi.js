import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

// 🔹 Elements
const bmiValueEl = document.getElementById("bmi-value");
const bmiCategoryEl = document.getElementById("bmi-category");
const bmiMessageEl = document.getElementById("bmi-message");
const pointerEl = document.getElementById("bmi-pointer");

// 🔹 Manual BMI Calculation (lbs & inches)
function calculateBMI(weight, height) {
  if (!weight || !height || height === 0) return null;
  return (weight / (height * height)) * 703;
}

// 🔹 BMI Category
function getBMICategory(bmi) {
  if (bmi < 18.5) return "Underweight";
  else if (bmi < 24.9) return "Normal weight";
  else if (bmi < 29.9) return "Overweight";
  else return "Obese";
}

// 🔹 Optional Encouragement
function getBMIMessage(category) {
  switch (category) {
    case "Underweight": return "Consider eating more nutrient-rich foods.";
    case "Normal weight": return "You're on track — keep it up!";
    case "Overweight": return "Incorporate more activity and balanced meals.";
    case "Obese": return "Consider speaking with a healthcare provider.";
    default: return "";
  }
}

// 🔹 Adjust Pointer on Color Bar
function updatePointer(bmi) {
  if (!pointerEl) return;
  const min = 10;
  const max = 40;
  const percent = Math.min(Math.max(((bmi - min) / (max - min)) * 100, 0), 100);
  pointerEl.style.left = `${percent}%`;
}

// 🔹 Load BMI When User Logs In
onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  const docRef = doc(db, "users", user.uid);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) {
    bmiValueEl.innerText = "No profile found.";
    return;
  }

  const data = snapshot.data();
  const weight = parseFloat(data.weight);
  const height = parseFloat(data.height);

  if (!weight || !height) {
    bmiValueEl.innerText = "Missing data";
    bmiCategoryEl.innerText = "Please update your profile.";
    return;
  }

  const bmi = calculateBMI(weight, height);
  const category = getBMICategory(bmi);
  const message = getBMIMessage(category);

  bmiValueEl.innerText = bmi.toFixed(2);
  bmiCategoryEl.innerText = category;
  if (bmiMessageEl) bmiMessageEl.innerText = message;
  updatePointer(bmi);
});



