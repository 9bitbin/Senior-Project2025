

const container = document.getElementById('container');
const signupTogBtn = document.getElementById('signupTogBtn');
const loginTogBtn = document.getElementById('loginTogBtn');
let loginBtn = document.getElementById('loginBtn');

signupTogBtn.addEventListener('click', ()=>{
        container.classList.add("active");
});

loginTogBtn.addEventListener('click', ()=>{
        container.classList.remove("active");
});



loginBtn.addEventListener("click", ()=>{
    window.location.href = "home.html";
}); 