// ✅ Import Firebase
import { db, auth } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";
import { doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

// ✅ API Configuration (ExerciseDB API)
const API_KEY = "6ef7d8b092msh8f0f7027753276dp19011fjsn33971607c751";
const API_URL = "https://exercisedb.p.rapidapi.com/exercises/bodyPart/";

// ✅ Select Elements Safely
const exerciseTypeEl = document.getElementById("exercise-type");
const fetchExerciseBtn = document.getElementById("fetch-exercise");
const exerciseListEl = document.getElementById("exercise-list");
const workoutListEl = document.getElementById("workout-list");

// ✅ Exercise Categories Mapped to API
const exerciseCategories = {
    "cardio": "cardio",
    "strength": "chest",
    "stretching": "lower legs"
};

// ✅ Manually Defined Yoga Exercises (No API Images)
const yogaExercises = [
    { name: "Downward Dog", target: "Full Body" },
    { name: "Tree Pose", target: "Balance" },
    { name: "Warrior II", target: "Legs & Core" },
    { name: "Child’s Pose", target: "Lower Back" },
    { name: "Cobra Pose", target: "Spine & Core" }
];

// ✅ Fetch Exercises from API or Use Yoga Poses
async function fetchExerciseData(category) {
    if (category === "yoga") {
        return yogaExercises;
    }

    const apiUrl = `${API_URL}${category}?limit=5`;
    try {
        const response = await fetch(apiUrl, {
            method: "GET",
            headers: {
                "X-RapidAPI-Key": API_KEY,
                "X-RapidAPI-Host": "exercisedb.p.rapidapi.com"
            }
        });

        if (!response.ok) {
            console.warn(`⚠️ API Error: ${response.status}`);
            return [];
        }

        return await response.json();
    } catch (error) {
        console.error("❌ Error fetching exercise data:", error);
        return [];
    }
}

// ✅ Handle "Get Exercises" Button Click
if (fetchExerciseBtn && exerciseTypeEl) {
    fetchExerciseBtn.addEventListener("click", async () => {
        const selectedType = exerciseTypeEl.value;
        const category = exerciseCategories[selectedType] || selectedType;

        // Fetch exercises
        const exercises = await fetchExerciseData(category);

        if (!exercises || exercises.length === 0) {
            alert("⚠️ No exercises found for this category.");
            return;
        }

        // ✅ Update UI safely
        if (exerciseListEl) {
            exerciseListEl.innerHTML = "";
            exercises.forEach(exercise => {
                const li = document.createElement("li");
                li.innerHTML = `
                    <strong>${exercise.name}</strong> 
                    <p>Muscle Group: ${exercise.target}</p>
                    <img src="${exercise.gifUrl || 'https://via.placeholder.com/150'}" 
                        alt="${exercise.name}" width="150">
                `;
                exerciseListEl.appendChild(li);
            });
        }

        // ✅ Save Workouts to Firestore
        await saveWorkoutToFirestore(selectedType, exercises);
    });
}

// ✅ Save Workouts to Firestore
async function saveWorkoutToFirestore(type, exercises) {
    const user = auth.currentUser;
    if (!user) return;

    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);
    let workouts = [];

    if (userDoc.exists()) {
        const data = userDoc.data();
        workouts = data.workoutLogs || [];
    }

    // Ensure workouts array
    if (!Array.isArray(workouts)) workouts = [];

    const newWorkout = {
        id: Date.now().toString(),  // ✅ Unique ID for deletion
        type: type,
        exercises: exercises.map(e => ({
            name: e.name,
            muscleGroup: e.target,
            gif: e.gifUrl || 'https://via.placeholder.com/150'
        })),
        timestamp: new Date().toISOString()
    };

    workouts.push(newWorkout);

    try {
        await updateDoc(userDocRef, { workoutLogs: workouts });
        console.log("✅ Workout saved successfully.");
        fetchLoggedWorkouts(); // Refresh workout history
    } catch (error) {
        console.error("❌ Error saving workout:", error);
    }
}

// ✅ Fetch & Display Logged Workouts
async function fetchLoggedWorkouts() {
    const user = auth.currentUser;
    if (!user) return;

    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
        let workouts = userDoc.data().workoutLogs || [];

        console.log("🔥 Retrieved Workouts:", workouts);

        if (!workoutListEl) return; // ✅ Prevent issues if workoutListEl is missing

        // ✅ Prevent blank screen issue
        if (!Array.isArray(workouts) || workouts.length === 0) {
            workoutListEl.innerHTML = "<li>No workouts logged yet.</li>";
            return;
        }

        // ✅ Update UI safely
        workoutListEl.innerHTML = "";
        workouts.forEach((workout, index) => {
            if (!workout.exercises || !Array.isArray(workout.exercises)) {
                console.warn(`⚠️ Workout at index ${index} has no valid exercises array.`);
                return;
            }

            const li = document.createElement("li");
            li.innerHTML = `
                <strong>Workout Type:</strong> ${workout.type} <br>
                <ul>
                    ${workout.exercises.map(ex => `
                        <li>
                            <strong>${ex.name}</strong> - ${ex.muscleGroup} <br>
                            <img src="${ex.gif || 'https://via.placeholder.com/100'}" alt="${ex.name}" width="100">
                        </li>
                    `).join("")}
                </ul>
                <button class="delete-workout" data-index="${index}">Delete</button>
            `;
            workoutListEl.appendChild(li);
        });

        // ✅ Attach event listeners for Delete buttons
        document.querySelectorAll(".delete-workout").forEach(button => {
            button.addEventListener("click", async (event) => {
                const workoutIndex = event.target.dataset.index;
                await deleteWorkoutFromFirestore(parseInt(workoutIndex));
            });
        });
    }
}

// ✅ Delete Workout from Firestore
async function deleteWorkoutFromFirestore(workoutIndex) {
    const user = auth.currentUser;
    if (!user) return;

    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) return;

    try {
        let workouts = userDoc.data().workoutLogs || [];

        if (workouts.length === 0 || workoutIndex < 0 || workoutIndex >= workouts.length) {
            console.error("❌ Invalid workout index for deletion.");
            return;
        }

        workouts.splice(workoutIndex, 1); // ✅ Remove workout

        await updateDoc(userDocRef, { workoutLogs: workouts });

        console.log("✅ Workout deleted successfully.");
        fetchLoggedWorkouts(); // ✅ Refresh UI properly after deletion
    } catch (error) {
        console.error("❌ Error deleting workout:", error);
    }
}

// ✅ Ensure User is Logged In & Fetch Workouts
onAuthStateChanged(auth, (user) => {
    if (user) {
        fetchLoggedWorkouts();
    } else {
        window.location.href = "index.html";
    }
});


