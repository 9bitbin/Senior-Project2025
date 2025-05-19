// ✅ Import Firebase
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";
import { saveWorkoutToFirestore, fetchLoggedWorkouts } from "./workout.js";

// ✅ DOM Elements
// ✅ DOM Elements
const exerciseListEl = document.getElementById("exercise-list");
const exerciseTypeEl = document.getElementById('exercise-type');
const muscleGroupEl = document.getElementById('muscle-group');
const equipmentTypeEl = document.getElementById('equipment-type');
const fetchExerciseBtn = document.getElementById('fetch-exercise');

// ✅ DOM Elements for Workout Tracking
const workoutTypeEl = document.getElementById('workout-type');
const durationEl = document.getElementById('workout-duration');
const getCaloriesBtn = document.getElementById('get-calories');
const logWorkoutBtn = document.getElementById('log-workout');
const estimatedCaloriesEl = document.getElementById('estimated-calories');
const workoutListEl = document.getElementById("workout-list");
const totalCaloriesEl = document.getElementById("total-workout-calories");
const startDateInput = document.getElementById("workout-start-date");
const endDateInput = document.getElementById("workout-end-date");
const filterWorkoutsBtn = document.getElementById("filter-workouts");
const resetWorkoutsBtn = document.getElementById("reset-workouts");
const dailyBurnSummaryEl = document.getElementById("daily-burn-summary");

let userWeightLbs = 150; // default fallback

