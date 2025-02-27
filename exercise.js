// Import Firebase
import { db, auth } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";
import { doc, updateDoc, arrayUnion, getDoc } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

// 🔹 API Configuration (ExerciseDB API)
const API_KEY = "6ef7d8b092msh8f0f7027753276dp19011fjsn33971607c751"; // Replace with your actual API key
const API_URL = "https://exercisedb.p.rapidapi.com/exercises/bodyPart/";

// 🔹 Select Elements from home.html
const exerciseTypeEl = document.getElementById("exercise-type");
const fetchExerciseBtn = document.getElementById("fetch-exercise");
const exerciseListEl = document.getElementById("exercise-list");
const workoutListEl = document.getElementById("workout-list");

// 🔹 Map Exercise Categories to API Keywords
const exerciseCategories = {
    "cardio": "cardio",
    "strength": "chest",
    "stretching": "lower legs"
};

// 🔹 Manually Defined Yoga Exercises (No Images)
const yogaExercises = [
    { name: "Downward Dog", target: "Full Body" },
    { name: "Tree Pose", target: "Balance" },
    { name: "Warrior II", target: "Legs & Core" },
    { name: "Child’s Pose", target: "Lower Back" },
    { name: "Cobra Pose", target: "Spine & Core" }
];


// 🔹 Fetch Exercise Data from API or Use Predefined Yoga Exercises
async function fetchExerciseData(category) {
    if (category === "yoga") {
        return yogaExercises; // 🔥 Yoga will now return correct poses
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
            throw new Error("Failed to fetch exercise data.");
        }

        return await response.json();
    } catch (error) {
        console.error("Error fetching exercise data:", error);
        return [];
    }
}

// 🔹 Handle Button Click
fetchExerciseBtn.addEventListener("click", async () => {
    const selectedType = exerciseTypeEl.value;
    const category = exerciseCategories[selectedType] || selectedType; // 🔥 Now Yoga is handled manually

    // Fetch exercises
    const exercises = await fetchExerciseData(category);

    if (exercises.length === 0) {
        alert("No exercises found for this category.");
        return;
    }

    // 🔹 Update UI
    exerciseListEl.innerHTML = ""; // Clear previous exercises
    exercises.forEach(exercise => {
        const li = document.createElement("li");
        li.innerHTML = `
            <strong>${exercise.name}</strong> 
            <p>Muscle Group: ${exercise.target}</p>
        
        `;
        exerciseListEl.appendChild(li);
    });

    // 🔹 Save Workouts to Firestore
    saveWorkoutToFirestore(selectedType, exercises);
});

// 🔹 Save Workouts to Firestore
async function saveWorkoutToFirestore(type, exercises) {
    const user = auth.currentUser;
    if (!user) return;

    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) return;

    try {
        await updateDoc(userDocRef, {
            workoutLogs: arrayUnion({
                type: type,
                exercises: exercises.map(e => ({
                    name: e.name,
                    muscleGroup: e.target,
                    gif: e.gifUrl
                })),
                timestamp: new Date().toISOString().split("T")[0]
            })
        });

        console.log("Workout saved successfully.");
        fetchLoggedWorkouts(); // Refresh workout history
    } catch (error) {
        console.error("Error saving workout:", error);
    }
}

// 🔹 Fetch & Display Logged Workouts (Includes Delete Buttons)
async function fetchLoggedWorkouts() {
    const user = auth.currentUser;
    if (!user) return;

    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
        const data = userDoc.data();
        const workouts = data.workoutLogs || [];

        // 🔹 Update UI
        workoutListEl.innerHTML = "";
        if (workouts.length > 0) {
            workouts.slice().reverse().forEach((workout, index) => {
                const li = document.createElement("li");
                li.innerHTML = `
                    <strong>Workout Type:</strong> ${workout.type} <br>
                    <ul>
                        ${workout.exercises.map(ex => `
                            <li>
                                <strong>${ex.name}</strong> - ${ex.muscleGroup} <br>
                                <img src="${ex.gif}" alt="${ex.name}" width="100">
                            </li>
                        `).join("")}
                    </ul>
                    <button class="delete-workout" data-index="${index}">Delete</button>
                `;
                workoutListEl.appendChild(li);
            });

            // 🔹 Attach event listeners for Delete buttons
            document.querySelectorAll(".delete-workout").forEach(button => {
                button.addEventListener("click", async (event) => {
                    const workoutIndex = event.target.dataset.index;
                    await deleteWorkoutFromFirestore(workoutIndex);
                });
            });
        } else {
            workoutListEl.innerHTML = "<li>No workouts logged yet.</li>";
        }
    }
}

// 🔹 Delete Workouts from Firestore & Update UI
async function deleteWorkoutFromFirestore(index) {
    const user = auth.currentUser;
    if (!user) return;

    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) return;

    try {
        let workouts = userDoc.data().workoutLogs || [];
        workouts.splice(index, 1); // Remove the selected workout

        // 🔥 Ensure Firestore updates correctly
        await updateDoc(userDocRef, {
            workoutLogs: workouts
        });

        console.log("Workout deleted successfully.");
        fetchLoggedWorkouts(); // Refresh the list
    } catch (error) {
        console.error("Error deleting workout:", error);
    }
}

// 🔹 Ensure User is Logged In & Fetch Workouts
onAuthStateChanged(auth, (user) => {
    if (user) {
        fetchLoggedWorkouts();
    } else {
        window.location.href = "index.html";
    }
});
