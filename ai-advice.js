import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js';

const askBtn = document.getElementById("ask-btn");
const micBtn = document.getElementById("mic-btn");
const voiceToggle = document.getElementById("voice-toggle");
const userInput = document.getElementById("user-input");
const chatOutput = document.getElementById("chat-output");
const voiceStatus = document.getElementById("voice-status");

const API_KEY = "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";

let userContext = "User profile not available yet.";

// 🔹 Load User Profile
onAuthStateChanged(auth, async (user) => {
  if (user) {
    const docSnap = await getDoc(doc(db, "users", user.uid));
    if (docSnap.exists()) {
      const data = docSnap.data();

      // Include all basic + smart fields
      userContext = `
Name: ${data.name || "N/A"}
Age: ${data.age || "N/A"}
Sex: ${data.sex || "N/A"}
Height: ${data.height || "N/A"} in
Weight: ${data.weight || "N/A"} lbs
Date of Birth: ${data.dob || "N/A"}
Calorie Goal: ${data.calorieGoal || "N/A"}
Exercise Type: ${data.exerciseType || "N/A"}
Health Goals: ${data.healthGoals || "N/A"}
Activity Level: ${data.activityLevel || "N/A"}
Diet Type: ${data.dietType || "N/A"}
Allergies: ${data.allergies || "N/A"}
Budget Preference: ${data.budgetPreference || "N/A"}
Sleep Hours: ${data.sleepHours || "N/A"}
Water Intake Goal: ${data.waterIntakeGoal || "N/A"}
Preferred Workout Time: ${data.preferredWorkoutTime || "N/A"}
Mental Health Focus: ${data.mentalHealthFocus || "N/A"}
      `.trim();
    }
  }
});

// 🔹 Create chat bubble
function createMessage(content, isAI = false) {
  const msg = document.createElement("div");
  msg.classList.add("message", isAI ? "ai-msg" : "user-msg");

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = isAI ? "🤖" : "🧑";

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = content;

  msg.appendChild(avatar);
  msg.appendChild(bubble);
  chatOutput.appendChild(msg);
  chatOutput.scrollTop = chatOutput.scrollHeight;
}

// 🔊 Voice output
function speak(text) {
  if (voiceToggle && voiceToggle.checked) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    speechSynthesis.speak(utterance);
  }
}

// 🔹 Ask AI
async function askAI(prompt) {
  createMessage(prompt, false);
  createMessage("🧠 Typing...", true);

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`,
        "HTTP-Referer": "http://localhost:5500",
        "X-Title": "VIDIA AI Health Advisor"
      },
      body: JSON.stringify({
        model: "mistralai/mistral-small-3.1-24b-instruct:free",
        messages: [
          {
            role: "system",
            content: `You are a friendly and knowledgeable AI health advisor. The user may be speaking using voice input, but you will only receive their messages as text. Do not say "I can't hear you" — just respond naturally as if you understood them.\n\nHere is the user's profile info (only use if relevant):\n\n${userContext}`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7
      })
    });

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "⚠️ No response received.";

    const bubbles = chatOutput.querySelectorAll(".ai-msg");
    if (bubbles.length) bubbles[bubbles.length - 1].remove();

    createMessage(reply, true);
    speak(reply);

  } catch (err) {
    console.error("❌ AI Error:", err);
    createMessage("⚠️ Failed to fetch response. Try again later.", true);
  }
}

// 🔹 Handle Ask button
askBtn.addEventListener("click", () => {
  const prompt = userInput.value.trim();
  if (!prompt) return;
  askAI(prompt);
  userInput.value = "";
});

// 🔹 Voice Input Setup
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.lang = 'en-US';

micBtn.addEventListener("click", () => {
  voiceStatus.style.display = "inline-block";
  micBtn.textContent = "🎤 Listening...";
  recognition.start();
});

recognition.onresult = function(event) {
  const spokenText = event.results[0][0].transcript;
  userInput.value = spokenText;
  askBtn.click();
};

recognition.onerror = function(event) {
  alert("Voice input error: " + event.error);
};

recognition.onend = function () {
  voiceStatus.style.display = "none";
  micBtn.textContent = "🎤 Speak to AI";
};
