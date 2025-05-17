import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";
import { generateUserAvatar } from './community.js';

let profileForm;

// Update the DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', () => {
  // Profile form handling
  profileForm = document.getElementById("profileForm");
  
  if (profileForm) {
    profileForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const user = auth.currentUser;
      if (!user) {
          alert("You must be logged in to save your profile!");
          return;
      }

      const calorieGoalValue = Number(document.getElementById("calorieGoal").value);
      
      const updatedData = {
          name: document.getElementById("name").value,
          age: document.getElementById("age").value,
          weight: document.getElementById("weight").value,
          height: document.getElementById("height").value,
          dob: document.getElementById("dob").value,
          sex: document.getElementById("sex").value,
          calorieGoal: Number(document.getElementById("calorieGoal").value), // Convert to number
          exerciseType: document.getElementById("exerciseType").value,
          healthGoals: document.getElementById("healthGoals").value,
          activityLevel: document.getElementById("activityLevel").value,
          dietType: document.getElementById("dietType").value,
          allergies: document.getElementById("allergies").value,
          budgetPreference: document.getElementById("budgetPreference").value,
          sleepHours: document.getElementById("sleepHours").value,
          waterIntakeGoal: document.getElementById("waterIntakeGoal").value,
          preferredWorkoutTime: document.getElementById("preferredWorkoutTime").value,
          mentalHealthFocus: document.getElementById("mentalHealthFocus").value,
      };

      const userDocRef = doc(db, "users", user.uid);

      // Inside the profileForm submit handler, update the try block
      try {
          const existingDoc = await getDoc(userDocRef);
          const existingData = existingDoc.exists() ? existingDoc.data() : {};
          
          // Ensure email is always saved
          updatedData.email = user.email || existingData.email || '';
          updatedData.name = document.getElementById("name").value;
          updatedData.displayName = updatedData.name;
          
          // Add timestamp for tracking updates
          const mergedData = {
              ...existingData,
              ...updatedData,
              email: updatedData.email, // Ensure email is not overwritten
              lastUpdate: new Date().toISOString()
          };
      
          await setDoc(userDocRef, mergedData);
          
          // Update email in community data
          if (window.updateUserEmail) {
              await window.updateUserEmail(user.uid, updatedData.email);
          }
          
          alert("✅ Profile saved successfully!");
          window.location.href = "home.html";
      } catch (error) {
          alert("❌ Error saving profile: " + error.message);
      }
    }); 
  }
});

// Function to check if profile is complete
function isProfileComplete(userData) {
  return userData && 
         userData.name && 
         userData.age && 
         userData.sex && 
         userData.height && 
         userData.weight;
}

// Function to disable page interaction and show error
function disablePageWithMessage() {
  // Check if overlay already exists to prevent duplicates
  if (document.getElementById('profile-incomplete-overlay')) return;
  
  // Create overlay
  const overlay = document.createElement('div');
  overlay.id = 'profile-incomplete-overlay';
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  overlay.style.zIndex = '9999';
  overlay.style.display = 'flex';
  overlay.style.justifyContent = 'center';
  overlay.style.alignItems = 'center';
  
  // Create message box with direct HTML link instead of a button
  const messageBox = document.createElement('div');
  messageBox.style.backgroundColor = 'white';
  messageBox.style.padding = '30px';
  messageBox.style.borderRadius = '12px';
  messageBox.style.maxWidth = '400px';
  messageBox.style.textAlign = 'center';
  
  // Use a direct link instead of a button
  messageBox.innerHTML = `
    <h3 style="color: #ef4444; margin-top: 0; font-size: 22px;">Profile Incomplete</h3>
    <p style="font-size: 16px; line-height: 1.5;">You need to complete your profile before using this feature.</p>
    <a href="profile.html" style="display: inline-block; background-color: #10b981; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; margin-top: 15px; font-size: 16px; font-weight: bold;">Complete Profile</a>
  `;
  
  overlay.appendChild(messageBox);
  document.body.appendChild(overlay);
  
  
  document.removeEventListener('click', arguments.callee, true);
}


