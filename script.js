/* 
    UTS SMART PARKING SYSTEM PROTOTYPE LOGIC
*/

// --- 1. DATA MODEL ---
// Represents the "Backend Database"
let parkingData = [
    {
        id: "surau",
        name: "Surau Carpark",
        img: "Surau.jpeg",
        type: "open", // open or covered
        capacity: 40,
        available: 15,
        levels: null // Single level
    },
    {
        id: "gate2",
        name: "Gate 2 Carpark",
        img: "gate2.jpeg",
        type: "open",
        capacity: 60,
        available: 20,
        levels: null
    },
    {
        id: "block5",
        name: "Block 5 Carpark",
        img: "block5.jpeg",
        type: "open",
        capacity: 30,
        available: 2, // Almost full
        levels: null
    },
    {
        id: "cafeteria",
        name: "Cafeteria Carpark",
        img: "cafeteria.jpeg",
        type: "open",
        capacity: 50,
        available: 25,
        levels: null
    },
    {
        id: "multistory",
        name: "Multistory Carpark",
        img: "multistory.jpeg",
        type: "covered",
        capacity: 200,
        available: 120,
        // Complex structure for levels
        levels: [
            { label: "Level 1a", cap: 25, free: 5 },
            { label: "Level 1b", cap: 25, free: 0 }, // Full
            { label: "Level 2a", cap: 25, free: 12 },
            { label: "Level 2b", cap: 25, free: 15 },
            { label: "Level 3a", cap: 25, free: 20 },
            { label: "Level 3b", cap: 25, free: 22 },
            { label: "Level 4a", cap: 25, free: 25 }, // Empty
            { label: "Level 4b", cap: 25, free: 21 }
        ]
    },
    {
        id: "hornbill",
        name: "Hornbill Hall Carpark",
        img: "Hornbillhall.jpeg",
        type: "mixed",
        capacity: 80,
        available: 30,
        levels: [
            { label: "Ground Floor", cap: 40, free: 5 },
            { label: "Mezzanine", cap: 40, free: 25 } // Covered
        ]
    }
];

// Weather State (Simulated)
let isRaining = false; 

// --- 2. INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    renderDashboard();
    populateSelectOptions();
    loadSavedCar();
    
    // START SIMULATION: Update random data every 3 seconds to fake "Real-Time"
    setInterval(() => {
        checkCVUpdates(); // Priority: Check for actual CV demo data
        simulateRealTimeUpdates(); // Fallback: Random noise for other lots
    }, 1000);
});

// --- 3. CORE FUNCTIONS ---

// NEW: Check for CV Demo Updates
function checkCVUpdates() {
    const rawData = localStorage.getItem('cv_update');
    if(!rawData) return;

    try {
        const update = JSON.parse(rawData);
        // Find Gate 2 in our data model
        const gate2 = parkingData.find(p => p.id === 'gate2');
        
        if(gate2) {
            // Only update if changed to avoid unnecessary re-renders
            if(gate2.available !== update.free || gate2.capacity !== update.total) {
                gate2.capacity = update.total;
                gate2.available = update.free;
                
                // Refresh UI
                renderDashboard();
                
                // Refresh Plan Parking if visible
                const resultDiv = document.getElementById('recommendation-result');
                if(!resultDiv.classList.contains('hidden')) {
                    findBestParking(); 
                }
            }
        }
    } catch(e) {
        console.error("Error parsing CV data", e);
    }
}

