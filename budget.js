// ✅ Import Firebase
console.log("✅ budget.js is loaded!");

import { db, auth } from "./firebase-config.js";
import { doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

const budgetAmountInput = document.getElementById("budget-amount");
const budgetPeriodSelect = document.getElementById("budget-period");
const setBudgetBtn = document.getElementById("set-budget");

const mealCostInput = document.getElementById("meal-cost");
const mealCategoryInput = document.getElementById("meal-category");
const mealDateTimeInput = document.getElementById("meal-datetime"); // ✅ NEW
const logMealCostBtn = document.getElementById("log-meal-cost");

const budgetValueEl = document.getElementById("budget-value");
const totalSpentEl = document.getElementById("total-spent");
const remainingBudgetEl = document.getElementById("remaining-budget");
const budgetAlertEl = document.getElementById("budget-alert");
const budgetRangeDisplay = document.getElementById("budget-range-display");
const budgetHistoryList = document.getElementById("budget-history-list");
const showAllHistoryToggle = document.getElementById("show-all-history");

const budgetStartDateInput = document.getElementById("budget-start-date");
const budgetEndDateInput = document.getElementById("budget-end-date");
const filterBudgetBtn = document.getElementById("filter-budget");
const resetBudgetBtn = document.getElementById("reset-budget");

let budgetChartInstance = null;
let doughnutChartInstance = null;

function toggleButtons(state) {
    if (setBudgetBtn) setBudgetBtn.disabled = !state;
    if (logMealCostBtn) logMealCostBtn.disabled = !state;
}

function getPeriodDates(period) {
    const start = new Date();
    start.setHours(0, 0, 0, 0); // Set to start of day
    const end = new Date(start);
    
    if (period === "Daily") {
        end.setHours(23, 59, 59, 999); // End of same day
    } else if (period === "Weekly") {
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
    } else if (period === "Monthly") {
        end.setDate(start.getDate() + 29); // Changed from 30 to 29 to make it a 30-day period
        end.setHours(23, 59, 59, 999);
    }
    
    return { startDate: start.toISOString(), endDate: end.toISOString() };
}

async function setBudget() {
    const user = auth.currentUser;
    if (!user) return;

    const budgetAmount = parseFloat(budgetAmountInput.value);
    const budgetPeriod = budgetPeriodSelect.value;
    if (isNaN(budgetAmount) || budgetAmount <= 0) {
        alert("❌ Please enter a valid budget amount.");
        return;
    }

    toggleButtons(false);
    const { startDate, endDate } = getPeriodDates(budgetPeriod);
    const userDocRef = doc(db, "users", user.uid);

    try {
        // Remove the duplicate declaration
        await updateDoc(userDocRef, {
            mealBudget: {
                amount: budgetAmount,
                period: budgetPeriod,
                totalSpent: 0,
                expenses: [],
                startDate,
                endDate
            }
        }, { merge: true });
        updateDateTimeConstraints(); // This is correct
        fetchBudgetData();
    } catch (error) {
        console.error("❌ ERROR setting budget:", error);
    } finally {
        toggleButtons(true);
    }
}

async function logMealCost() {
    const user = auth.currentUser;
    if (!user) return;

    const mealCost = parseFloat(mealCostInput.value);
    const category = mealCategoryInput?.value || "Uncategorized";
    const customDateTime = mealDateTimeInput?.value;

    if (isNaN(mealCost) || mealCost <= 0) {
        alert("❌ Please enter a valid meal cost.");
        return;
    }

    toggleButtons(false);
    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) return;

    const budgetData = userDoc.data()?.mealBudget || { amount: 0, totalSpent: 0, expenses: [] };
    let allExpenses = userDoc.data().allMealExpenses || [];

    // Validate if selected date is within budget period
    if (!budgetData.startDate || !budgetData.endDate) {
        alert("❌ Please set a budget first.");
        return;
    }

    const selectedDate = customDateTime ? new Date(customDateTime) : new Date();
    const budgetStart = new Date(budgetData.startDate);
    const budgetEnd = new Date(budgetData.endDate);
    
    // Set both dates to start/end of their respective days for accurate comparison
    budgetStart.setHours(0, 0, 0, 0);
    budgetEnd.setHours(23, 59, 59, 999);

    // Get just the date part for comparison
    const selectedDateOnly = new Date(selectedDate);
    selectedDateOnly.setHours(0, 0, 0, 0);

    if (selectedDateOnly < budgetStart || selectedDateOnly > budgetEnd) {
        alert(`❌ Please select a date within your current ${budgetData.period.toLowerCase()} budget period (${budgetStart.toLocaleDateString()} - ${budgetEnd.toLocaleDateString()}).`);
        return;
    }

    // In the logMealCost function, update the expense timestamp creation:
    const expense = {
        id: Date.now().toString(),
        cost: mealCost,
        category,
        timestamp: customDateTime ? new Date(customDateTime).toLocaleString() : new Date().toLocaleString()
    };

    budgetData.expenses.push(expense);
    budgetData.totalSpent += mealCost;
    allExpenses.push(expense);

    try {
        await updateDoc(userDocRef, {
            mealBudget: budgetData,
            allMealExpenses: allExpenses
        });
        
        // Reset form and update constraints
        mealCostInput.value = '';
        mealDateTimeInput.value = '';
        updateDateTimeConstraints();
        fetchBudgetData();
    } catch (error) {
        console.error("❌ ERROR logging meal cost:", error);
    } finally {
        toggleButtons(true);
    }
}

