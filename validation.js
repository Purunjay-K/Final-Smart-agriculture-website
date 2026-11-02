const form = document.getElementById("farmerForm");

const nameInput = document.getElementById("name");
const mobileInput = document.getElementById("mobile");
const emailInput = document.getElementById("email");
const plotInput = document.getElementById("plot");
const villageInput = document.getElementById("village");
const stageInput = document.getElementById("stage");
const soilInput = document.getElementById("soil");
const temperatureInput = document.getElementById("temperature");
const irrigationInput = document.getElementById("irrigation");
const moistureInput = document.getElementById("soilMoisture");
const dateInput = document.getElementById("date");

const tableBody = document.getElementById("farmerTableBody");
const clearAllBtn = document.getElementById("clearAllBtn");
const advisoryLinkBox = document.getElementById("advisoryLinkBox");

const photoInput = document.getElementById("photo");
const submitBtn = form.querySelector('input[type="submit"]');

// The advisory page (exp8), irrigation table and plot pages read these same keys
const STORAGE_KEY = "registeredFarmers";
const PHOTO_KEY = "farmPhotos";

/* ---------- Farm photos (stored as small compressed images) ---------- */

function loadPhotos() {
    try {
        const saved = localStorage.getItem(PHOTO_KEY);
        const obj = saved ? JSON.parse(saved) : {};
        return (obj && typeof obj === "object" && !Array.isArray(obj)) ? obj : {};
    } catch (e) {
        return {};
    }
}

function savePhotos(photos) {
    try {
        localStorage.setItem(PHOTO_KEY, JSON.stringify(photos));
        return true;
    } catch (e) {
        return false; // storage full or blocked
    }
}

// Shrinks the chosen photo (max 800px, JPEG) so it fits in browser storage.
// Resolves with a data URL, or null if there is no usable image.
function compressPhoto(file) {
    return new Promise(function(resolve) {
        if (!file || !file.type || file.type.indexOf("image/") !== 0) {
            resolve(null);
            return;
        }
        const timer = setTimeout(function() { resolve(null); }, 10000);
        function done(value) { clearTimeout(timer); resolve(value); }

        const reader = new FileReader();
        reader.onerror = function() { done(null); };
        reader.onload = function() {
            const img = new Image();
            img.onerror = function() { done(null); };
            img.onload = function() {
                try {
                    const maxSize = 800;
                    const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
                    const canvas = document.createElement("canvas");
                    canvas.width = Math.max(1, Math.round(img.width * scale));
                    canvas.height = Math.max(1, Math.round(img.height * scale));
                    const ctx = canvas.getContext("2d");
                    ctx.fillStyle = "#ffffff"; // keeps transparent PNGs from turning black
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    done(canvas.toDataURL("image/jpeg", 0.7));
                } catch (e) {
                    done(null);
                }
            };
            img.src = reader.result;
        };
        reader.readAsDataURL(file);
    });
}

/* ---------- Saved records (localStorage) ---------- */

function loadFarmers() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : [];
    } catch (e) {
        return [];
    }
}

function saveFarmers(farmers) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(farmers));
    } catch (e) {
        // storage blocked: the table still works until the page is refreshed
    }
}

let farmers = loadFarmers();

function renderTable() {
    // The advisory page may have changed moisture values; always show the latest
    farmers = loadFarmers();
    const photos = loadPhotos();
    tableBody.innerHTML = "";

    if (farmers.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.colSpan = 14;
        cell.className = "text-center text-muted";
        cell.textContent = "No farmers registered yet.";
        row.appendChild(cell);
        tableBody.appendChild(row);
        return;
    }

    farmers.forEach(function(farmer, index) {
        const row = document.createElement("tr");

        const hasTemp = farmer.temperature !== undefined &&
                        farmer.temperature !== null && farmer.temperature !== "";

        const values = [
            index + 1,
            farmer.name,
            farmer.mobile,
            farmer.email,
            farmer.plot,
            farmer.village,
            farmer.stage,
            farmer.soil,
            hasTemp ? farmer.temperature + " \u00B0C" : "\u2014",
            farmer.irrigation,
            farmer.moisture + "%",
            farmer.date
        ];

        values.forEach(function(value, position) {
            const cell = document.createElement("td");
            cell.textContent = value; // textContent keeps typed text safe
            row.appendChild(cell);

            // Photo thumbnail goes right after the row number
            if (position === 0) {
                const photoCell = document.createElement("td");
                const photo = photos[farmer.id];
                if (typeof photo === "string" && photo.indexOf("data:image/") === 0) {
                    const thumb = document.createElement("img");
                    thumb.src = photo;
                    thumb.alt = "Farm photo";
                    thumb.className = "farmer-thumb";
                    photoCell.appendChild(thumb);
                } else {
                    photoCell.textContent = "\u2014";
                }
                row.appendChild(photoCell);
            }
        });

        const actionCell = document.createElement("td");
        const deleteBtn = document.createElement("button");
        deleteBtn.type = "button";
        deleteBtn.className = "btn btn-sm btn-outline-danger";
        deleteBtn.textContent = "Delete";
        deleteBtn.addEventListener("click", function() {
            const removed = farmers.splice(index, 1)[0];
            saveFarmers(farmers);
            if (removed && removed.id) {
                const allPhotos = loadPhotos();
                delete allPhotos[removed.id];
                savePhotos(allPhotos);
            }
            renderTable();
        });
        actionCell.appendChild(deleteBtn);
        row.appendChild(actionCell);

        tableBody.appendChild(row);
    });
}

