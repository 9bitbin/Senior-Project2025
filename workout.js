// ✅ Import Firebase
import { db, auth } from "./firebase-config.js";
import { doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";


// ✅ Calories Burned Per Minute (Adjustable Values)
const CALORIE_BURN_RATES = {
    cardio: 10,
    strength: 8,
    stretching: 4,
    yoga: 5
};

// ✅ Select Elements Safely
const workoutTypeEl = document.getElementById("workout-type");
const durationEl = document.getElementById("workout-duration");
const getCaloriesBtn = document.getElementById("get-calories");
const logWorkoutBtn = document.getElementById("log-workout");
const estimatedCaloriesEl = document.getElementById("estimated-calories");
const workoutListEl = document.getElementById("workout-list");
const totalCaloriesEl = document.getElementById("total-workout-calories");
const startDateInput = document.getElementById("workout-start-date");
const endDateInput = document.getElementById("workout-end-date");
const filterWorkoutsBtn = document.getElementById("filter-workouts");
const resetWorkoutsBtn = document.getElementById("reset-workouts");

// ✅ Function to Estimate Calories Burned
function estimateCaloriesBurned(workoutType, duration) {
    if (!CALORIE_BURN_RATES[workoutType] || isNaN(duration)) return 0;
    return duration * CALORIE_BURN_RATES[workoutType];
}

// ✅ Handle "Get Estimated Calories" Button
if (getCaloriesBtn && workoutTypeEl && durationEl && estimatedCaloriesEl) {
    getCaloriesBtn.addEventListener("click", () => {
        const workoutType = workoutTypeEl.value;
        const duration = parseInt(durationEl.value);

        if (isNaN(duration) || duration <= 0) {
            alert("❌ Please enter a valid duration in minutes.");
            return;
        }

        const estimatedCalories = estimateCaloriesBurned(workoutType, duration);
        estimatedCaloriesEl.innerText = `${estimatedCalories} kcal`; // Ensures it's set once
    });
}

// ✅ Handle "Log Workout" Button
if (logWorkoutBtn && workoutTypeEl && durationEl) {
    logWorkoutBtn.addEventListener("click", async () => {
        const workoutType = workoutTypeEl.value;
        const duration = parseInt(durationEl.value);

        if (isNaN(duration) || duration <= 0) {
            alert("❌ Please enter a valid duration in minutes.");
            return;
        }

        const estimatedCalories = estimateCaloriesBurned(workoutType, duration);
        const timestamp = new Date().toISOString(); // ✅ Using ISO format for consistency

        const workout = {
            type: workoutType,
            duration,
            caloriesBurned: estimatedCalories,
            timestamp
        };

        await saveWorkoutToFirestore(workout);
    });
}

// ✅ Save Workout to Firestore
async function saveWorkoutToFirestore(workout) {
    const user = auth.currentUser;
    if (!user) return;

    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);
    let workouts = userDoc.exists() ? userDoc.data().workoutLogs || [] : [];

    workouts.push(workout);

    try {
        await updateDoc(userDocRef, { workoutLogs: workouts });
        console.log("✅ Workout logged successfully.");
        fetchLoggedWorkouts();
    } catch (error) {
        console.error("❌ Error saving workout:", error);
    }
}

// ✅ Fetch & Display Logged Workouts
async function fetchLoggedWorkouts(startDate = null, endDate = null) {
    const user = auth.currentUser;
    if (!user || !workoutListEl || !totalCaloriesEl) return;

    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
        let workouts = userDoc.data().workoutLogs || [];
        let totalCaloriesBurned = 0;

        // ✅ Filter Workouts by Date Range
        if (startDate && endDate) {
            const start = new Date(startDate).toISOString().split("T")[0];
            const end = new Date(endDate).toISOString().split("T")[0];

            workouts = workouts.filter(workout => {
                const workoutDate = new Date(workout.timestamp).toISOString().split("T")[0];
                return workoutDate >= start && workoutDate <= end;
            });
        }

        // ✅ Display Workout History Safely
        workoutListEl.innerHTML = workouts.length > 0
            ? workouts.map(workout => {
                const duration = workout.duration ? `${workout.duration} mins` : "Unknown mins";
                const calories = workout.caloriesBurned ? `${workout.caloriesBurned} kcal` : "Unknown kcal";
                const timestamp = workout.timestamp ? new Date(workout.timestamp).toLocaleString() : "Unknown Date";

                totalCaloriesBurned += workout.caloriesBurned || 0;

                return `
                    <li>
                        <strong>Workout Type:</strong> ${workout.type} <br>
                        <strong>Duration:</strong> ${duration} <br>
                        <strong>Calories Burned:</strong> ${calories} <br>
                        <em>Logged on: ${timestamp}</em>
                    </li>`;
            }).join("")
            : "<li>No workouts logged for this date range.</li>";

        // ✅ Ensure the total calories burned is always a number
        totalCaloriesEl.innerText = isNaN(totalCaloriesBurned) ? "0 kcal" : `${totalCaloriesBurned} kcal`;
    }
}

// ✅ Filter Workouts by Date Range
if (filterWorkoutsBtn && startDateInput && endDateInput) {
    filterWorkoutsBtn.addEventListener("click", () => {
        fetchLoggedWorkouts(startDateInput.value, endDateInput.value);
    });
}

// ✅ Reset Workout Filter
if (resetWorkoutsBtn && startDateInput && endDateInput) {
    resetWorkoutsBtn.addEventListener("click", () => {
        startDateInput.value = "";
        endDateInput.value = "";
        fetchLoggedWorkouts();
    });
}

// ✅ Ensure User is Logged In & Fetch Workouts
auth.onAuthStateChanged((user) => {
    if (user) {
        fetchLoggedWorkouts();
    } else {
        window.location.href = "index.html";
    }
});

document.getElementById("download-workouts")?.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) return;
  
    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);
    const workoutLogs = userDoc.exists() ? userDoc.data().workoutLogs || [] : [];
  
    if (!workoutLogs.length) {
      alert("No workouts to export.");
      return;
    }
  
    const headers = ["Type", "Duration (min)", "Calories Burned", "Timestamp"];
    const rows = workoutLogs.map(log => [
      `"${log.type || ''}"`,
      log.duration || 0,
      log.caloriesBurned || 0,
      `"${new Date(log.timestamp).toLocaleString()}"`
    ]);
  
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
  
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
  
    const link = document.createElement("a");
    link.href = url;
    link.download = "workout-history.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  });


