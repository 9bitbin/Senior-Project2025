import LoadProfile from "../viewmodels/profile.js"; // Import LoadProfile

document.addEventListener("DOMContentLoaded", () => {
    let filter_btns = document.querySelectorAll('.filter-btn');
    let tab_items = document.querySelectorAll('.tab-item');

    // Function to initialize a section with edit functionality
    function setupEditSection(section) {
        if (!section) return;

        // Buttons
        const editBtn = section.querySelector("button[id^='edit']");
        const saveBtn = section.querySelector("button[id^='save']");
        const backBtn = section.querySelector("button[id^='return']");

        if (!editBtn || !saveBtn || !backBtn) return;

        // Inputs & Selects
        const inputs = section.querySelectorAll("input, select");

        // Store initial values for reset
        let initialValues = {};

        // Function to disable inputs (view mode)
        function setViewMode() {
            inputs.forEach(input => {
                input.disabled = true;
                initialValues[input.id] = input.value; // Store initial value
            });
            editBtn.style.display = "inline-block";
            saveBtn.style.display = "none";
            backBtn.style.display = "none";
        }

        // Function to enable inputs (edit mode)
        function setEditMode() {
            inputs.forEach(input => input.disabled = false);
            editBtn.style.display = "none";
            saveBtn.style.display = "none";
            backBtn.style.display = "inline-block";
        }

        // Enable edit mode when Edit is clicked
        editBtn.addEventListener("click", () => {
            setEditMode();
        });

        // Show Save button when input fields change
        inputs.forEach(input => {
            input.addEventListener("input", () => {
                saveBtn.style.display = "inline-block";
            });
        });

        function restoreMultiSelect(selectElement, selectedValues) {
            if (!selectElement || !Array.isArray(selectedValues)) return;
        
            Array.from(selectElement.options).forEach(option => {
                option.selected = selectedValues.includes(option.value);
            });
        
            console.log(`Restored multi-select: ${selectElement.id}`, selectedValues);
        }
        
        // Revert changes when Back is clicked
        backBtn.addEventListener("click", () => {
            if (window.initialProfileValues) {
                console.log("Restoring values from global storage:", window.initialProfileValues);
        
                inputs.forEach(input => {
                    if (window.initialProfileValues[input.id] !== undefined) {
                        input.value = window.initialProfileValues[input.id];
                    }
                    input.disabled = true;
                });
        
                // Restore Weight Field
                document.getElementById("weight").value = window.initialProfileValues.weight;
        
                // Restore multi-select fields
                restoreMultiSelect(document.getElementById("diet-type"), window.initialProfileValues.dietType);
                restoreMultiSelect(document.getElementById("allergies"), window.initialProfileValues.allergies);
                restoreMultiSelect(document.getElementById("health-condition"), window.initialProfileValues.healthConditions);
        
                setViewMode();
            } else {
                console.warn("No stored initial values found.");
            }
        });
        

        // Initialize section in view mode
        setViewMode();
    }

    // Initialize all tabs initially
    tab_items.forEach(tab => setupEditSection(tab));

    // Handle tab switching
    filter_btns.forEach(btn => {
        btn.addEventListener("click", function () {
            // Remove 'active' class from all buttons
            filter_btns.forEach(button => button.classList.remove('active'));
            this.classList.add('active'); // Add 'active' to clicked button

            // Get the tab name from the button
            let selected_tab = this.textContent.trim(); 

            // Hide all tab items
            tab_items.forEach(tab => {
                if (tab.getAttribute("data-tab") === selected_tab) {
                    tab.classList.add('selected_tab'); // Show selected tab
                    setupEditSection(tab); // Reinitialize edit buttons for this tab
                } else {
                    tab.classList.remove('selected_tab'); // Hide others
                }
            });
        });
    });
});

document.addEventListener("DOMContentLoaded", () => {
    new LoadProfile(); // Initialize LoadProfile to populate data
});
