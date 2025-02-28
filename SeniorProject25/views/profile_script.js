let filter_btns = document.querySelectorAll('.filter-btn');
let tab_items = document.querySelectorAll('.tab-item');

filter_btns.forEach(btn => {
    btn.addEventListener('click', function () {
        // Remove 'active' class from all buttons
        filter_btns.forEach(button => button.classList.remove('active'));
        this.classList.add('active'); // Add 'active' to clicked button

        // Get the tab name from the button
        let selected_tab = this.textContent.trim(); 

        // Hide all tab items
        tab_items.forEach(tab => {
            if (tab.getAttribute("data-tab") === selected_tab) {
                tab.classList.add('selected_tab'); // Show selected tab
            } else {
                tab.classList.remove('selected_tab'); // Hide others
            }
        });
    });
});
