// ✅ Import Firebase
import { db, auth } from "./firebase-config.js";
import { doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

const CALORIE_BURN_RATES = {
    cardio: 10,
    strength: 8,
    stretching: 4,
    yoga: 5
};

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
const dailyBurnSummaryEl = document.getElementById("daily-burn-summary");

function estimateCaloriesBurned(workoutType, duration) {
    if (!CALORIE_BURN_RATES[workoutType] || isNaN(duration)) return 0;
    return duration * CALORIE_BURN_RATES[workoutType];
}

if (getCaloriesBtn && workoutTypeEl && durationEl && estimatedCaloriesEl) {
    getCaloriesBtn.addEventListener("click", () => {
        const workoutType = workoutTypeEl.value;
        const duration = parseInt(durationEl.value);

        if (isNaN(duration) || duration <= 0) {
            alert("❌ Please enter a valid duration in minutes.");
            return;
        }

        const estimatedCalories = estimateCaloriesBurned(workoutType, duration);
        estimatedCaloriesEl.innerText = `${estimatedCalories} kcal`;
    });
}

if (logWorkoutBtn && workoutTypeEl && durationEl) {
    logWorkoutBtn.addEventListener("click", async () => {
        const workoutType = workoutTypeEl.value;
        const duration = parseInt(durationEl.value);

        if (isNaN(duration) || duration <= 0) {
            alert("❌ Please enter a valid duration in minutes.");
            return;
        }

        const estimatedCalories = estimateCaloriesBurned(workoutType, duration);
        const timestamp = new Date().toISOString();

        const workout = {
            type: workoutType,
            duration,
            caloriesBurned: estimatedCalories,
            timestamp
        };

        // Add a unique ID to the workout object
        workout.id = `workout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        await saveWorkoutToFirestore(workout);
    });
}

async function saveWorkoutToFirestore(workout) {
    const user = auth.currentUser;
    if (!user) return;

    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);
    let workouts = userDoc.exists() ? userDoc.data().workoutLogs || [] : [];

    // Ensure existing workouts have IDs if they don't already (for backward compatibility)
    workouts = workouts.map(w => {
        if (!w.id) {
            w.id = `workout_${new Date(w.timestamp).getTime()}_${Math.random().toString(36).substr(2, 9)}`;
        }
        return w;
    });

    workouts.push(workout);

    try {
        await updateDoc(userDocRef, { workoutLogs: workouts });
        fetchLoggedWorkouts();
    } catch (error) {
        console.error("❌ Error saving workout:", error);
    }
}

async function deleteWorkout(workoutId) {
    const user = auth.currentUser;
    if (!user) return;

    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);
    let workouts = userDoc.exists() ? userDoc.data().workoutLogs || [] : [];

    const updatedWorkouts = workouts.filter(workout => workout.id !== workoutId);

    try {
        await updateDoc(userDocRef, { workoutLogs: updatedWorkouts });
        fetchLoggedWorkouts(); // Refresh the list after deletion
    } catch (error) {
        console.error("❌ Error deleting workout:", error);
    }
}

export { fetchLoggedWorkouts, saveWorkoutToFirestore, deleteWorkout };

// Make deleteWorkout globally accessible for event listeners attached via innerHTML
window.deleteWorkout = deleteWorkout;

async function fetchLoggedWorkouts(startDate = null, endDate = null) {
    const user = auth.currentUser;
    if (!user || !workoutListEl || !totalCaloriesEl) return;

    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
        let workouts = userDoc.data().workoutLogs || [];
        let totalCaloriesBurned = 0;
        let dailyCalories = {};

        // Filter out logs with invalid timestamps first
        const validWorkouts = workouts.filter(workout => {
            try {
                // Attempt to create a Date object to check validity
                const dateObj = new Date(workout.timestamp);
                // Check if the date is valid (not 'Invalid Date')
                return !isNaN(dateObj.getTime());
            } catch (e) {
                // If parsing fails, it's invalid
                console.error("Invalid workout timestamp found:", workout.timestamp, e);
                return false;
            }
        });

        let filteredWorkouts = [...validWorkouts];

        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            // Set end date to end of day for inclusive filtering
            end.setHours(23, 59, 59, 999);

            filteredWorkouts = filteredWorkouts.filter(workout => {
                const workoutDate = new Date(workout.timestamp);
                return workoutDate >= start && workoutDate <= end;
            });
        }

        // Sort workouts by timestamp in ascending order (oldest first)
        filteredWorkouts.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        workoutListEl.innerHTML = filteredWorkouts.length > 0
            ? filteredWorkouts.map(workout => {
                const dateObj = new Date(workout.timestamp);
                // Use local date for the daily summary key
                const date = dateObj.toLocaleDateString('en-US'); // Use local date string
                const duration = workout.duration ? `${workout.duration} mins` : "Unknown mins";
                const calories = workout.caloriesBurned ? `${workout.caloriesBurned} kcal` : "Unknown kcal";
                const timestamp = dateObj.toLocaleString();

                totalCaloriesBurned += workout.caloriesBurned || 0;
                dailyCalories[date] = (dailyCalories[date] || 0) + (workout.caloriesBurned || 0);

                return `
                    <li>
                        ${workout.name
                            ? `<strong>Exercise Session:</strong> ${workout.type} <br> <strong>Exercises:</strong> ${workout.name}`
                            : `<strong>General Workout:</strong> ${workout.type}`
                        } <br>
                        <strong>Duration:</strong> ${duration} <br>
                        <strong>Calories Burned:</strong> ${calories} <br>
                        <em>Logged on: ${timestamp}</em>
                        <button class="delete-workout-btn" data-id="${workout.id}">Delete</button>
                    </li>`;
            }).join("")
            : "<li>No workouts logged for this date range.</li>";

        // Add event listeners to delete buttons after rendering
        document.querySelectorAll('.delete-workout-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                const workoutId = event.target.getAttribute('data-id');
                if (workoutId && confirm('Are you sure you want to delete this workout?')) {
                    deleteWorkout(workoutId);
                }
            });
        });

        totalCaloriesEl.innerText = isNaN(totalCaloriesBurned) ? "0 kcal" : `${totalCaloriesBurned}`;

        if (dailyBurnSummaryEl) {
            const summaryHtml = Object.entries(dailyCalories)
                .sort(([dateA], [dateB]) => new Date(dateA) - new Date(dateB)) // Sort daily entries by date
                .map(([date, cals]) => {
                    return `<div><strong>${new Date(date).toLocaleDateString()}:</strong> ${Math.round(cals)} kcal</div>`;
                }).join("");
            dailyBurnSummaryEl.innerHTML = `
                <h4>📆 Daily Burn Summary</h4>
                <div class="daily-burn-container">
                    ${summaryHtml}
                </div>
            `;
        }
    }
}

filterWorkoutsBtn?.addEventListener("click", () => {
    fetchLoggedWorkouts(startDateInput.value, endDateInput.value);
});

resetWorkoutsBtn?.addEventListener("click", () => {
    startDateInput.value = "";
    endDateInput.value = "";
    fetchLoggedWorkouts();
});

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






