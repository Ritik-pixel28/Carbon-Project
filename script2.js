
const CLIMATIQ_API_KEY = "2B0WTRP0995J706DWV5D0RN30R";

const EMISSION_FACTORS = {
    
    car: 0.170,
    bus: 0.080, 
    train: 0.040, 
    bike: 0.005, 

    
    veg: 1.5, 
    mixed: 3.0, 
    meat: 7.0, 
    
    
    electricity: 0.400 
};


let activities = JSON.parse(localStorage.getItem('carbonActivities')) || [];


function clearAllActivities() {
    localStorage.removeItem('carbonActivities');
    
    
    
    window.location.reload();
}

/**
 * Mocks the API call to calculate CO2 emissions based on activity type and amount.
 * In a real application, this would be an async function fetching data from a server.
 * * @param {string} type - 'transport', 'food', or 'energy'.
 * @param {object} data - Activity details.
 * @returns {number} The calculated CO2e in kg.
 */
function calculateEmission(type, data) {
    let factor;
    let amount;
    let description;

    if (type === 'transport') {
        factor = EMISSION_FACTORS[data.mode];
        amount = parseFloat(data.distance);
        description = `${data.mode.charAt(0).toUpperCase() + data.mode.slice(1)} - ${amount} km`;
    } else if (type === 'food') {
        factor = EMISSION_FACTORS[data.type];
        amount = parseFloat(data.amount);
        description = `${data.type.charAt(0).toUpperCase() + data.type.slice(1)} Diet - ${amount} kg`;
    } else if (type === 'energy') {
        factor = EMISSION_FACTORS.electricity; // Using a single factor for electricity
        amount = parseFloat(data.amount);
        description = `Electricity - ${amount} kWh`;
    }

    if (factor && amount) {
        return { 
            co2e: factor * amount, 
            description: description 
        };
    }
    return { co2e: 0, description: 'Error' };
}



const themeToggle = document.getElementById("themeToggle");

if (themeToggle) {
    
    const initialTheme = document.documentElement.getAttribute("data-theme") || 'dark';
    themeToggle.textContent = initialTheme === "dark" ? "🌙" : "☀️";

    themeToggle.addEventListener("click", () => {
        const currentTheme = document.documentElement.getAttribute("data-theme");

        if (currentTheme === "dark") {
            document.documentElement.setAttribute("data-theme", "light");
            themeToggle.textContent = "☀️";
            localStorage.setItem("theme", "light");
        } else {
            document.documentElement.setAttribute("data-theme", "dark");
            themeToggle.textContent = "🌙";
            localStorage.setItem("theme", "dark");
        }
    });
}


document.addEventListener('DOMContentLoaded', () => {
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme) {
        document.documentElement.setAttribute("data-theme", storedTheme);
        if (themeToggle) {
            themeToggle.textContent = storedTheme === "dark" ? "🌙" : "☀️";
        }
    }
});




let timelineChartInstance = null;
let breakdownChartInstance = null;

