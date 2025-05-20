// ✅ Import Firebase
// Keep only one set of imports at the top
import { db, auth } from "./firebase-config.js";
import { doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";




// ✅ Select Elements Safely
const fastingWindowSelect = document.getElementById("fasting-window");
const startFastingBtn = document.getElementById("start-fasting");
const endFastingBtn = document.getElementById("end-fasting"); 
const fastingStatusEl = document.getElementById("fasting-status");
const fastingTimerEl = document.getElementById("fasting-timer");
const totalFastsEl = document.getElementById('total-fasts');
const avgDurationEl = document.getElementById('avg-duration');
const completionRateEl = document.getElementById('completion-rate');
const ctx = document.getElementById('fastingChart')?.getContext('2d');
const fastingTypeIndicator = document.querySelector(".fasting-type-indicator");
const dailyFastMessage = document.getElementById('daily-fast-message');

let fastingChart;

let fastingInterval = null; // Store timer interval

// ✅ Start Fasting Function

// Update imports - remove unused arrayUnion




async function clearActiveFasting() {
    const user = auth.currentUser;
    if (!user) return;

    const userDocRef = doc(db, "users", user.uid);
    try {
        await updateDoc(userDocRef, {
            activeFasting: null
        });
        console.log("✅ Active fasting session cleared.");
    } catch (error) {
        console.error("❌ ERROR clearing active fasting:", error);
    }
}









let currentFastStart = null;
let currentFastDuration = 0;


// Update the startCountdownTimer function
function startCountdownTimer(endTime, elapsedHours = 0) {
    if (fastingInterval) clearInterval(fastingInterval);
    
    function updateTimer() {
        const now = new Date();
        const timeDiff = endTime - now;
        
        if (timeDiff <= 0) {
            clearInterval(fastingInterval);
            fastingTimerEl.innerText = "00h 00m 00s";
            endFasting(false, true); // Pass completed=true
            return;
        }

        // Calculate remaining time
        const remainingSeconds = Math.floor(timeDiff / 1000);
        const hours = Math.floor(remainingSeconds / 3600);
        const minutes = Math.floor((remainingSeconds % 3600) / 60);
        const seconds = remainingSeconds % 60;

        fastingTimerEl.innerText = `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
    }

    updateTimer();
    fastingInterval = setInterval(updateTimer, 1000);
}

// Update the startFasting function to show a message when a user tries to start a new fast after stopping one
async function startFasting() {
    console.log("✅ Starting fast...");
    const user = auth.currentUser;
    if (!user) {
        alert("❌ Please log in to start fasting.");
        return;
    }

    // Check if user has fasted today (either from local state or database)
    if (hasFastedToday) {
        if (dailyFastMessage) {
            dailyFastMessage.textContent = "You've already completed a fast today. Please wait until tomorrow to start a new fast.";
            setTimeout(() => {
                dailyFastMessage.textContent = "";
            }, 10000);
        }
        alert("❌ You've already started a fast today. Please wait until tomorrow to start a new fast.");
        return;
    }

    // Continue with starting the fast...
    const fastingHours = parseInt(fastingWindowSelect.value);
    currentFastStart = new Date();
    const startTime = currentFastStart.toISOString();
    const endTime = new Date(currentFastStart.getTime() + fastingHours * 60 * 60 * 1000);

    // Update UI and save to Firebase
    fastingStatusEl.innerText = `Fasting started! Ends at ${endTime.toLocaleTimeString()}`;
    startFastingBtn.disabled = true;
    endFastingBtn.disabled = false;

    startCountdownTimer(endTime);

    try {
        await updateDoc(doc(db, "users", user.uid), {
            activeFasting: { 
                startTime, 
                endTime: endTime.toISOString(),
                targetHours: fastingHours
            }
        });
        console.log("✅ Active fasting session saved.");
    } catch (error) {
        console.error("❌ ERROR saving active fasting session:", error);
    }
}

// Add this helper function
function stopTimer() {
    if (fastingInterval) {
        clearInterval(fastingInterval);
        fastingInterval = null;
    }
    fastingTimerEl.innerText = "00h 00m 00s";
}

// Simplified endFasting function (now acts as stopFasting)
// Add this variable at the top of the file with other variables
let hasFastedToday = false;

// Update the endFasting function
async function endFasting(isAutomatic = false, isCompleted = false) {
    console.log("✅ Stopping fast...");
    const user = auth.currentUser;
    if (!user) return;

    clearInterval(fastingInterval);

    const endTime = new Date().toISOString();
    const userDocRef = doc(db, "users", user.uid);

    try {
        const userDoc = await getDoc(userDocRef);
        const userData = userDoc.data();
        const activeFasting = userData?.activeFasting;
        let fastingHistory = userData?.fastingHistory || [];

        if (activeFasting) {
            const actualEndTime = new Date();
            const startTime = new Date(activeFasting.startTime);
            const currentElapsedHours = (actualEndTime - startTime) / (1000 * 60 * 60);
            
            const plannedEndTime = new Date(activeFasting.endTime).toISOString();
            
            // Add to history with appropriate status
            fastingHistory.push({
                startTime: activeFasting.startTime,
                plannedEndTime: plannedEndTime,
                actualEndTime: endTime,
                duration: currentElapsedHours.toFixed(2),
                status: isCompleted ? "Completed" : "Stopped"
            });
            
            // Set hasFastedToday to true when a fast ends
            hasFastedToday = true;
            
            await updateDoc(userDocRef, {
                fastingHistory: fastingHistory,
                activeFasting: null
            });
            
            const statusMessage = isCompleted ? 
                "Fasting completed successfully!" : 
                `Fasting stopped (${currentElapsedHours.toFixed(1)}h elapsed)`;
            
            fastingStatusEl.innerText = statusMessage;
            stopTimer();
            startFastingBtn.disabled = false; // Enable the start button
            endFastingBtn.disabled = true;
            loadFastingHistory();
        }
    } catch (error) {
        console.error("❌ ERROR stopping fasting session:", error);
    }
}

// Update the loadFastingHistory function's chart section
async function loadFastingHistory() {
    try {
        const user = auth.currentUser;
        if (!user) return;

        // Add safe element access
        const filterStartEl = document.getElementById("filter-start-date");
        const filterEndEl = document.getElementById("filter-end-date");
        const fastingHistoryList = document.getElementById("fasting-history-list");

        // Use optional chaining for value access
        const filterStartDate = filterStartEl?.value;
        const filterEndDate = filterEndEl?.value;

        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            let fastingHistory = userDoc.data().fastingHistory || [];
            // Sort history by start time in descending order
            fastingHistory.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

            // Apply date filtering only if both dates are available
            let filteredHistory = fastingHistory;
            if (filterStartDate && filterEndDate) {
                const startDate = new Date(filterStartDate);
                const endDate = new Date(filterEndDate);
                endDate.setHours(23, 59, 59);

                filteredHistory = filteredHistory.filter(fast => {
                    const fastDate = new Date(fast.startTime);
                    return fastDate >= startDate && fastDate <= endDate;
                });
            }

            // Calculate statistics from complete history
            const totalFasts = fastingHistory.length;
            const completedFasts = fastingHistory.filter(fast => fast.status === "Completed").length;
            const completionRate = totalFasts ? ((completedFasts / totalFasts) * 100).toFixed(1) : 0;
            const avgDuration = totalFasts ? 
                fastingHistory.reduce((acc, fast) => acc + parseFloat(fast.duration), 0) / totalFasts : 0;

            // Update statistics display
            if (totalFastsEl) totalFastsEl.textContent = totalFasts;
            if (avgDurationEl) avgDurationEl.textContent = `${avgDuration.toFixed(2)} hrs`;
            if (completionRateEl) completionRateEl.textContent = `${completionRate}%`;

            // Create/Update chart with last 7 fasts
            // Get the last 7 days
            const last7Days = Array.from({length: 7}, (_, i) => {
                const date = new Date();
                date.setDate(date.getDate() - i);
                date.setHours(0, 0, 0, 0);
                return date;
            }).reverse();

            // Group fasts by day
            const groupedFasts = last7Days.map(day => {
                const dayFasts = fastingHistory.filter(fast => {
                    const fastDate = new Date(fast.startTime);
                    return fastDate.toDateString() === day.toDateString();
                });
                return {
                    date: day,
                    fasts: dayFasts
                };
            });

            // In the loadFastingHistory function, modify how we create datasets
            if (ctx) {
                if (fastingChart) {
                    fastingChart.destroy();
                }

                // For each day, pick the most recent fast (or the longest, if you prefer)
                const dailyFasts = groupedFasts.map(group => {
                    if (group.fasts.length === 0) return null;
                    // Most recent fast:
                    return group.fasts.reduce((a, b) => new Date(a.startTime) > new Date(b.startTime) ? a : b);
                });

                const data = dailyFasts.map(fast => fast ? parseFloat(fast.duration) : 0);
                const backgroundColors = dailyFasts.map(fast => {
                    if (!fast) return "#e5e7eb";
                    const targetHours = parseInt(fastingWindowSelect.value);
                    return parseFloat(fast.duration) >= targetHours ? "#10b981" : "#ef4444";
                });

                const chartData = {
                    type: 'bar',
                    data: {
                        labels: groupedFasts.map(group => {
                            const date = group.date;
                            return `${date.toLocaleDateString('en-US', { weekday: 'short' })} ${date.getMonth() + 1}/${date.getDate()}`;
                        }),
                        datasets: [{
                            data: data,
                            backgroundColor: backgroundColors,
                            borderWidth: 1,
                            borderColor: 'white',
                            borderSkipped: false,
                            barThickness: 32,
                            minBarLength: 4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        categoryPercentage: 0.95,
                        barPercentage: 0.95,
                        scales: {
                            y: {
                                stacked: false,
                                beginAtZero: true,
                                max: 24,
                                grid: {
                                    display: true,
                                    color: '#f0f0f0'
                                },
                                ticks: {
                                    stepSize: 3,
                                    callback: function(value) {
                                        return value + ' hrs';
                                    }
                                }
                            },
                            x: {
                                stacked: false,
                                grid: {
                                    display: false
                                },
                                offset: true,
                                ticks: {
                                    font: {
                                        size: 15
                                    },
                                    padding: 8
                                }
                            }
                        },
                        plugins: {
                            legend: {
                                display: true,
                                position: 'top',
                                labels: {
                                    generateLabels: function(chart) {
                                        return [
                                            {
                                                text: 'Completed Fast',
                                                fillStyle: '#10b981',
                                                strokeStyle: '#10b981',
                                                lineWidth: 0
                                            },
                                            {
                                                text: 'Stopped Fast',
                                                fillStyle: '#ef4444',
                                                strokeStyle: '#ef4444',
                                                lineWidth: 0
                                            }
                                        ];
                                    },
                                    usePointStyle: true,
                                    padding: 20
                                }
                            },
                            tooltip: {
                                callbacks: {
                                    title: (context) => {
                                        const index = context[0].dataIndex;
                                        const date = groupedFasts[index].date;
                                        return date.toLocaleDateString('en-US', { 
                                            weekday: 'long', 
                                            month: 'long', 
                                            day: 'numeric' 
                                        });
                                    },
                                    label: (context) => {
                                        const fast = dailyFasts[context.dataIndex];
                                        if (!fast) return 'No fast logged';
                                        const startTime = new Date(fast.startTime).toLocaleTimeString();
                                        const endTime = new Date(fast.actualEndTime).toLocaleTimeString();
                                        const duration = parseFloat(fast.duration);
                                        return [
                                            `${startTime} - ${endTime}`,
                                            `Duration: ${duration.toFixed(1)}h`,
                                            `Status: ${fast.status}`
                                        ];
                                    }
                                }
                            }
                        }
                    }
                };

                fastingChart = new Chart(ctx, chartData);
            }

            // Apply date filtering if dates are selected
            if (filterStartDate.value && filterEndDate.value) {
                const startDate = new Date(filterStartDate.value);
                const endDate = new Date(filterEndDate.value);
                endDate.setHours(23, 59, 59);

                filteredHistory = filteredHistory.filter(fast => {
                    const fastDate = new Date(fast.startTime);
                    return fastDate >= startDate && fastDate <= endDate;
                });
            }

            // Update history list with filtered data - updated to show "Stopped" instead of "Paused"
            fastingHistoryList.innerHTML = filteredHistory.length
                ? filteredHistory.slice(0, 50).map((fast, index) => `
                    <li class="${index === 0 ? 'new-entry' : ''}">
                        <strong>Start:</strong> ${new Date(fast.startTime).toLocaleString()}<br>
                        <strong>Planned End:</strong> ${new Date(fast.plannedEndTime).toLocaleString()}<br>
                        <strong>Actual End:</strong> ${new Date(fast.actualEndTime).toLocaleString()}<br>
                        <strong>Duration:</strong> ${fast.duration} hrs<br>
                        <strong>Status:</strong> <span style="color: ${fast.status === "Stopped" ? "red" : "green"}">${fast.status}</span>
                    </li>
                `).join("")
                : "<li>No fasting history found.</li>";
        }
    } catch (error) {
        console.error("Error loading fasting history:", error);
    }
}



document.addEventListener("DOMContentLoaded", () => {
    if (startFastingBtn) startFastingBtn.addEventListener("click", startFasting);
    if (endFastingBtn) {
        
        if (endFastingBtn.textContent === "End Fasting" || endFastingBtn.textContent === "Pause Fasting") {
            endFastingBtn.textContent = "Stop Fasting";
        }
        endFastingBtn.addEventListener("click", () => endFasting(false, false));
    }
    
    // Set default text for fasting schedule
    if (fastingTypeIndicator) {
        fastingTypeIndicator.textContent = fastingWindowSelect.options[fastingWindowSelect.selectedIndex].text;
    }

    // Update fasting type indicator when schedule changes
    fastingWindowSelect?.addEventListener('change', (e) => {
        if (fastingTypeIndicator) {
            fastingTypeIndicator.textContent = e.target.options[e.target.selectedIndex].text;
        }
    });

    // Handle auth state changes
    auth.onAuthStateChanged(user => {
        if (user) {
            restoreActiveFasting();
            loadFastingHistory();
        }
    });
});


async function restoreActiveFasting() {
    // Add null checks for DOM elements
    const fastingStatusEl = document.getElementById("fasting-status");
    if (!fastingStatusEl) {
        console.warn("Fasting status element not found");
        return;
    }

    try {
        console.log("🔄 Checking for active fasting session...");
        const user = auth.currentUser;
        if (!user) return;
    
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
    
        if (userDoc.exists()) {
            const activeFasting = userDoc.data().activeFasting;
    
            if (activeFasting) {
                const endTime = new Date(activeFasting.endTime);
                if (new Date() < endTime) {
                    fastingStatusEl.innerText = `Fasting in progress! Ends at ${endTime.toLocaleTimeString()}`;
                    startFastingBtn.disabled = true;
                    endFastingBtn.disabled = false;
                    startCountdownTimer(endTime);
                } else {
                    await clearActiveFasting();
                }
            } else {
                // No active fasting session
                fastingStatusEl.innerText = "";
                startFastingBtn.disabled = false;
                endFastingBtn.disabled = true;
            }
        }
    } catch (error) {
        console.error("Error restoring active fasting:", error);
    }
}

// CSV download function
document.getElementById("download-fasting")?.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) return;
  
    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);
  
    if (!userDoc.exists()) {
      alert("User data not found.");
      return;
    }
  
    const data = userDoc.data();
    const fastingLogs = Array.isArray(data.fastingHistory) ? data.fastingHistory : [];
  
    if (fastingLogs.length === 0) {
      alert("No fasting logs to export.");
      return;
    }
  
    const headers = ["Start Time", "Planned End Time", "Actual End Time", "Duration", "Status"];
    const rows = fastingLogs.map(log => [
      `"${new Date(log.startTime).toLocaleString()}"`,
      `"${new Date(log.plannedEndTime).toLocaleString()}"`,
      `"${new Date(log.actualEndTime).toLocaleString()}"`,
      log.duration,
      log.status
    ]);
  
    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
  
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fasting-history.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
});

// Fasting window select event listener
fastingWindowSelect?.addEventListener('change', (e) => {
    const selectedValue = e.target.value;
    const selectedText = e.target.options[e.target.selectedIndex].text;
    if (fastingTypeIndicator) {
        fastingTypeIndicator.textContent = selectedText;
    }
});

