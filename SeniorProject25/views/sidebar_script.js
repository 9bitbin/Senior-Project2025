let menuBtn = document.querySelector('#menu-btn');
let sideBar = document.querySelector('.sidebar');

menuBtn.addEventListener('click', function(event) {
    event.preventDefault(); // Prevent page reload from clicking the link
    sideBar.classList.toggle('active');
});
