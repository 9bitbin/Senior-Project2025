import { db, auth } from './firebase-config.js';
import { addDoc, collection, Timestamp } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

const goalSelect = document.getElementById("goal-select");
const generateBtn = document.getElementById("generate-btn");
const resultDiv = document.getElementById("suggestion-result");

const API_KEY = "l4ioC02Ockzgjkietj6YgQ==wWJ0gnTd3hZmLFuz"; // ✅ Your API key

const goalFoodMap = {
  "High Protein": [
    "chicken breast",
    "eggs",
    "salmon",
    "cottage cheese",
    "tofu",
    "turkey",
    "protein shake",
    "tuna",
    "greek yogurt",
    "edamame"
  ],
  "Low Carb": [
    "zucchini noodles",
    "salmon",
    "eggs",
    "avocado",
    "cauliflower rice",
    "spinach omelette",
    "almonds",
    "cheese sticks",
    "cucumber salad"
  ],
  "Balanced": [
    "quinoa",
    "grilled chicken",
    "steamed vegetables",
    "brown rice",
    "tofu stir-fry",
    "sweet potatoes",
    "mixed salad",
    "fruit bowl",
    "whole grain toast"
  ],
  "Low Fat": [
    "steamed broccoli",
    "turkey breast",
    "lentil soup",
    "oatmeal",
    "baked cod",
    "grilled zucchini",
    "banana",
    "cucumber",
    "miso soup"
  ]
};

generateBtn?.addEventListener("click", async () => {
  const selectedGoal = goalSelect.value;
  const foodList = goalFoodMap[selectedGoal];
  if (!foodList) return;

  resultDiv.innerHTML = "<p>🧠 Generating meals based on your goal...</p>";

  const results = [];

  for (let food of foodList) {
    try {
      const res = await fetch(`https://api.calorieninjas.com/v1/nutrition?query=${food}`, {
        headers: { 'X-Api-Key': API_KEY }
      });

      const data = await res.json();
      if (data.items.length > 0) {
        const item = data.items[0];
        results.push(`
          <div class="meal-box">
            <h4>🍽️ ${item.name}</h4>
            <p>Calories: ${item.calories} kcal</p>
            <p>Protein: ${item.protein_g}g, Carbs: ${item.carbohydrates_total_g}g, Fat: ${item.fat_total_g}g</p>
          </div>
        `);
      }
    } catch (err) {
      console.error("API error:", err);
      results.push(`<p style="color: red;">❌ Failed to load: ${food}</p>`);
    }
  }

  resultDiv.innerHTML = results.join("");
});

