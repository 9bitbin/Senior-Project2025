function selectrestrict(restrictType) {
    const restricts = {
        
        lactose: "You have selected a lactose restrication, which excludes dairy and dairy based products.",
        gluten: "You have selected a gluten restrication, which excludes wheat, barley, and rye.",
        keto: "You have selected a Keto restrication, which is low-carb and high-fat.",
        kosher: "You have selected a kosher restrication, which focuses on Jewish laws upon food consumption.",
        halal: "You have selected a halal restrication, which focuses on Islamic laws upon food consumption.",
        low_sodium: "You have select a low-sodium restrication, which limits your sodium intake", 
        default: "Please select a valid restrication type: lactose, gluten, keto, kosher, halal, low_sodium."
    };

    return restricts[restrictType.toLowerCase()] || restricts.default;
}

// Example Usage:
console.log(selectrestrict("low_sodium"));
console.log(selectrestrict("halal"));
console.log(selectrestrict("lactose"));
console.log(selectrestrict("kosher"));
console.log(selectrestrict("gluten"));  // Output: You have selected a gluten restrication.
console.log(selectrestrict("keto"));   // Output: You have selected a Keto restrication.


if  (restrictType==restricts){
    return restrictType
}
else if (console.error()) {
    display = "Please choose one of the choices listed" 
}

else {
    ProcessingInstruction.platform;
}

const { restricts } = requestAnimationFrame('events');

restricts.on('avoid',() =>{
    console.log('restrication')
})

restricts.emit('avoid');





