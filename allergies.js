function selectallergy(allergyType) {
    const allergies = {
        eggs: "You have selected a eggs as a  allergy, which excludes eggs.",
        milk: "You have selected a milk as a allergy, which excludes all milkbased products.",
        peanuts: "You have selected a peanuts as a allergy, which excludes all peanut realted items.",
        soy: "You have selected a soy as a allergy.",
        wheat: "You have selected a wheat as a allergy.",
        shellfish: "You have select a shellfish as a allergy, which exludes clams, lobsters, shrimp, and many other sea foods.",
        treenuts: "You have select a treenuts allergy.", 
        default: "Please select a valid allergy type: eggs, milk, peanuts, soy, wheat, shellfish, treenuts."
    };

    return allergies[allergyType.toLowerCase()] || allergies.default;
}

// Example Usage:
console.log(selectallergy("shellfish"));
console.log(selectallergy("wheat"));
console.log(selectallergy("eggs"));
console.log(selectallergy("soy"));
console.log(selectallergy("milk"));  // Output: You have selected a milk allergy.
console.log(selectallergy("peanuts"));   // Output: You have selected a peanuts allergy.
console.log(selectallergy("treenuts"));

if  (allergyType==allergies){
    return allergyType
}
else if (console.error()) {
    display = "Please choose one of the choices listed"
}

else {
    ProcessingInstruction.platform;
}

const { allergies } = requestAnimationFrame('events');

allergies.on('allergic',() =>{
    console.log('avoid_food')
})

allergies.emit('allergic');


