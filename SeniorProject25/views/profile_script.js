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

document.addEventListener("DOMContentLoaded", function () {
    function disableInputs(section) {
        let inputs = section.querySelectorAll("input, select");
        inputs.forEach(input => {
            input.disabled = true;
        });
    }

    function enableInputs(section) {
        let inputs = section.querySelectorAll("input, select");
        inputs.forEach(input => {
            input.disabled = false;
        });
    }

    function trackChanges(section, saveBtn) {
        let inputs = section.querySelectorAll("input, select");
        let initialValues = new Map();

        // Store initial values
        inputs.forEach(input => {
            initialValues.set(input, input.value);
            input.addEventListener("input", function () {
                if (input.value !== initialValues.get(input)) {
                    saveBtn.style.display = "inline-block"; // Show save button when change detected
                } else {
                    saveBtn.style.display = "none"; // Hide save button if values revert
                }
            });
        });
    }

    function setupSection(sectionId, editBtnId, saveBtnId, returnBtnId) {
        let section = document.querySelector(`.tab-item[data-tab='${sectionId}']`);
        let editBtn = document.getElementById(editBtnId);
        let saveBtn = document.getElementById(saveBtnId);
        let returnBtn = document.getElementById(returnBtnId);

        disableInputs(section);
        saveBtn.style.display = "none"; // Hide save button initially
        returnBtn.style.display = "none"; // Hide return button initially

        editBtn.addEventListener("click", function () {
            enableInputs(section);
            editBtn.style.display = "none"; // Hide edit button
            returnBtn.style.display = "inline-block"; // Show return button
        });

        returnBtn.addEventListener("click", function () {
            disableInputs(section);
            returnBtn.style.display = "none"; // Hide return button
            editBtn.style.display = "inline-block"; // Show edit button
            saveBtn.style.display = "none"; // Hide save button when returning
        });

        trackChanges(section, saveBtn);
    }

    // Setup for Basic section
    setupSection("Basic", "edit-basic", "save-basic", "return-basic");

    // Setup for Dietary section
    setupSection("Dietary", "edit-dietary", "save-dietary", "return-dietary");
});

