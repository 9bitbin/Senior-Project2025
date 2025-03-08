import { db, auth } from "./firebase-config.js";
import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

// 🔹 Select Canvas Elements
const caloriesChartEl = document.getElementById("caloriesChart").getContext("2d");
const macroChartEl = document.getElementById("macroChart").getContext("2d");
const workoutChartEl = document.getElementById("workoutChart").getContext("2d");
const budgetChartEl = document.getElementById("budgetChart").getContext("2d");

// 🔹 Chart Instances (for dynamic updates)
let caloriesChart, macroChart, workoutChart, budgetChart;

// 🔹 Function to Initialize Charts
function initializeCharts() {
    caloriesChart = new Chart(caloriesChartEl, {
        type: "bar",
        data: { labels: ["Calories Consumed", "Calories Burned"], datasets: [{ label: "Calories (kcal)", data: [0, 0], backgroundColor: ["#ff9800", "#4caf50"] }] },
        options: { responsive: true, maintainAspectRatio: false }
    });

    macroChart = new Chart(macroChartEl, {
        type: "pie",
        data: { labels: ["Carbs", "Protein", "Fats"], datasets: [{ data: [0, 0, 0], backgroundColor: ["#2196f3", "#f44336", "#ffeb3b"] }] },
        options: { responsive: true, maintainAspectRatio: false }
    });

    workoutChart = new Chart(workoutChartEl, {
        type: "bar",
        data: { labels: [], datasets: [{ label: "Calories Burned per Workout", data: [], backgroundColor: "#673ab7" }] },
        options: { responsive: true, maintainAspectRatio: false, scales: { x: { title: { display: true, text: "Workout Date" } }, y: { title: { display: true, text: "Calories Burned" } } } }
    });

    budgetChart = new Chart(budgetChartEl, {
        type: "line",
        data: { labels: [], datasets: [{ label: "Spent", data: [], borderColor: "#f44336", fill: false }, { label: "Budget", data: [], borderColor: "#4caf50", fill: false }] },
        options: { responsive: true, maintainAspectRatio: false, scales: { x: { title: { display: true, text: "Date" } }, y: { title: { display: true, text: "Amount ($)" } } } }
    });
}

// 🔹 Function to Update Charts with Real-Time Data
function updateCharts(userData) {
    // ✅ Fetch Meal Logging Data
    const mealLogs = userData.mealLogs || [];
    const totalCalories = mealLogs.reduce((sum, meal) => sum + (meal.calories || 0), 0);
    const totalCarbs = mealLogs.reduce((sum, meal) => sum + (meal.carbs || 0), 0);
    const totalProtein = mealLogs.reduce((sum, meal) => sum + (meal.protein || 0), 0);
    const totalFat = mealLogs.reduce((sum, meal) => sum + (meal.fat || 0), 0);

    // ✅ Fetch Workout Logs
    const workoutLogs = userData.workoutLogs || [];
    const workoutDates = workoutLogs.map(workout => new Date(workout.timestamp).toLocaleDateString());
    const workoutCaloriesData = workoutLogs.map(workout => workout.caloriesBurned || 0);

    // ✅ Fetch Budget & Spending Data
    const mealBudget = userData.mealBudget || { expenses: [], totalSpent: 0, amount: 0 };
    const budgetExpenses = mealBudget.expenses || [];
    const budgetDates = budgetExpenses.map(entry => new Date(entry.timestamp).toLocaleDateString());
    const budgetSpent = budgetExpenses.map(entry => entry.cost || 0);
    const budgetAllocated = mealBudget.amount;

    // 🔹 Update Calories Chart
    caloriesChart.data.datasets[0].data = [totalCalories, workoutCaloriesData.reduce((a, b) => a + b, 0)];
    caloriesChart.update();

    // 🔹 Update Macronutrient Breakdown Chart
    macroChart.data.datasets[0].data = [totalCarbs, totalProtein, totalFat];
    macroChart.update();

    // 🔹 Update Workout Summary Chart
    workoutChart.data.labels = workoutDates;
    workoutChart.data.datasets[0].data = workoutCaloriesData;
    workoutChart.update();

    // 🔹 Update Budget Chart
    budgetChart.data.labels = budgetDates;
    budgetChart.data.datasets[0].data = budgetSpent;
    budgetChart.data.datasets[1].data = new Array(budgetDates.length).fill(budgetAllocated);
    budgetChart.update();
}

// 🔹 Real-Time Listener for User Data
auth.onAuthStateChanged(user => {
    if (!user) return;

    const userDocRef = doc(db, "users", user.uid);

    onSnapshot(userDocRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
            const userData = docSnapshot.data();
            updateCharts(userData);
        }
    });
});

// 🔹 Initialize Charts on Load
initializeCharts();

