document.addEventListener("DOMContentLoaded", () => {
        const container = document.getElementById("container");
        const signupTogBtn = document.getElementById("signupTogBtn");
        const loginTogBtn = document.getElementById("loginTogBtn");
        const loginBtn = document.getElementById("loginBtn");
    
        // Ensure the container exists before trying to modify it
        if (container && localStorage.getItem("signupClicked") === "true") {
            container.classList.add("active");
            localStorage.removeItem("signupClicked"); // Remove the flag after applying it
        }
    
        if (signupTogBtn) {
            signupTogBtn.addEventListener("click", () => {
                container.classList.add("active");
            });
        }
    
        if (loginTogBtn) {
            loginTogBtn.addEventListener("click", () => {
                container.classList.remove("active");
            });
        }
    
        if (loginBtn) {
            loginBtn.addEventListener("click", () => {
                window.location.href = "home.html"; 
            });
        }
    });
    