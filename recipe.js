// ✅ Import Firebase
import { auth, db } from "./firebase-config.js";
import {
  collection, query, orderBy, limit, getDocs, addDoc,
  doc, deleteDoc, getDoc, updateDoc
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";

const getRecipeBtn = document.getElementById("getRecipeBtn");
const getRandomRecipeBtn = document.getElementById("getRandomRecipeBtn");
const recipeInput = document.getElementById("recipeInput");
const recipeResults = document.getElementById("recipeResults");
const savedRecipesDiv = document.getElementById("savedRecipes");
const generateMealPlanBtn = document.getElementById("generate-meal-plan");
const mealDurationSelect = document.getElementById("meal-plan-duration");
const mealGoalSelect = document.getElementById("meal-goal");
const mealPlanOutput = document.getElementById("ai-meal-plan-results");

const API_KEY = "l4ioC02Ockzgjkietj6YgQ==wWJ0gnTd3hZmLFuz";
const API_URL = "https://api.calorieninjas.com/v1/nutrition?query=";
const OPENROUTER_KEY = "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";

function appendAIChat(cardEl, recipeName, instructions) {
  const chatContainer = document.createElement("div");
  chatContainer.style.marginTop = "10px";
  chatContainer.innerHTML = `
    <input type="text" placeholder="Ask AI about this recipe..." style="width:100%;padding:10px;margin-bottom:8px;border-radius:8px;border:1px solid #ccc" />
    <button class="ask-ai-btn" style="width:100%;padding:8px;background:#6366f1;color:white;border:none;border-radius:8px;font-weight:bold;">Ask AI</button>
    <div class="ai-recipe-response" style="margin-top:10px;background:#f0fdf4;padding:10px;border-radius:8px;white-space:pre-wrap;font-size:14px;"></div>
  `;
  cardEl.querySelector(".card-body").appendChild(chatContainer);

  const btn = chatContainer.querySelector(".ask-ai-btn");
  const input = chatContainer.querySelector("input");
  const output = chatContainer.querySelector(".ai-recipe-response");

  btn.addEventListener("click", async () => {
    const question = input.value.trim();
    if (!question) return;
    output.innerText = "🧠 Thinking...";
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer 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",
          "HTTP-Referer": "http://localhost:5500",
          "X-Title": "VIDIA AI Recipe Insight"
        },
        body: JSON.stringify({
          model: "mistralai/mistral-small-3.1-24b-instruct:free",
          messages: [
            {
              role: "system",
              content: "You are a nutrition coach. Analyze the recipe with helpful advice."
            },
            {
              role: "user",
              content: `Recipe Name: ${recipeName}\nInstructions: ${instructions.substring(0, 300)}\n\nUser Question: ${question}`
            }
          ]
        })
      });
      const data = await res.json();
      output.innerText = data.choices?.[0]?.message?.content || "No answer.";
    } catch (error) {
      console.error("❌ AI fetch error:", error);
      output.innerText = "⚠️ Failed to get AI response.";
    }
  });
}

function displayRecipes(meals) {
  if (!recipeResults) return;
  recipeResults.innerHTML = "";
  if (!meals) {
    recipeResults.innerHTML = "<p>No recipes found. Try another dish!</p>";
    return;
  }

  meals.forEach(meal => {
    const card = document.createElement("div");
    card.classList.add("recipe-card");
    card.innerHTML = `
      <img src="${meal.strMealThumb}" alt="${meal.strMeal}">
      <div class="card-body">
        <h3>${meal.strMeal}</h3>
        <p><strong>Category:</strong> ${meal.strCategory}</p>
        <p><strong>Origin:</strong> ${meal.strArea}</p>
        <p>${meal.strInstructions.substring(0, 100)}...</p>
        <div class="card-actions">
          <button class="save-btn" data-name="${meal.strMeal}" data-img="${meal.strMealThumb}" data-inst="${meal.strInstructions.replace(/'/g, "\'")}">💾 Save</button>
          <button class="log-btn" data-name="${meal.strMeal}">🍽 Log</button>
          <button class="grocery-btn" data-name="${meal.strMeal}">🛒 Grocery</button>
        </div>
      </div>
    `;
    recipeResults.appendChild(card);
    appendAIChat(card, meal.strMeal, meal.strInstructions);
  });

  document.querySelectorAll(".save-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const name = btn.dataset.name;
      const image = btn.dataset.img;
      const instructions = btn.dataset.inst;
      saveRecipe(name, image, instructions);
    });
  });
 
  document.querySelectorAll(".log-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const name = btn.dataset.name;
      logRecipeToNutrition(name);
    });
  });

  document.querySelectorAll(".grocery-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const recipeName = btn.dataset.name;
      alert(`🛒 Feature coming soon: Add ingredients for '${recipeName}' to Grocery List.`);
    });
  });
}