function updateDashboard() {
   
    const totalCO2e = activities.reduce((sum, a) => sum + a.co2e, 0);
    const totalTransport = activities.filter(a => a.category === 'transport').reduce((sum, a) => sum + a.co2e, 0);
    const totalFood = activities.filter(a => a.category === 'food').reduce((sum, a) => sum + a.co2e, 0);
    const totalEnergy = activities.filter(a => a.category === 'energy').reduce((sum, a) => sum + a.co2e, 0);
    
    const activitiesCount = activities.length;
   
    const oldestActivity = activities.length > 0 ? activities[0].id : Date.now();
    const daysSinceFirstLog = Math.ceil((Date.now() - oldestActivity) / (1000 * 60 * 60 * 24));
    const daysTracked = Math.max(1, daysSinceFirstLog); 
    const dailyAverage = totalCO2e / daysTracked;

    const co2eElement = document.querySelector('.dash-card:nth-child(1) .value');
    if (co2eElement) co2eElement.textContent = `${totalCO2e.toFixed(2)} kg`;

    const dailyAvgElement = document.querySelector('.dash-card:nth-child(2) .value');
    if (dailyAvgElement) dailyAvgElement.textContent = `${dailyAverage.toFixed(2)} kg`;

    const activitiesLoggedElement = document.querySelector('.dash-card:nth-child(3) .value');
    if (activitiesLoggedElement) activitiesLoggedElement.textContent = activitiesCount;

    
    const transportCard = document.querySelector('.dash-card.transport .value');
    const foodCard = document.querySelector('.dash-card.food .value');
    const energyCard = document.querySelector('.dash-card.energy .value');
    
    if (transportCard) transportCard.textContent = `${totalTransport.toFixed(2)} kg`;
    if (foodCard) foodCard.textContent = `${totalFood.toFixed(2)} kg`;
    if (energyCard) energyCard.textContent = `${totalEnergy.toFixed(2)} kg`;

   
    const updatePercent = (selector, total) => {
        const percent = totalCO2e > 0 ? (total / totalCO2e) * 100 : 0;
        const smallEl = document.querySelector(selector).nextElementSibling;
        if (smallEl) smallEl.textContent = `${percent.toFixed(0)}% of total`;
    };

    updatePercent('.dash-card.transport .value', totalTransport);
    updatePercent('.dash-card.food .value', totalFood);
    updatePercent('.dash-card.energy .value', totalEnergy);


    
    const historySection = document.getElementById('activityHistoryBox');
    if (historySection) {
       
        historySection.innerHTML = `<h3 class="box-header">Activity History</h3>`; 

        const historyHTML = activities.length > 0
            ? activities.map(a => `<p style="margin-top: 10px; font-size: 0.95rem;"><strong>${a.category.toUpperCase()}</strong>: ${a.description} — <span style="font-weight: 600;">${a.co2e.toFixed(2)} kg CO₂e</span></p>`).join('')
            : '<p class="empty-msg">No activities tracked yet</p>';
        
        historySection.innerHTML += historyHTML;
    }

    updateTimelineChart();
    updateBreakdownChart(totalTransport, totalFood, totalEnergy);
}


function updateTimelineChart() {
    const ctx = document.getElementById("timelineChart");
    if (!ctx) return;

    if (timelineChartInstance) {
        timelineChartInstance.destroy();
    }
    
    
    const mockTimelineData = {
        'Transport': [2.5, 3.1, 2.0, 4.5, 3.0, 5.2, 3.8],
        'Food': [1.5, 1.8, 1.3, 2.0, 1.7, 2.5, 2.1],
        'Energy': [0.8, 0.9, 0.7, 1.0, 0.9, 1.1, 1.0]
    };

    
    const transportData = activities.filter(a => a.category === 'transport').map(a => a.co2e);
    const foodData = activities.filter(a => a.category === 'food').map(a => a.co2e);
    const energyData = activities.filter(a => a.category === 'energy').map(a => a.co2e);
    
    const allData = activities.map(a => a.co2e);

    
    const chartData = activities.length > 0 ? {
       
        labels: activities.map((a, i) => `${a.category.slice(0, 1).toUpperCase()}${i + 1}`),
        datasets: [
            
            { 
                label: "Total Emissions per Entry", 
                data: allData, 
                borderColor: "#16a34a", 
                tension: 0.3, 
                fill: false,
                backgroundColor: 'rgba(22, 163, 74, 0.5)' 
            }
           
        ]
    } : {
        
        labels: ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6", "Day 7"],
        datasets: [
            { label: "Transport (Mock)", data: mockTimelineData.Transport, borderColor: "#16a34a", tension: 0.3, fill: false },
            { label: "Food (Mock)", data: mockTimelineData.Food, borderColor: "#facc15", tension: 0.3, fill: false },
            { label: "Energy (Mock)", data: mockTimelineData.Energy, borderColor: "#3b82f6", tension: 0.3, fill: false }
        ]
    };
    
    timelineChartInstance = new Chart(ctx, {
        type: "line",
        data: chartData,
        options: { 
            responsive: true,
            scales: {
                y: {
                    title: {
                        display: true,
                        text: 'CO₂e (kg)'
                    }
                }
            }
        }
    });
}