clearAllBtn.addEventListener("click", function() {
    if (farmers.length === 0) return;
    if (confirm("Delete all registered farmer records?")) {
        farmers = [];
        saveFarmers(farmers);
        savePhotos({});
        renderTable();
    }
});

renderTable();

/* ---------- Validation ---------- */

function showError(input, message) {
    const error = document.getElementById(input.id + "Error");
    input.classList.add("is-invalid");
    input.classList.remove("is-valid");
    error.textContent = message;
    error.style.display = "block";
}

function clearError(input) {
    const error = document.getElementById(input.id + "Error");
    input.classList.remove("is-invalid");
    input.classList.add("is-valid");
    error.textContent = "";
    error.style.display = "none";
}

form.addEventListener("submit", function(event) {
    event.preventDefault();
    let valid = true;

    // Task 2: Required text fields
    const farmerName = nameInput.value.trim();
    const plotId = plotInput.value.trim();
    const village = villageInput.value.trim();
    const namePattern = /^[A-Za-z ]+$/;

    if (farmerName === "") {
        showError(nameInput, "Farmer Name is required.");
        valid = false;
    } else if (!namePattern.test(farmerName)) {
        showError(nameInput, "Name must contain alphabetic characters and spaces only.");
        valid = false;
    } else {
        clearError(nameInput);
    }

    if (plotId === "") {
        showError(plotInput, "Plot ID is required.");
        valid = false;
    } else {
        clearError(plotInput);
    }

    if (village === "") {
        showError(villageInput, "Village is required.");
        valid = false;
    } else {
        clearError(villageInput);
    }

    // Task 3: Mobile number and email
    const mobilePattern = /^[6-9][0-9]{9}$/;
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!mobilePattern.test(mobileInput.value.trim())) {
        showError(mobileInput, "Enter a valid 10-digit Indian mobile number.");
        valid = false;
    } else {
        clearError(mobileInput);
    }

    if (!emailPattern.test(emailInput.value.trim())) {
        showError(emailInput, "Enter a valid email address.");
        valid = false;
    } else {
        clearError(emailInput);
    }

    // Task 4: Selection fields
    if (stageInput.value === "") {
        showError(stageInput, "Please select a crop stage.");
        valid = false;
    } else {
        clearError(stageInput);
    }

    if (soilInput.value === "") {
        showError(soilInput, "Please select a soil type.");
        valid = false;
    } else {
        clearError(soilInput);
    }

    if (irrigationInput.value === "") {
        showError(irrigationInput, "Please select an irrigation method.");
        valid = false;
    } else {
        clearError(irrigationInput);
    }

    // Temperature validation
    const temperature = Number(temperatureInput.value);
    if (temperatureInput.value === "" || Number.isNaN(temperature) ||
        temperature < 0 || temperature > 60) {
        showError(temperatureInput, "Temperature must be between 0 \u00B0C and 60 \u00B0C.");
        valid = false;
    } else {
        clearError(temperatureInput);
    }

    // Soil moisture validation
    const moisture = Number(moistureInput.value);
    if (moistureInput.value === "" || Number.isNaN(moisture) ||
        moisture < 0 || moisture > 100) {
        showError(moistureInput, "Soil moisture must be between 0% and 100%.");
        valid = false;
    } else {
        clearError(moistureInput);
    }

    // Task 4: Registration date cannot be in the future
    if (dateInput.value === "") {
        showError(dateInput, "Registration Date is required.");
        valid = false;
    } else {
        const selectedDate = new Date(dateInput.value + "T00:00:00");
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (selectedDate > today) {
            showError(dateInput, "Registration Date cannot be in the future.");
            valid = false;
        } else {
            clearError(dateInput);
        }
    }

    if (valid) {
        // Read every value BEFORE the form is reset
        const record = {
            id: Date.now(),
            name: farmerName,
            mobile: mobileInput.value.trim(),
            email: emailInput.value.trim(),
            plot: plotId,
            village: village,
            stage: stageInput.value,
            soil: soilInput.value,
            temperature: temperature,
            irrigation: irrigationInput.value,
            moisture: moisture,
            date: dateInput.value
        };
        const photoFile = photoInput.files && photoInput.files[0];

        submitBtn.disabled = true;
        compressPhoto(photoFile).then(function(photoData) {
            farmers = loadFarmers();
            farmers.push(record);
            saveFarmers(farmers);

            let photoMessage = "";
            if (photoData) {
                const allPhotos = loadPhotos();
                allPhotos[record.id] = photoData;
                if (!savePhotos(allPhotos)) {
                    photoMessage = "\n\n(Your photo could not be saved because browser storage is full.)";
                }
            } else if (photoFile) {
                photoMessage = "\n\n(The selected file could not be used as a photo.)";
            }

            renderTable();
            submitBtn.disabled = false;

            alert("Registration successful! Your plot is now available in the Irrigation Advisory and Farm Plot Navigation." + photoMessage);
            form.reset();
            document.querySelectorAll("#farmerForm .is-valid").forEach(function(field) {
                field.classList.remove("is-valid");
            });
            advisoryLinkBox.style.display = "block";
        });
    }
});

// Remove validation highlighting while the user edits a field.
document.querySelectorAll("#farmerForm input, #farmerForm select").forEach(function(input) {
    input.addEventListener("input", function() {
        input.classList.remove("is-invalid", "is-valid");
        const error = document.getElementById(input.id + "Error");
        if (error) {
            error.textContent = "";
            error.style.display = "none";
        }
    });

    input.addEventListener("change", function() {
        input.classList.remove("is-invalid", "is-valid");
        const error = document.getElementById(input.id + "Error");
        if (error) {
            error.textContent = "";
            error.style.display = "none";
        }
    });
});
