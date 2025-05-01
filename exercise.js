// ✅ Import Firebase
import { db, auth } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";
import { doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

// ✅ DOM Elements
const exerciseTypeEl = document.getElementById("exercise-type");
const muscleGroupEl = document.getElementById("muscle-group");
const equipmentTypeEl = document.getElementById("equipment-type");
const fetchExerciseBtn = document.getElementById("fetch-exercise");
const exerciseListEl = document.getElementById("exercise-list");
const workoutListEl = document.getElementById("workout-list");
const aiInput = document.getElementById("ai-prompt");
const askAiBtn = document.getElementById("ask-ai-btn");
const aiResponseBox = document.getElementById("ai-response");

let userWeightLbs = 150; // default fallback
let userProfile = "User profile not loaded yet.";

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
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": "6ef7d8b092msh8f0f7027753276dp19011fjsn33971607c751",
        "X-RapidAPI-Host": "exercisedb.p.rapidapi.com"
      }
    });
    return await res.json();
  } catch (err) {
    console.error("❌ API Fetch Error:", err);
    return [];
  }
}

// ✅ Handle Get Exercises
let currentExercises = [];

fetchExerciseBtn.addEventListener("click", async () => {
  const type = exerciseTypeEl.value;
  const target = muscleGroupEl.value;
  const equipment = equipmentTypeEl.value;

  let exercises = [];
  if (type === "yoga") {
    exercises = yogaExercises;
  } else if (target) {
    exercises = await fetchFromExerciseDB(`target/${target}`);
  } else if (equipment) {
    exercises = await fetchFromExerciseDB(`equipment/${equipment}`);
  } else {
    const category = exerciseCategories[type] || type;
    exercises = await fetchFromExerciseDB(`bodyPart/${category}`);
  }

  if (!exercises.length) {
    exerciseListEl.innerHTML = "<li>No exercises found.</li>";
    return;
  }

  const met = MET_VALUES[type] || 5;
  const duration = 10; // default 10 mins

  currentExercises = exercises;

  exerciseListEl.innerHTML = exercises.map(ex => {
    const calories = Math.round(met * userWeightLbs * 0.453592 * 3.5 / 200 * duration);
    return `
      <li>
        <strong>${ex.name}</strong><br>
        Muscle Group: ${ex.target}<br>
        <img src="${ex.gifUrl || 'https://via.placeholder.com/150'}" alt="${ex.name}" width="150"><br>
        <strong>Estimated Calories:</strong> ${calories} kcal (10 min)
      </li>
    `;
  }) .join("") + `<br><button id="log-workout-confirm" class="log-btn"></button>`;

  document.getElementById("log-workout-confirm").addEventListener("click", () => {
    saveWorkoutToFirestore(type, currentExercises);
  });
});

// ✅ Save Workout
async function saveWorkoutToFirestore(type, exercises) {
  const user = auth.currentUser;
  if (!user) return;

  const userDocRef = doc(db, "users", user.uid);
  const userDoc = await getDoc(userDocRef);
  const logs = userDoc.exists() ? userDoc.data().workoutLogs || [] : [];

  const workout = {
    id: Date.now().toString(),
    type,
    timestamp: new Date().toISOString(),
    exercises: exercises.map(e => ({
      name: e.name,
      muscleGroup: e.target,
      gif: e.gifUrl || 'https://via.placeholder.com/150'
    }))
  };

  logs.push(workout);
  await updateDoc(userDocRef, { workoutLogs: logs });
  fetchLoggedWorkouts();
}

// ✅ Load Logs
async function fetchLoggedWorkouts() {
  const user = auth.currentUser;
  if (!user) return;

  const userDoc = await getDoc(doc(db, "users", user.uid));
  const logs = userDoc.exists() ? userDoc.data().workoutLogs || [] : [];

  if (!workoutListEl) return;

  if (!logs.length) {
    workoutListEl.innerHTML = "<li>No workouts logged yet.</li>";
    return;
  }

  workoutListEl.innerHTML = "";
  logs.forEach((log, i) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <strong>Workout Type:</strong> ${log.type}<br>
      ${log.duration ? `<strong>Duration:</strong> ${log.duration} min<br>` : ""}
      ${log.caloriesBurned ? `<strong>Calories:</strong> ${log.caloriesBurned} kcal<br>` : ""}
      ${log.exercises ? `
        <ul>${log.exercises.map(ex => `
          <li>${ex.name} - ${ex.muscleGroup}<br>
            <img src="${ex.gif}" width="100">
          </li>`).join("")}</ul>
      ` : ""}
      <em>Logged on: ${new Date(log.timestamp).toLocaleString()}</em><br>
      <button class="delete-workout" data-index="${i}">Delete</button>
    `;
    workoutListEl.appendChild(li);
  });

  document.querySelectorAll(".delete-workout").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      await deleteWorkout(parseInt(e.target.dataset.index));
    });
  });
}

async function deleteWorkout(index) {
  const user = auth.currentUser;
  if (!user) return;

  const userDocRef = doc(db, "users", user.uid);
  const userDoc = await getDoc(userDocRef);
  const logs = userDoc.exists() ? userDoc.data().workoutLogs || [] : [];

  logs.splice(index, 1);
  await updateDoc(userDocRef, { workoutLogs: logs });
  fetchLoggedWorkouts();
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (userDoc.exists()) {
      const data = userDoc.data();
      if (data.weight) userWeightLbs = data.weight;
      userProfile = `Age: ${data.age || "N/A"}\nWeight: ${data.weight} lbs\nSex: ${data.sex}\nGoal: ${data.healthGoals || "N/A"}\nPreferred Exercise: ${data.exerciseType || "N/A"}`;
    }
    fetchLoggedWorkouts();
  } else {
    window.location.href = "index.html";
  }
});

// ✅ AI Workout Suggestion
if (askAiBtn) {
  askAiBtn.addEventListener("click", async () => {
    const prompt = aiInput.value.trim();
    if (!prompt) return;

    aiResponseBox.innerText = "🧠 Thinking...";

    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer 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",
          "HTTP-Referer": "http://localhost:5500",
          "X-Title": "VIDIA AI Workout Advisor"
        },
        body: JSON.stringify({
          model: "mistralai/mistral-small-3.1-24b-instruct:free",
          messages: [
            { role: "system", content: `You are a fitness expert. Use this user profile if helpful:\n\n${userProfile}` },
            { role: "user", content: prompt }
          ],
          temperature: 0.7
        })
      });

      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || "⚠️ No response received.";
      aiResponseBox.innerText = reply;
    } catch (err) {
      console.error("❌ AI Error:", err);
      aiResponseBox.innerText = "⚠️ Failed to fetch response.";
    }
  });
}