// Add null checks to updateDateTimeConstraints
function updateDateTimeConstraints() {
    if (!budgetPeriodSelect) return; // Add guard clause
    const period = budgetPeriodSelect.value;
    if (!period) return; // Add guard clause
    
    const { startDate, endDate } = getPeriodDates(period);
    
    if (mealDateTimeInput) {
        const minDate = new Date(startDate);
        const maxDate = new Date(endDate);
        mealDateTimeInput.min = minDate.toISOString().slice(0, 16);
        mealDateTimeInput.max = maxDate.toISOString().slice(0, 16);
        
        if (!mealDateTimeInput.value) {
            mealDateTimeInput.value = new Date().toISOString().slice(0, 16);
        }
    }
}

// Update event listeners
if (budgetPeriodSelect) {
    budgetPeriodSelect.addEventListener('change', updateDateTimeConstraints);
}


async function fetchBudgetData(startDateFilter = null, endDateFilter = null) {
    const user = auth.currentUser;
    if (!user) return;

    // Check if required elements exist
    if (!budgetValueEl || !totalSpentEl || !remainingBudgetEl) {
        console.warn("Required budget elements not found - this is expected on non-budget pages");
        return;
    }

    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
        const showAll = showAllHistoryToggle?.checked;
        const data = userDoc.data();
        const budgetData = data.mealBudget || { amount: 0, totalSpent: 0, expenses: [] };
        const allExpenses = data.allMealExpenses || [];

        let expenses = showAll ? allExpenses : budgetData.expenses;
        let remainingBudget = budgetData.amount - budgetData.totalSpent;

        if (startDateFilter && endDateFilter) {
            const start = new Date(startDateFilter);
            const end = new Date(endDateFilter);
            expenses = expenses.filter(exp => {
                const date = new Date(exp.timestamp);
                return date >= start && date <= end;
            });
        }

        budgetValueEl.innerText = `$${budgetData.amount.toFixed(2)}`;
        totalSpentEl.innerText = `$${budgetData.totalSpent.toFixed(2)}`;
        remainingBudgetEl.innerText = `$${remainingBudget.toFixed(2)}`;
        budgetAlertEl.innerText = remainingBudget < 0 ? "⚠️ Warning: You have exceeded your budget!" : "";
        budgetAlertEl.style.color = remainingBudget < 0 ? "red" : "black";
    
       
        if (budgetRangeDisplay && budgetData.startDate && budgetData.endDate) {
            const formattedStart = new Date(budgetData.startDate).toLocaleDateString();
            const formattedEnd = new Date(budgetData.endDate).toLocaleDateString();
            budgetRangeDisplay.innerText = `Budget Period: ${formattedStart} to ${formattedEnd}`;
        }
    
        generateBudgetChart(expenses);
        renderBudgetHistoryList(expenses);
        renderBudgetDoughnutChart(budgetData.totalSpent, budgetData.amount);
        updateSmartInsight(budgetData.totalSpent, budgetData.amount);
    }
}

