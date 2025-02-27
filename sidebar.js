document.addEventListener("DOMContentLoaded", () => {
    const sidebar = document.getElementById("sidebar");
    const menuBtn = document.getElementById("menu-btn");
    const closeBtn = document.getElementById("close-btn");

    // Open Sidebar
    menuBtn.addEventListener("click", () => {
        sidebar.classList.add("active");
    });

    // Close Sidebar
    closeBtn.addEventListener("click", () => {
        sidebar.classList.remove("active");
    });

    // Close sidebar when clicking outside
    document.addEventListener("click", (event) => {
        if (!sidebar.contains(event.target) && event.target !== menuBtn) {
            sidebar.classList.remove("active");
        }
    });
});
