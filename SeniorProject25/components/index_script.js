document.addEventListener("DOMContentLoaded", () => {
    const signupAbBtn = document.querySelector("nav .button:first-of-type"); 

    if (signupAbBtn) {
        signupAbBtn.addEventListener("click", (event) => {
            event.preventDefault(); 
            localStorage.setItem("signupClicked", "true"); 
            window.location.href = "signup.html"; 
        });
    }
});