function renderBudgetDoughnutChart(spent, budget) {
    const canvas = document.getElementById("budgetDoughnutChart");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const remaining = Math.max(0, budget - spent);

    if (doughnutChartInstance) doughnutChartInstance.destroy();

    doughnutChartInstance = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels: ["Spent", "Remaining"],
            datasets: [{
                data: [spent, remaining],
                backgroundColor: ["#f87171", "#34d399"]
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: "bottom" } }
        }
    });
}

function updateSmartInsight(spent, budget) {
    const box = document.getElementById("budget-insight");
    if (!box) return;

    const pct = (spent / budget) * 100;
    let msg = `You've used ${pct.toFixed(1)}% of your budget.`;
    if (pct >= 100) msg += " 🚨 You've exceeded your budget!";
    else if (pct >= 90) msg += " ⚠️ Be cautious, you're very close.";
    else if (pct >= 70) msg += " 🟡 You're on pace, monitor spending.";
    else msg += " ✅ Great job staying within limits!";

    box.textContent = msg;
}

function generateBudgetChart(expenses) {
    const canvas = document.getElementById("budgetChart");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const dailyTotals = {};
    let runningTotal = 0;
    
    // Sort expenses by date first
    const sortedExpenses = [...expenses].sort((a, b) => 
        new Date(a.timestamp) - new Date(b.timestamp)
    );
    
    // Calculate daily totals and running cumulative total
    sortedExpenses.forEach(exp => {
        const expDate = new Date(exp.timestamp);
        const dateKey = expDate.toLocaleDateString();
        const cost = parseFloat(exp.cost);
        
        if (!dailyTotals[dateKey]) {
            dailyTotals[dateKey] = 0;
        }
        
        runningTotal += cost;
        dailyTotals[dateKey] = runningTotal;
    });

    // Sort dates chronologically
    const labels = Object.keys(dailyTotals).sort((a, b) => 
        new Date(a) - new Date(b)
    );
    const data = labels.map(date => dailyTotals[date]);

    if (budgetChartInstance) budgetChartInstance.destroy();

    budgetChartInstance = new Chart(ctx, {
        type: "line",
        data: {
            labels,
            datasets: [{
                label: "Cumulative Spending",
                data,
                borderColor: "#10b981",
                backgroundColor: "#a7f3d0",
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            scales: { y: { beginAtZero: true } }
        }
    });
}

function renderBudgetHistoryList(expenses) {
    if (!budgetHistoryList) return;

    if (expenses.length === 0) {
        budgetHistoryList.innerHTML = "<li>No expenses found for this range.</li>";
        return;
    }

    // Sort expenses chronologically
    const sortedExpenses = [...expenses].sort((a, b) => 
        new Date(a.timestamp) - new Date(b.timestamp)
    );

    budgetHistoryList.innerHTML = sortedExpenses.map(exp => {
        const date = new Date(exp.timestamp).toLocaleString();
        const cat = exp.category || "Uncategorized";
        return `<li>$${exp.cost.toFixed(2)} on ${date} — <strong>${cat}</strong></li>`;
    }).join("");
}

if (setBudgetBtn) setBudgetBtn.addEventListener("click", setBudget);
if (logMealCostBtn) logMealCostBtn.addEventListener("click", logMealCost);
if (filterBudgetBtn) filterBudgetBtn.addEventListener("click", () => {
    fetchBudgetData(budgetStartDateInput.value, budgetEndDateInput.value);
});
if (resetBudgetBtn) resetBudgetBtn.addEventListener("click", () => {
    budgetStartDateInput.value = "";
    budgetEndDateInput.value = "";
    fetchBudgetData();
});
if (showAllHistoryToggle) showAllHistoryToggle.addEventListener("change", () => {
    fetchBudgetData();
});

auth.onAuthStateChanged(user => {
    if (user) {
        fetchBudgetData();
        updateDateTimeConstraints(); // Add this line
    }
    else window.location.href = "index.html";
});


