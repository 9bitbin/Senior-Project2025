// ✅ Import Firebase
console.log("✅ budget.js is loaded!");

import { db, auth } from "./firebase-config.js";
import { doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

// ✅ Select Elements Safely
const budgetAmountInput = document.getElementById("budget-amount");
const budgetPeriodSelect = document.getElementById("budget-period");
const setBudgetBtn = document.getElementById("set-budget");

const mealCostInput = document.getElementById("meal-cost");
const logMealCostBtn = document.getElementById("log-meal-cost");

const budgetValueEl = document.getElementById("budget-value");
const totalSpentEl = document.getElementById("total-spent");
const remainingBudgetEl = document.getElementById("remaining-budget");
const budgetAlertEl = document.getElementById("budget-alert");
const budgetHistoryList = document.getElementById("budget-history-list");

// ✅ Select Elements for Spending History
const budgetStartDateInput = document.getElementById("budget-start-date");
const budgetEndDateInput = document.getElementById("budget-end-date");
const filterBudgetBtn = document.getElementById("filter-budget");
const resetBudgetBtn = document.getElementById("reset-budget");

// ✅ Select the Budget Chart Element
const budgetChartCanvas = document.getElementById("budgetChart");

// ✅ Budget Chart Instance
let budgetChartInstance = null;

// ✅ Disable Buttons While Processing
function toggleButtons(state) {
    if (setBudgetBtn) setBudgetBtn.disabled = !state;
    if (logMealCostBtn) logMealCostBtn.disabled = !state;
}

// ✅ Set Budget Function
async function setBudget() {
    console.log("✅ Set Budget button clicked");

    const user = auth.currentUser;
    if (!user) {
        console.error("ERROR: User not logged in!");
        return;
    }

    if (!budgetAmountInput || !budgetPeriodSelect) return;

    const budgetAmount = parseFloat(budgetAmountInput.value);
    const budgetPeriod = budgetPeriodSelect.value;

    if (isNaN(budgetAmount) || budgetAmount <= 0) {
        alert("❌ Please enter a valid budget amount.");
        return;
    }

    toggleButtons(false);

    const userDocRef = doc(db, "users", user.uid);
    try {
        await updateDoc(userDocRef, {
            mealBudget: {
                amount: budgetAmount,
                period: budgetPeriod,
                totalSpent: 0,
                expenses: []
            }
        });

        console.log("✅ Budget set successfully!");
        fetchBudgetData();
    } catch (error) {
        console.error("❌ ERROR setting budget:", error);
    } finally {
        toggleButtons(true);
    }
}

// ✅ Log Meal Cost Function
async function logMealCost() {
    console.log("✅ Log Meal Cost button clicked");

    const user = auth.currentUser;
    if (!user) {
        console.error("ERROR: User not logged in!");
        return;
    }

    if (!mealCostInput) return;

    const mealCost = parseFloat(mealCostInput.value);
    if (isNaN(mealCost) || mealCost <= 0) {
        alert("❌ Please enter a valid meal cost.");
        return;
    }

    toggleButtons(false);

    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
        let budgetData = userDoc.data().mealBudget || { amount: 0, totalSpent: 0, expenses: [] };

        // ✅ Save individual expense with timestamp
        const expense = {
            id: Date.now().toString(),
            cost: mealCost,
            timestamp: new Date().toISOString()
        };

        budgetData.expenses.push(expense);
        budgetData.totalSpent += mealCost;

        try {
            await updateDoc(userDocRef, { mealBudget: budgetData });
            console.log("✅ Meal cost logged successfully!");
            fetchBudgetData();
        } catch (error) {
            console.error("❌ ERROR logging meal cost:", error);
        } finally {
            toggleButtons(true);
        }
    }
}