// A. Render Dashboard
function renderDashboard() {
    const listContainer = document.getElementById('parking-list');
    const totalCapDisplay = document.getElementById('total-capacity');
    listContainer.innerHTML = ''; // Clear current

    let totalFree = 0;

    parkingData.forEach(lot => {
        totalFree += lot.available;

        // Calculate status color
        let percentFree = (lot.available / lot.capacity) * 100;
        let badgeClass = percentFree > 50 ? 'bg-success' : (percentFree > 10 ? 'bg-warning' : 'bg-danger');
        let statusText = lot.available === 0 ? 'FULL' : (percentFree < 10 ? 'Busy' : 'Available');

        // Build Level List HTML if it exists
        let levelHTML = '';
        if (lot.levels) {
            levelHTML = '<div class="level-list">';
            lot.levels.forEach(lvl => {
                let lvlColor = lvl.free === 0 ? 'red' : 'green';
                levelHTML += `
                    <div class="level-item">
                        <span>${lvl.label}</span>
                        <span style="color:${lvlColor}; font-weight:bold">${lvl.free > 0 ? lvl.free : 'FULL'}</span>
                    </div>`;
            });
            levelHTML += '</div>';
        }

        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="card-img" style="background-image: url('${lot.img}')">
                <span class="status-badge ${badgeClass}">${statusText}</span>
            </div>
            <div class="card-body">
                <h3 class="card-title">${lot.name}</h3>
                <p><strong>${lot.available}</strong> spots free / ${lot.capacity}</p>
                <div class="capacity-bar">
                    <div class="bar-fill ${badgeClass}" style="width: ${percentFree}%"></div>
                </div>
                ${levelHTML}
            </div>
        `;
        listContainer.appendChild(card);
    });

    totalCapDisplay.innerText = `Total Free: ${totalFree}`;
}

// B. Simulation Logic
function simulateRealTimeUpdates() {
    // Randomly add/subtract a car from a random lot
    let randomLotIndex = Math.floor(Math.random() * parkingData.length);
    let lot = parkingData[randomLotIndex];
    let change = Math.random() > 0.5 ? 1 : -1;

    // Boundary checks
    if (lot.available + change >= 0 && lot.available + change <= lot.capacity) {
        lot.available += change;
        
        // If it has levels, update a random level too
        if (lot.levels) {
            let rndLvl = Math.floor(Math.random() * lot.levels.length);
            let lvl = lot.levels[rndLvl];
            if (lvl.free + change >= 0 && lvl.free + change <= lvl.cap) {
                lvl.free += change;
            }
        }
        
        renderDashboard(); // Re-render to show change
    }
}

// C. Planning Logic
function findBestParking() {
    const dest = document.getElementById('destination-select').value;
    const resultDiv = document.getElementById('recommendation-result');
    const contentDiv = document.getElementById('rec-content');
    const alert = document.getElementById('weather-alert');
    
    // Result Logic
    resultDiv.classList.remove('hidden');
    
    // Simple mock logic for "Distance"
    // In a real app, this would use Google Maps API or a graph algorithm
    let bestLot = null;
    let distance = 0;
    
    // WEATHER OVERRIDE LOGIC
    if (isRaining) {
        // If raining, force Multistory or Hornbill (Covered)
        bestLot = parkingData.find(p => (p.id === 'multistory' || p.id === 'hornbill') && p.available > 0);
        distance = "450m (Preferred due to Rain - Covered)";
        alert.classList.remove('hidden');
    } else {
        alert.classList.add('hidden');
        // Simple switch for demo purposes based on destination
        switch(dest) {
            case 'Block 5':
                bestLot = parkingData.find(p => p.id === 'block5' && p.available > 0);
                distance = "50m (1 min walk)";
                break;
            case 'Gate 2':
                bestLot = parkingData.find(p => p.id === 'gate2' && p.available > 0);
                distance = "100m (2 min walk)";
                break;
            case 'Cafeteria':
                bestLot = parkingData.find(p => p.id === 'cafeteria' && p.available > 0);
                distance = "20m (Immediate)";
                break;
            default:
                // Fallback to nearest big lot
                bestLot = parkingData.find(p => p.available > 10); 
                distance = "300m (5 min walk)";
        }
    }

    // Fallback if the "Best" lot is full
    if (!bestLot && !isRaining) {
         bestLot = parkingData.find(p => p.available > 0);
         distance = "Further Walk (Other lots full)";
    }

    if (!bestLot || bestLot.available === 0) {
        contentDiv.innerHTML = `<p style="color:red">No close parking found. Try Multistory.</p>`;
        return;
    }

    contentDiv.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center">
            <div>
                <h4>Recommended: ${bestLot.name}</h4>
                <p>Distance to ${dest}: <strong>${distance}</strong></p>
                <p>Available Spots: <strong>${bestLot.available}</strong></p>
            </div>
            <div style="font-size: 2rem; color: #3498db">
                <i class="fas fa-map-marked-alt"></i>
            </div>
        </div>
        <p style="font-size:0.8rem; color:#666; margin-top:10px">Walking path calculated via Main Walkway.</p>
    `;
}

// D. Weather Toggle
function toggleWeather() {
    isRaining = !isRaining;
    const btn = document.getElementById('weather-toggle');
    const txt = document.getElementById('weather-text');
    const icon = document.getElementById('weather-icon');
   
    if (isRaining) {
        txt.innerText = "Raining";
        icon.className = "fas fa-cloud-showers-heavy";
        btn.style.background = "#34495e";
    } else {
        txt.innerText = "Sunny";
        icon.className = "fas fa-sun";
        btn.style.background = "none";
    }
    
    // Trigger re-calc if result is open
    const resultDiv = document.getElementById('recommendation-result');
    if(!resultDiv.classList.contains('hidden')){
        findBestParking();
    }
}

// E. Find My Car (LocalStorage)
function saveMyCar() {
    const lot = document.getElementById('save-location-select').value;
    const note = document.getElementById('save-note').value;
    
    if (!lot) return alert("Please select a lot!");

    const data = {
        lot: lot,
        note: note,
        time: new Date().toLocaleTimeString()
    };
    
    localStorage.setItem('myCar', JSON.stringify(data));
    loadSavedCar();
}

function loadSavedCar() {
    const data = JSON.parse(localStorage.getItem('myCar'));
    const display = document.getElementById('saved-location-display');
    const saveBox = document.querySelector('.finder-box .form-group');
    const saveBtn = document.querySelector('.action-btn.save');

    if (data) {
        display.classList.remove('hidden');
        document.getElementById('saved-spot-name').innerText = data.lot;
        document.getElementById('saved-spot-note').innerText = data.note || "No specific bay noted";
        document.getElementById('saved-time').innerText = data.time;
        
        // Hide input form when saved
        saveBox.style.display = 'none';
        saveBtn.style.display = 'none';
    } else {
        display.classList.add('hidden');
        saveBox.style.display = 'block';
        saveBtn.style.display = 'block';
    }
}

function clearMyCar() {
    localStorage.removeItem('myCar');
    loadSavedCar();
}

// Utility: Switch Tabs
function switchTab(tabId, event) {
    if(event) event.preventDefault();
    
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    
    document.getElementById(tabId).classList.add('active');
    
    // Highlight button
    const buttons = document.querySelectorAll('.tab-btn');
    buttons.forEach(btn => {
        if(btn.onclick.toString().includes(tabId)) {
            btn.classList.add('active');
        }
    });
}

// Utility: Populate Select Options
function populateSelectOptions() {
    const select = document.getElementById('save-location-select');
    parkingData.forEach(lot => {
        let opt = document.createElement('option');
        opt.value = lot.name;
        opt.innerText = lot.name;
        select.appendChild(opt);
    });
}
