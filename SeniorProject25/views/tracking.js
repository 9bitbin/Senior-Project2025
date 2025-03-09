document.addEventListener("DOMContentLoaded", function () {
    const ctx = document.getElementById('caloriesTrendChart').getContext('2d');

    const myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], // Days of the week
            datasets: [{
                label: 'Calories Consumed',
                borderColor: 'blue', // Color of the line
                backgroundColor: 'rgba(0, 0, 255, 0.1)', // Fill color under the line
                fill: true // Fill the area under the line
            }]
        },
        options: {
            responsive: true, // Make the chart responsive to container size
            maintainAspectRatio: false, // Allow the chart to adjust its aspect ratio
            scales: {
                y: {
                    beginAtZero: true // Start the y-axis at 0
                }
            }
        }
    });
});