document.addEventListener('DOMContentLoaded', async () => {

  

  // Add event listeners for date filtering
  if (filterWorkoutsBtn) {
    filterWorkoutsBtn.addEventListener("click", () => {
        fetchLoggedWorkouts(startDateInput.value, endDateInput.value);
    });
  }

  if (resetWorkoutsBtn) {
    resetWorkoutsBtn.addEventListener("click", () => {
        startDateInput.value = "";
        endDateInput.value = "";
        fetchLoggedWorkouts(); // Fetch all workouts
    });
  }

  // Assuming there's a workoutDateInput element for logging workouts
  const workoutDateInput = document.getElementById('workout-date');

  if (getCaloriesBtn) {
    getCaloriesBtn.addEventListener('click', async () => {
      const type = workoutTypeEl?.value || 'cardio';
      const duration = parseInt(durationEl?.value || '0');
      const selectedDate = workoutDateInput?.value; // Get selected date

      if (isNaN(duration) || duration <= 0) {
        alert('Please enter a valid duration in minutes.');
        return;
      }

      if (!selectedDate) {
        alert('Please select a date for the workout');
        return;
      }

      const met = MET_VALUES[type] || 5;
      const calories = Math.round(met * userWeightLbs * 0.453592 * 3.5 / 200 * duration);

      // Display the estimated calories
      if (estimatedCaloriesEl) estimatedCaloriesEl.textContent = `${calories} kcal`;

    
    });
  }

  if (logWorkoutBtn) {
    logWorkoutBtn.addEventListener('click', async () => {
      const type = workoutTypeEl?.value || 'cardio';
      const duration = parseInt(durationEl?.value || '0');
      const selectedDate = workoutDateInput?.value; // Get selected date

      if (isNaN(duration) || duration <= 0) {
        alert('Please enter a valid duration in minutes.');
        return;
      }

      if (!selectedDate) {
        alert('Please select a date for the workout');
        return;
      }

      const met = MET_VALUES[type] || 5;
      const calories = Math.round(met * userWeightLbs * 0.453592 * 3.5 / 200 * duration);

      // Add workout saving logic and confirmation
      const workout = {
        id: `workout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: type,
        duration: duration,
        caloriesBurned: calories,
        timestamp: new Date(selectedDate).toISOString()
      };

      await saveWorkoutToFirestore(workout);
      alert('Workout logged successfully!');

      // Reset form
      if (durationEl) durationEl.value = '';
      if (estimatedCaloriesEl) estimatedCaloriesEl.textContent = '0';
    });
  }

  // Add auth state change listener to fetch user data and workouts
  onAuthStateChanged(auth, async (user) => {
      if (user) {
          // Fetch user profile to get weight
          const userDocRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
              const userData = userDoc.data();
              userWeightLbs = userData.weight || 150; // Use fetched weight or default
              // userProfile = userData; // Populate userProfile if needed elsewhere
          }
          fetchLoggedWorkouts(); // Fetch and display workouts for the logged-in user
      } else {
          // User is signed out
          // Optionally clear workout list or redirect
          if (workoutListEl) workoutListEl.innerHTML = '';
          if (totalCaloriesEl) totalCaloriesEl.textContent = '0';
          if (dailyBurnSummaryEl) dailyBurnSummaryEl([]);
          // Redirect to login page if necessary
          // window.location.href = "index.html";
      }
  }); // Close DOMContentLoaded
});

const MET_VALUES = {
  cardio: 8,
  strength: 6,
  stretching: 3,
  yoga: 2.5
};

const exerciseCategories = {
  "cardio": "cardio",
  "strength": "chest",
  "stretching": "lower legs"
};

const yogaExercises = [
  { name: "Downward Dog", target: "Full Body" },
  { name: "Tree Pose", target: "Balance" },
  { name: "Warrior II", target: "Legs & Core" },
  { name: "Child’s Pose", target: "Lower Back" },
  { name: "Cobra Pose", target: "Spine & Core" }
];

// ✅ General API Fetcher
async function fetchFromExerciseDB(path) {
  const url = `https://exercisedb.p.rapidapi.com/exercises/${path}?limit=10`;
  console.log(`Attempting to fetch from ExerciseDB: ${url}`); // Added log
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": "6ef7d8b092msh8f0f7027753276dp19011fjsn33971607c751",
        "X-RapidAPI-Host": "exercisedb.p.rapidapi.com"
      }
    });
    console.log(`ExerciseDB API Response Status: ${res.status}`); // Added log
    if (!res.ok) throw new Error(`API request failed with status ${res.status}`);
    const data = await res.json();
    console.log('ExerciseDB API Response Data:', data); // Added log
    return data;
  } catch (err) {
    console.error("❌ API Fetch Error:", err);
    return [];
  }
}

// ✅ Handle Get Exercises
let currentExercises = [];

// Update the fetchExerciseBtn event listener to include calorie estimation
if (fetchExerciseBtn) {
  fetchExerciseBtn.addEventListener('click', async () => {
    console.log('Fetch Exercise button clicked!'); // Added log
    const type = exerciseTypeEl.value;
    const target = muscleGroupEl.value;
    const equipment = equipmentTypeEl.value;
    const selectedDate = document.getElementById('exercise-date')?.value;

    console.log('Selected values:', { type, target, equipment, selectedDate }); // Added log

    let exercises = [];
    if (type === 'yoga') {
      exercises = yogaExercises;
    } else if (target) {
      exercises = await fetchFromExerciseDB(`target/${target}`);
    } else if (equipment) {
      exercises = await fetchFromExerciseDB(`equipment/${equipment}`);
    } else {
      const category = exerciseCategories[type] || type;
      exercises = await fetchFromExerciseDB(`bodyPart/${category}`);
    }

    console.log('Fetched exercises:', exercises); // Added log

    if (!exercises.length) {
      exerciseListEl.innerHTML = '<li>No exercises found.</li>';
      console.log('No exercises found.'); // Added log
      return;
    }

    const met = MET_VALUES[type] || 5;
    const duration = 10; // default 10 mins

    currentExercises = exercises.filter(ex => ex.name && ex.name.trim() !== '');

    if (exerciseListEl) {
      exerciseListEl.innerHTML = exercises.map((ex, index) => {
        const calories = Math.round(met * userWeightLbs * 0.453592 * 3.5 / 200 * duration);
        const formattedDate = selectedDate ? new Date(selectedDate).toLocaleString() : 'Please select a date';
        return `
          <li class='exercise-item'>
            <strong>${ex.name || 'Unknown Exercise'}</strong><br>
            Muscle Group: ${ex.target || 'Not specified'}<br>
            <img src='${ex.gifUrl || 'https://via.placeholder.com/150'}' alt='${ex.name}' width='150'><br>
            <strong>Estimated Calories:</strong> ${calories} kcal (10 min)<br>
            <strong>Selected Date:</strong> ${formattedDate}<br>
            <button class='log-btn' data-index='${index}'>Log This Exercise</button>
          </li>
        `;
      }).join('');
    }

  // Add event listeners to new log buttons
  document.querySelectorAll('.log-btn').forEach((btn, index) => {
    btn.addEventListener('click', async () => {
      if (!selectedDate) {
        alert('Please select a date for the workout');
        return;
      }
      // Pass the exercise object directly, not in an array
      const exerciseToLog = currentExercises[index];
      const workout = {
        id: `workout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: type, // Use the workout type from the dropdown
        name: exerciseToLog.name, // Use the exercise name
        duration: 10, // Default duration for exercise logging
        caloriesBurned: Math.round(met * userWeightLbs * 0.453592 * 3.5 / 200 * 10), // Recalculate calories for 10 mins
        timestamp: new Date(selectedDate).toISOString()
      };
      console.log('Attempting to log workout:', workout); // Added log
      await saveWorkoutToFirestore(workout);
      alert('Workout logged successfully!');

      // Reset form
    });
  });
});
}
