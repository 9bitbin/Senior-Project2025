function calculateBMI(weight, height) {
    if (weight <= 0 || height <= 0) {
        return "Weight and height must be positive values.";
    }
    
    let bmi = weight / (height * height);
    return bmi.toFixed(2); // Rounds to 2 decimal places
}

let weight = 70; // kg
let height = 1.75; // meters

let bmi = calculateBMI(weight, height);
console.log(`Your BMI is: ${bmi}`);

if (bmi < 18.5) {
    console.log("Category: Underweight");
} else if (bmi < 24.9) {
    console.log("Category: Normal weight");
} else if (bmi < 29.9) {
    console.log("Category: Overweight");
} else {
    console.log("Category: Obesity");
}