window.checkProfileCompletion = async function() {
  const user = auth.currentUser;
  if (user) {
    const docRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists() || !isProfileComplete(docSnap.data())) {
      // We're on a page that needs profile completion
      if (!window.location.pathname.endsWith('profile.html')) {
        // Show message immediately
        disablePageWithMessage();
        
        // Only block interactions with the page content, not the overlay
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
          mainContent.style.pointerEvents = 'none';
          mainContent.style.opacity = '0.5';
        }
        
        return false;
      }
      return false;
    }
    return true;
  }
  return false;
};

// Second DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', () => {
  if (!window.location.pathname.endsWith('profile.html')) {
    if (window.checkProfileCompletion) {
      window.checkProfileCompletion();
    }
  }
});

// Auth state change listener
onAuthStateChanged(auth, async (user) => {
  if (user) {
    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      const data = userDoc.data();
      if (!data.email && user.email) {
        await setDoc(userDocRef, { ...data, email: user.email }, { merge: true });
      }
      const formFields = [
        "name", "age", "weight", "height", "dob", "sex", "calorieGoal",
        "exerciseType", "healthGoals", "activityLevel", "dietType",
        "allergies", "budgetPreference", "sleepHours", "waterIntakeGoal",
        "preferredWorkoutTime", "mentalHealthFocus"
      ];

      formFields.forEach(field => {
        const element = document.getElementById(field);
        if (element) {
          element.value = data[field] || "";
        }
      });
    } else {
      // If no user document exists, check profile completion
      if (!window.location.pathname.endsWith('profile.html')) {
        disablePageWithMessage();
      }
    }
  } else {
    window.location.href = "index.html";
  }
}); // End of auth state change listener


// Update the profile form handler to include the complete avatar info
document.addEventListener('DOMContentLoaded', () => {
  profileForm = document.getElementById("profileForm");
  
  if (profileForm) {
    profileForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const user = auth.currentUser;
      if (!user) {
          alert("You must be logged in to save your profile!");
          return;
      }

      const name = document.getElementById("name").value;
      
      const updatedData = {
          name: name,
          age: document.getElementById("age").value,
          weight: document.getElementById("weight").value,
          height: document.getElementById("height").value,
          dob: document.getElementById("dob").value,
          sex: document.getElementById("sex").value,
          calorieGoal: Number(document.getElementById("calorieGoal").value), // Convert to number
          exerciseType: document.getElementById("exerciseType").value,
          healthGoals: document.getElementById("healthGoals").value,
          activityLevel: document.getElementById("activityLevel").value,
          dietType: document.getElementById("dietType").value,
          allergies: document.getElementById("allergies").value,
          budgetPreference: document.getElementById("budgetPreference").value,
          sleepHours: document.getElementById("sleepHours").value,
          waterIntakeGoal: document.getElementById("waterIntakeGoal").value,
          preferredWorkoutTime: document.getElementById("preferredWorkoutTime").value,
          mentalHealthFocus: document.getElementById("mentalHealthFocus").value,
          avatarInfo: generateUserAvatar(user.uid, name),
          displayName: name
      };

      const userDocRef = doc(db, "users", user.uid);

      // Inside the profileForm submit handler, update the try block
      try {
          const existingDoc = await getDoc(userDocRef);
          const existingData = existingDoc.exists() ? existingDoc.data() : {};
          
          // Ensure email is always saved
          updatedData.email = user.email || existingData.email || '';
          updatedData.name = document.getElementById("name").value;
          updatedData.displayName = updatedData.name;
          
          // Add timestamp for tracking updates
          const mergedData = {
              ...existingData,
              ...updatedData,
              email: updatedData.email, // Ensure email is not overwritten
              lastUpdate: new Date().toISOString()
          };
      
          await setDoc(userDocRef, mergedData);
          
          // Update email in community data
          if (window.updateUserEmail) {
              await window.updateUserEmail(user.uid, updatedData.email);
          }
          
          alert("✅ Profile saved successfully!");
          window.location.href = "home.html";
      } catch (error) {
          alert("❌ Error saving profile: " + error.message);
      }
    }); 
  }
});