// ✅ Fetch & Display Budget Data
async function fetchBudgetData(startDate = null, endDate = null) {

    console.log("🔄 Fetching budget data...");

    const user = auth.currentUser;
    if (!user) {
        console.error("ERROR: User not logged in!");
        return;
    }

    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
        let budgetData = userDoc.data().mealBudget || { amount: 0, totalSpent: 0, expenses: [] };
        let remainingBudget = budgetData.amount - budgetData.totalSpent;

        // ✅ Update UI
        if (budgetValueEl) budgetValueEl.innerText = `$${budgetData.amount.toFixed(2)}`;
        if (totalSpentEl) totalSpentEl.innerText = `$${budgetData.totalSpent.toFixed(2)}`;
        if (remainingBudgetEl) remainingBudgetEl.innerText = `$${remainingBudget.toFixed(2)}`;

        if (budgetAlertEl) {
            budgetAlertEl.innerText = remainingBudget < 0 ? "⚠️ Warning: You have exceeded your budget!" : "";
            budgetAlertEl.style.color = remainingBudget < 0 ? "red" : "black";
        }

        generateBudgetChart(filteredExpenses);

// ✅ Also update history list
renderBudgetHistoryList(filteredExpenses);


        let filteredExpenses = [...budgetData.expenses];

if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    filteredExpenses = filteredExpenses.filter(expense => {
        const expenseDate = new Date(expense.timestamp);
        return expenseDate >= start && expenseDate <= end;
    });
}
    }
}

// ✅ Generate Budget Chart
function generateBudgetChart(expenses) {
    if (!budgetChartCanvas) return;

    const dailyExpenses = {};
    
    expenses.forEach(expense => {
        const date = new Date(expense.timestamp).toISOString().split("T")[0];
        dailyExpenses[date] = (dailyExpenses[date] || 0) + expense.cost;
    });

    const sortedDates = Object.keys(dailyExpenses).sort();
    const labels = sortedDates;
    const data = labels.map(date => dailyExpenses[date]);

    // ✅ Destroy old chart instance before creating a new one
    if (budgetChartInstance) {
        budgetChartInstance.destroy();
    }

    // ✅ Create new budget chart
    const ctx = budgetChartCanvas.getContext("2d");
    budgetChartInstance = new Chart(ctx, {
        type: "line",
        data: {
            labels,
            datasets: [{
                label: "Meal Expenses Over Time",
                data,
                backgroundColor: "rgba(255, 99, 132, 0.2)",
                borderColor: "rgba(255, 99, 132, 1)",
                borderWidth: 2
            }]
        },
        options: {
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

// ✅ Attach Event Listeners Only if Elements Exist
if (setBudgetBtn) setBudgetBtn.addEventListener("click", setBudget);
if (logMealCostBtn) logMealCostBtn.addEventListener("click", logMealCost);
if (filterBudgetBtn) filterBudgetBtn.addEventListener("click", () => {
    fetchBudgetData(budgetStartDateInput.value, budgetEndDateInput.value);
});
if (resetBudgetBtn) resetBudgetBtn.addEventListener("click", () => {
    if (budgetStartDateInput) budgetStartDateInput.value = "";
    if (budgetEndDateInput) budgetEndDateInput.value = "";
    fetchBudgetData();
});

// ✅ Ensure User is Logged In & Fetch Budget Data
auth.onAuthStateChanged((user) => {
    if (user) {
        console.log("✅ User logged in, fetching budget data...");
        fetchBudgetData();
    } else {
        console.error("❌ User not logged in, redirecting...");
        window.location.href = "index.html";
    }
});

function renderBudgetHistoryList(expenses) {
    if (!budgetHistoryList) return;

    if (expenses.length === 0) {
        budgetHistoryList.innerHTML = "<li>No expenses found for this range.</li>";
        return;
    }

    budgetHistoryList.innerHTML = expenses.map(exp => {
        const date = new Date(exp.timestamp).toLocaleString();
        return `<li>$${exp.cost.toFixed(2)} <em>on ${date}</em></li>`;
    }).join("");
}