async function generateMealPlan(uid) {
  const days = mealDurationSelect.value;
  const goal = mealGoalSelect.value;
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
  const profile = snap.data() || {};
  const calorieGoal = profile.calorieGoal || 2000;

  const prompt = `Create a ${days}-day meal plan for someone focused on ${goal} with about ${calorieGoal} calories/day. Return in format Day 1: Breakfast, Lunch, Dinner.`;

  try {
    mealPlanOutput.innerHTML = "<p>⏳ Generating your plan...</p>";
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer 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",
      },
      body: JSON.stringify({
        model: "mistralai/mistral-small-3.1-24b-instruct:free",
        messages: [
          { role: "system", content: "You are a fitness nutritionist." },
          { role: "user", content: prompt }
        ]
      })
    });
    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content;
    if (reply) {
      mealPlanOutput.innerHTML = reply.split("\n\n").map(day => `<div class='meal-plan-item'>${day}</div>`).join("");
    } else {
      mealPlanOutput.innerHTML = "⚠️ No plan received.";
    }
  } catch (err) {
    console.error("❌ Meal plan error:", err);
    mealPlanOutput.innerHTML = "❌ Failed to generate meal plan.";
  }
}

getRecipeBtn?.addEventListener("click", () => {
  const query = recipeInput.value.trim();
  fetchRecipe(query);
});

getRandomRecipeBtn?.addEventListener("click", () => {
  fetch("https://www.themealdb.com/api/json/v1/1/random.php")
    .then(res => res.json())
    .then(data => displayRecipes(data.meals));
});

generateMealPlanBtn?.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (user) generateMealPlan(user.uid);
});

