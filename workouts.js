function selectworkout(workoutType) {
    const workouts = {
        vegetarian: "You have selected a Vegetarian diet, which excludes meat but may include dairy and eggs.",
        vegan: "You have selected a Vegan diet, which excludes all animal products.",
        keto: "You have selected a Keto diet, which is low-carb and high-fat.",
        paleo: "You have selected a Paleo diet, which focuses on whole foods and excludes processed foods.",
        mediterranean: "You have selected a Mediterranean diet, which is rich in fruits, vegetables, and healthy fats.",
        low_carb: "You have select a low-carb diet, which limits your carbohydrate intake", 
        default: "Please select a valid diet type: vegetarian, vegan, keto, paleo, mediterranean, low_carb."
    };

    return diets[dietType.toLowerCase()] || diets.default;
}

// Example Usage:
console.log(selectDiet("low_carb"));
console.log(selectDiet("mediterranean"));
console.log(selectDiet("vegetarian"));
console.log(selectDiet("paleo"));
console.log(selectDiet("vegan"));  // Output: You have selected a Vegan diet, which excludes all animal products.
console.log(selectDiet("keto"));   // Output: You have selected a Keto diet, which is low-carb and high-fat.


if  (dietType==diets){
    return dietType
}
else if (console.error()) {
    display = "Please choose one of the choices listed"
}

else {
    ProcessingInstruction.platform;
}

const { diets } = requestAnimationFrame('events');

diets.on('meals',() =>{
    console.log('food')
})

diets.emit('meals');

