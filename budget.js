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
        // For daily, end at 11:59 PM of the same day
        end.setHours(23, 59, 59, 999);
    } else if (period === "Weekly") {
        // For weekly, end at 11:59 PM of the 6th day after start
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
    } else if (period === "Monthly") {
        // For monthly, end at 11:59 PM of the day before the same date next month
        const nextMonth = new Date(start);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        end.setTime(nextMonth.getTime() - 86400000); // Subtract one day (in milliseconds)
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

    // Use current date/time if no custom date/time is provided
    const currentDateTime = new Date();
    
    // Check if current date is within budget period
    const budgetStart = new Date(budgetData.startDate);
    const budgetEnd = new Date(budgetData.endDate);
    budgetStart.setHours(0, 0, 0, 0);
    budgetEnd.setHours(23, 59, 59, 999);
    
    // If no custom date is provided, use current date if within budget period
    // otherwise use the budget end date
    let selectedDate;
    if (customDateTime) {
        selectedDate = new Date(customDateTime);
    } else {
        // Check if current date is within budget period
        const now = new Date();
        const nowDateOnly = new Date(now);
        nowDateOnly.setHours(0, 0, 0, 0);
        
        if (nowDateOnly >= budgetStart && nowDateOnly <= budgetEnd) {
            selectedDate = now;
        } else {
            // If current date is outside budget period, use the budget end date
            selectedDate = new Date(budgetEnd);
            selectedDate.setHours(12, 0, 0, 0); // Set to noon on the end date
        }
    }
    
    // Get just the date part for comparison
    const selectedDateOnly = new Date(selectedDate);
    selectedDateOnly.setHours(0, 0, 0, 0);

    if (selectedDateOnly < budgetStart || selectedDateOnly > budgetEnd) {
        alert(`❌ Please select a date within your current ${budgetData.period.toLowerCase()} budget period (${budgetStart.toLocaleDateString()} - ${budgetEnd.toLocaleDateString()}).`);
        return;
    }

    // Create expense with selected time
    const expense = {
        id: Date.now().toString(),
        cost: mealCost,
        category,
        timestamp: selectedDate.toISOString()
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
    
    // Get current active budget period from user data
    getCurrentBudgetPeriod().then(budgetPeriod => {
        if (mealDateTimeInput && budgetPeriod) {
            // Use actual budget period dates from user data instead of calculated ones
            const minDate = new Date(budgetPeriod.startDate);
            const maxDate = new Date(budgetPeriod.endDate);
            
            // Ensure end date is set to 23:59:59 of the last day (e.g., the 25th)
            maxDate.setHours(23, 59, 59, 999);
            
            // Format dates for HTML date input (YYYY-MM-DDThh:mm)
            // This ensures the calendar only shows dates within the exact budget period
            const minDateStr = minDate.toISOString().slice(0, 16);
            const maxDateStr = maxDate.toISOString().slice(0, 16);
            
            // Set min and max to restrict calendar to only budget period dates
            mealDateTimeInput.min = minDateStr;
            mealDateTimeInput.max = maxDateStr;
            
            // For debugging
            console.log(`Budget period: ${new Date(minDateStr).toLocaleDateString()} to ${new Date(maxDateStr).toLocaleDateString()}`);
            
            // Clear any existing value to ensure field is empty
            mealDateTimeInput.value = '';
        }
    });
}

// Update event listeners
if (budgetPeriodSelect) {
    budgetPeriodSelect.addEventListener('change', updateDateTimeConstraints);
}

// Clear date input field when it's clicked
if (mealDateTimeInput) {
    mealDateTimeInput.addEventListener('focus', function() {
        // Only clear if this is the first time focusing (has default value)
        if (this.defaultValue === this.value) {
            this.value = '';
        }
    });
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
    if (!userDoc.exists()) return;

    const data = userDoc.data();
    const budgetData = data?.mealBudget || { amount: 0, totalSpent: 0, expenses: [] };
    const allExpenses = data?.allMealExpenses || [];

    if (!budgetData.startDate || !budgetData.endDate) {
        if (budgetRangeDisplay) {
            budgetRangeDisplay.textContent = "Please set a budget to get started";
        }
        return;
    }

    // Update budget period display
    if (budgetRangeDisplay) {
        const startDate = new Date(budgetData.startDate);
        const endDate = new Date(budgetData.endDate);
        budgetRangeDisplay.textContent = `Current ${budgetData.period} Budget Period: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
    }

    // Prepopulate budget fields if they exist
    if (budgetAmountInput && budgetPeriodSelect) {
        budgetAmountInput.value = budgetData.amount;
        budgetPeriodSelect.value = budgetData.period;
    }

    // Update datetime constraints
    updateDateTimeConstraints();

    // Process expenses based on filters
    let expenses = showAllHistoryToggle?.checked ? allExpenses : budgetData.expenses;
    if (startDateFilter && endDateFilter) {
        const start = new Date(startDateFilter);
        const end = new Date(endDateFilter);
        expenses = expenses.filter(exp => {
            const date = new Date(exp.timestamp);
            return date >= start && date <= end;
        });
    }

    // Update budget overview display
    const remaining = budgetData.amount - budgetData.totalSpent;
    budgetValueEl.textContent = `$${budgetData.amount.toFixed(2)}`;
    totalSpentEl.textContent = `$${budgetData.totalSpent.toFixed(2)}`;
    remainingBudgetEl.textContent = `$${remaining.toFixed(2)}`;

    // Update budget alert
    if (budgetAlertEl) {
        if (remaining < 0) {
            budgetAlertEl.textContent = "⚠️ You've exceeded your budget!";
            budgetAlertEl.style.color = "red";
        } else if (remaining < budgetData.amount * 0.2) {
            budgetAlertEl.textContent = "⚠️ You're close to your budget limit!";
            budgetAlertEl.style.color = "orange";
        } else {
            budgetAlertEl.textContent = "";
            budgetAlertEl.style.color = "black";
        }
    }

    // Generate visualizations
    generateBudgetChart(expenses);
    renderBudgetHistoryList(expenses);
    renderBudgetDoughnutChart(budgetData.totalSpent, budgetData.amount);
    updateSmartInsight(budgetData.totalSpent, budgetData.amount);
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
        // Ensure proper date formatting regardless of timestamp format
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

// Helper function to get current budget period from user data
async function getCurrentBudgetPeriod() {
    const user = auth.currentUser;
    if (!user) return null;
    
    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) return null;
    
    const budgetData = userDoc.data()?.mealBudget;
    if (!budgetData || !budgetData.startDate || !budgetData.endDate) return null;
    
    // Parse dates to ensure they're in the correct format
    const startDate = new Date(budgetData.startDate);
    const endDate = new Date(budgetData.endDate);
    
    // Set start date to beginning of day and end date to end of day
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    
    return {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        period: budgetData.period
    };
}

// Clear date input field on page load to ensure clean input
if (mealDateTimeInput) {
    mealDateTimeInput.value = '';
}

auth.onAuthStateChanged(user => {
    if (user) {
        fetchBudgetData();
        updateDateTimeConstraints(); // Add this line
    }
    else window.location.href = "index.html";
});