function fetchRecipe(query) {
  if (!query.trim()) return alert("❌ Please enter a dish name!");
  fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${query}`)
    .then(res => res.json())
    .then(data => displayRecipes(data.meals))
    .catch(err => {
      console.error("❌ Error:", err);
      recipeResults.innerHTML = "<p>Error fetching recipe. Try again.</p>";
    });
}

async function saveRecipe(name, image, instructions) {
  const user = auth.currentUser;
  if (!user) return alert("❌ You must be logged in to save recipes.");
  try {
    const ref = collection(db, "users", user.uid, "savedRecipes");
    await addDoc(ref, { name, image, instructions, timestamp: new Date().toISOString() });
    alert("✅ Recipe saved!");
    loadSavedRecipes();
  } catch (error) {
    console.error("❌ Error saving recipe:", error);
  }
}

async function loadSavedRecipes() {
  if (!savedRecipesDiv) return;
  savedRecipesDiv.innerHTML = "";
  const user = auth.currentUser;
  if (!user) return;
  const savedRecipesQuery = query(collection(db, "users", user.uid, "savedRecipes"), orderBy("timestamp", "desc"));
  try {
    const snap = await getDocs(savedRecipesQuery);
    if (snap.empty) {
      savedRecipesDiv.innerHTML = "<p class='no-recipes'>No saved recipes yet.</p>";
      return;
    }
    snap.forEach(docRef => {
      const recipe = docRef.data();
      const card = document.createElement("div");
      card.classList.add("recipe-card");
      card.innerHTML = `
        <img src="${recipe.image}" alt="${recipe.name}">
        <div class="card-body">
          <h3>${recipe.name}</h3>
          <p>${recipe.instructions.substring(0, 100)}...</p>
          <div class="card-actions">
            <button onclick="deleteRecipe('${docRef.id}')">🗑 Delete</button>
          </div>
        </div>
      `;
      savedRecipesDiv.appendChild(card);
    });
  } catch (error) {
    console.error("❌ Error loading recipes:", error);
  }
}

window.deleteRecipe = async (recipeId) => {
  const user = auth.currentUser;
  if (!user) return;
  try {
    await deleteDoc(doc(db, "users", user.uid, "savedRecipes", recipeId));
    alert("✅ Deleted!");
    loadSavedRecipes();
  } catch (err) {
    console.error("❌ Failed to delete:", err);
  }
};

async function logRecipeToNutrition(name) {
  const user = auth.currentUser;
  if (!user) return;
  try {
    const res = await fetch(API_URL + encodeURIComponent(name), {
      headers: { "X-Api-Key": API_KEY }
    });
    const data = await res.json();
    const item = data.items?.[0];
    if (!item) return alert("❌ No nutrition data found.");
    const meal = {
      name,
      calories: item.calories || 0,
      protein: item.protein_g || 0,
      carbs: item.carbohydrates_total_g || 0,
      fat: item.fat_total_g || 0,
      timestamp: new Date().toISOString()
    };
    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);
    const mealLogs = userDoc.exists() ? userDoc.data().mealLogs || [] : [];
    mealLogs.push(meal);
    await updateDoc(userDocRef, { mealLogs });
    alert("🍽 Meal logged to Nutrition Tracker!");
  } catch (err) {
    console.error("❌ Error logging recipe to nutrition:", err);
    alert("⚠️ Could not fetch nutrition info.");
  }
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    loadSavedRecipes();
    getLastLoggedMeal();
    showRecommendedRecipes(user.uid);
  }
});

document.addEventListener("DOMContentLoaded", () => {
  getLastLoggedMeal();
});

async function getLastLoggedMeal() {
  const mealsQuery = query(collection(db, "meals"), orderBy("timestamp", "desc"), limit(1));
  try {
    const snapshot = await getDocs(mealsQuery);
    if (!snapshot.empty) {
      const mealDoc = snapshot.docs[0].data();
      if (mealDoc.name) fetchRecipe(mealDoc.name);
    }
  } catch (err) {
    console.error("❌ Failed to fetch last meal:", err);
  }
}

async function showRecommendedRecipes(uid) {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
  const profile = snap.data() || {};
  const mealLogs = profile.mealLogs || [];
  const recentMeals = mealLogs.slice(-5).map(m => `${m.name}: ${m.calories} kcal`).join("\n");
  const prompt = `Suggest 3 meal ideas that are healthy, budget-friendly, and easy to make. Recent meals: \n${recentMeals}\n\nUser Goal: ${profile.healthGoals || "none"}`;
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer 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",
        "HTTP-Referer": "http://localhost:5500",
        "X-Title": "VIDIA AI Meal Recommender"
      },
      body: JSON.stringify({
        model: "mistralai/mistral-small-3.1-24b-instruct:free",
        messages: [
          { role: "system", content: "You are a dietitian recommending real recipes." },
          { role: "user", content: prompt }
        ]
      })
    });
    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content;
    if (reply && recipeResults) {
      const div = document.createElement("div");
      div.className = "recipe-card";
      div.innerHTML = `<div class="card-body"><h3>✨ Recommended by AI</h3><p style="white-space:pre-line">${reply}</p></div>`;
      recipeResults.prepend(div);
    }
  } catch (err) {
    console.error("❌ AI recommender error:", err);
  }
}




