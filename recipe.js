import { auth, db } from "./firebase-config.js";
import { collection, query, orderBy, limit, getDocs, addDoc, doc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";




// 🔹 Ensure Firestore is initialized
console.log("Firebase Firestore Loaded:", db);





document.getElementById("getRandomRecipeBtn").addEventListener("click", function() {
    fetch("https://www.themealdb.com/api/json/v1/1/random.php")
    .then(response => response.json())
    .then(data => {
        displayRecipes(data.meals);
    })
    .catch(error => {
        console.error("Error fetching random recipe:", error);
        document.getElementById("recipeResults").innerHTML = "<p>Error fetching random recipe. Try again later.</p>";
    });
});



function fetchRecipe(query) {
    if (!query.trim()) {
        alert("Please enter a dish name!");
        return;
    }

    console.log("🔍 Searching for:", query); // Debugging

    fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${query}`)
    .then(response => response.json())
    .then(data => {
        console.log("📡 API Response:", data); // Debugging

        if (!data.meals) {
            document.getElementById("recipeResults").innerHTML = "<p>No recipes found. Try another dish!</p>";
            return;
        }

        displayRecipes(data.meals);
    })
    .catch(error => {
        console.error("❌ Error fetching recipe:", error);
        document.getElementById("recipeResults").innerHTML = "<p>Error fetching recipes. Try again later.</p>";
    });
}





function displayRecipes(meals) {
    let resultsDiv = document.getElementById("recipeResults");
    resultsDiv.innerHTML = ""; // Clear previous results

    if (!meals) {
        resultsDiv.innerHTML = "<p>No recipes found. Try another dish!</p>";
        return;
    }

    meals.forEach(meal => {
        let recipeCard = document.createElement("div");
        recipeCard.classList.add("recipe-card");
        recipeCard.innerHTML = `
            <h3>${meal.strMeal}</h3>
            <img src="${meal.strMealThumb}" alt="${meal.strMeal}" width="200">
            <p><strong>Category:</strong> ${meal.strCategory}</p>
            <p><strong>Area:</strong> ${meal.strArea}</p>
            <p><strong>Instructions:</strong> ${meal.strInstructions.substring(0, 250)}...</p>
            <a href="${meal.strYoutube}" target="_blank">Watch Recipe</a>
            <br><br>
            <button class="save-recipe-btn" 
                data-name="${meal.strMeal}" 
                data-image="${meal.strMealThumb}" 
                data-instructions="${meal.strInstructions.replace(/'/g, "\\'")}">
                Save Recipe
            </button>
            <hr>
        `;
        resultsDiv.appendChild(recipeCard);
    });

    // Attach event listeners for Save buttons
    document.querySelectorAll(".save-recipe-btn").forEach(button => {
        button.addEventListener("click", function () {
            let name = this.getAttribute("data-name");
            let image = this.getAttribute("data-image");
            let instructions = this.getAttribute("data-instructions");
            saveRecipe(name, image, instructions);
        });
    });
}




async function getLastLoggedMeal() {
    console.log("Fetching last logged meal...");

    // Corrected query to properly fetch meals
    const mealsQuery = query(collection(db, "meals"), orderBy("timestamp", "desc"), limit(1));

    try {
        const querySnapshot = await getDocs(mealsQuery);
        if (!querySnapshot.empty) {
            const mealDoc = querySnapshot.docs[0];
            const mealData = mealDoc.data();
            console.log("Fetched meal from Firestore:", mealData);

            let mealName = mealData.name; // Use correct field name
            if (!mealName) {
                console.log("No valid meal name found in Firestore.");
                return;
            }

            console.log("Auto-suggesting recipes for:", mealName);
            fetchRecipe(mealName);
        } else {
            console.log("No meals found in Firestore.");
        }
    } catch (error) {
        console.error("Error fetching last logged meal:", error);
    }
}





async function saveRecipe(name, image, instructions) {
    console.log("Attempting to save recipe:", name); // Debugging

    if (!auth || !auth.currentUser) {
        alert("You must be logged in to save recipes.");
        return;
    }

    try {
        await addDoc(collection(db, "savedRecipes"), {
            userId: auth.currentUser.uid, // Save per user
            name: name,
            image: image,
            instructions: instructions,
            timestamp: new Date().toISOString()
        });

        alert("Recipe saved successfully!");
        loadSavedRecipes(); // Refresh list
    } catch (error) {
        console.error("Error saving recipe:", error);
        alert("Error saving recipe. Try again.");
    }
}


async function loadSavedRecipes() {
    let savedDiv = document.getElementById("savedRecipes");
    savedDiv.innerHTML = ""; 

    const savedRecipesQuery = query(collection(db, "savedRecipes"), orderBy("timestamp", "desc"));

    try {
        const querySnapshot = await getDocs(savedRecipesQuery);

        if (querySnapshot.empty) {
            savedDiv.innerHTML = "<p>No saved recipes yet.</p>";
            return;
        }

        querySnapshot.forEach(doc => {
            let recipe = doc.data();
            console.log("Loaded recipe:", recipe); 

            let recipeCard = document.createElement("div");
            recipeCard.classList.add("recipe-card");
            recipeCard.innerHTML = `
                <h3>${recipe.name}</h3>
                <img src="${recipe.image}" alt="${recipe.name}" width="200">
                <p><strong>Instructions:</strong> ${recipe.instructions.substring(0, 250)}...</p>
                <button onclick="deleteRecipe('${doc.id}')">Delete</button>
                <hr>
            `;
            savedDiv.appendChild(recipeCard);
        });
    } catch (error) {
        console.error("Error loading saved recipes:", error);
    }
}



// ✅ Delete Recipe from Firestore
async function deleteRecipe(recipeId) {
    console.log("Deleting recipe with ID:", recipeId); // Debugging

    try {
        await deleteDoc(doc(db, "savedRecipes", recipeId));
        alert("Recipe deleted successfully!");
        loadSavedRecipes(); // ✅ Refresh saved recipes list
    } catch (error) {
        console.error("Error deleting recipe:", error);
        alert("Error deleting recipe. Try again.");
    }
}

// ✅ Ensure deleteRecipe() is globally accessible
window.deleteRecipe = deleteRecipe;




document.addEventListener("DOMContentLoaded", function() {
    console.log("DOMContentLoaded fired!"); // Debugging
    getLastLoggedMeal(); // Auto-suggest recipe
    loadSavedRecipes();  // Load saved recipes
});

document.getElementById("getRecipeBtn").addEventListener("click", function() {
    let query = document.getElementById("recipeInput").value.trim();
    fetchRecipe(query);
});

onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("✅ User is logged in:", user.email);
    } else {
        console.warn("⚠️ No user is logged in. Recipes won't be saved.");
    }
});