function updateBreakdownChart(transport, food, energy) {
    const breakdownBox = document.querySelector('.dual-box .box:last-child');
    if (!breakdownBox) return;

    const breakdownCanvasId = "breakdownChart";
    let canvasEl = document.getElementById(breakdownCanvasId);

   
    if (breakdownChartInstance) {
        breakdownChartInstance.destroy();
    }

    const total = transport + food + energy;

    
    if (total > 0) {
        
        const emptyMsg = breakdownBox.querySelector('.empty-msg');
        if (emptyMsg) emptyMsg.remove();

       
        if (!canvasEl) {
            canvasEl = document.createElement('canvas');
            canvasEl.id = breakdownCanvasId;
           
            if (!breakdownBox.querySelector('.box-header')) {
                 breakdownBox.innerHTML = `<div class="box-header"><h3>Category Breakdown</h3></div>`;
            } else if (breakdownBox.children.length === 1) {
                 breakdownBox.innerHTML += canvasEl;
            }
             breakdownBox.appendChild(canvasEl);
        }

        const data = {
            labels: ['Transport', 'Food', 'Energy'],
            datasets: [{
                label: 'CO₂e Contribution (kg)',
                data: [transport, food, energy],
                backgroundColor: [
                    '#16a34a', 
                    '#facc15', 
                    '#3b82f6'  
                ],
                hoverOffset: 4
            }]
        };

        breakdownChartInstance = new Chart(canvasEl, {
            type: 'bar', 
            data: data,
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: 'Category Breakdown by CO₂e'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'CO₂e (kg)'
                        }
                    }
                }
            }
        });
    } else {
        
        if (canvasEl) canvasEl.remove();
        if (!breakdownBox.querySelector('.empty-msg')) {
             breakdownBox.innerHTML = `<div class="box-header"><h3>Category Breakdown</h3></div><p class="empty-msg">No data available yet.<br>Start tracking activities to see your breakdown.</p>`;
        }
    }
}



document.addEventListener('DOMContentLoaded', () => {
    if (document.title.includes('CarbonTrack')) { 
        updateDashboard();
    }
});




const chipButtons = document.querySelectorAll('.chip');

chipButtons.forEach(button => {
  button.addEventListener('click', () => {
    
    chipButtons.forEach(btn => {
      btn.classList.remove('active');
    });
    
    button.classList.add('active');
  });
});




const form = document.getElementById("calcForm");



if (form) {
    form.addEventListener("submit", (e) => {
        e.preventDefault();

        const msgBox = document.getElementById("calcMessage");
        msgBox.style.display = "none"; 

       
        const transportMode = document.getElementById("transport").value;
        const distance = document.getElementById("distance").value;
        const foodType = document.getElementById("food").value;
        const meals = document.getElementById("meals").value;
        const electricity = document.getElementById("electricity").value;

        let newActivities = [];

        
        if (distance > 0) {
            const data = { mode: transportMode, distance };
            const { co2e, description } = calculateEmission("transport", data);
            newActivities.push({ id: Date.now(), category: "transport", data, co2e, description });
        }

        if (meals > 0) {
            const data = { type: foodType, amount: meals };
            const { co2e, description } = calculateEmission("food", data);
            newActivities.push({ id: Date.now() + 1, category: "food", data, co2e, description });
        }

        if (electricity > 0) {
            const data = { amount: electricity };
            const { co2e, description } = calculateEmission("energy", data);
            newActivities.push({ id: Date.now() + 2, category: "energy", data, co2e, description });
        }

        
        if (newActivities.length > 0) {
            activities = [...activities, ...newActivities];
            localStorage.setItem("carbonActivities", JSON.stringify(activities));

            const total = newActivities.reduce((sum, a) => sum + a.co2e, 0).toFixed(2);

           
            msgBox.innerHTML = `Total emissions added: <b>${total} kg CO₂e</b>`;
            msgBox.style.display = "block";

            
            setTimeout(() => {
                window.location.href = "index.html";
            }, 1500);

        } else {
            msgBox.innerHTML = `Please enter valid activity data.`;
            msgBox.style.color = "red";
            msgBox.style.display = "block";
        }
    });
}
