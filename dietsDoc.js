document.addEventListener("DOMContentLoaded", () => {
    const dietsabbtn = document.querySelector("nav .button:first-of-type"); 

    if (dietsabbtn) {
        dietsabbtn.addEventListener("click", (event) => {
            event.preventDefault(); 
            localStorage.setItem("dietsClicked", "true"); 
            window.location.href = "meals.html"; 
        });
    }
});
