
(() => {
  // --- Emission factors (approximate & indicative) ---
  // You can tune these to match local grid intensity or authoritative sources.
  const FACTORS = {
    car: { petrol: 0.192, diesel: 0.171, ev: 0.050 }, // kg CO2 per km (EV value depends on grid)
    public_transport: 0.041, // average bus/train kg CO2 per passenger km
    flight_short: 150, // kg CO2 per short-haul flight (per trip) - rough avg
    flight_long: 900, // kg CO2 per long-haul flight (per trip) - rough avg
    electricity_grid: 0.45, // kg CO2 per kWh (global average; change by country)
    heating: { gas: 0.2, electric: 0.45, heatpump: 0.07 }, // kgCO2 per kWh-equivalent
    diet: { omnivore: 2900, average: 2100, vegetarian: 1500, vegan: 1200 }, // kg CO2 per year baseline
    food_waste: 0.5 // kgCO2 per kg food wasted per month -> per month to annual
  };

  // --- Helpers ---
  const $ = id => document.getElementById(id);
  const toNum = (v) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  };

  // --- Elements ---
  const form = $('eco-form');
  const calcBtn = $('calculateBtn');
  const resetBtn = $('resetBtn');
  const downloadBtn = $('downloadBtn');

  const totalKgEl = $('totalKg');
  const contextEl = $('context');
  const breakdownList = $('breakdownList');
  const suggestionsList = $('suggestionsList');

  // --- Calculation ---
  function calculate() {
    // Travel
    const car_km_week = toNum($('car_km_week').value);
    const car_fuel = $('car_fuel').value;
    const pt_km_week = toNum($('pt_km_week').value);
    const flights_short = toNum($('flights_short').value);
    const flights_long = toNum($('flights_long').value);

    // Home
    const elec_kwh_month = toNum($('elec_kwh_month').value);
    const heating_type = $('heating_type').value;

    // Diet
    const diet_type = $('diet_type').value;
    const food_waste_kg_month = toNum($('food_waste').value);

    // Compute annualized components
    const car_annual = car_km_week * 52 * (FACTORS.car[car_fuel] || FACTORS.car.petrol);
    const pt_annual = pt_km_week * 52 * FACTORS.public_transport;
    const flights_annual = flights_short * FACTORS.flight_short + flights_long * FACTORS.flight_long;

    const elec_annual = elec_kwh_month * 12 * FACTORS.electricity_grid;
    // heating: assume kWh/month equivalent roughly matches electricity units; keep simple
    const heating_annual = elec_kwh_month * 0.5 * 12 * (FACTORS.heating[heating_type] || FACTORS.heating.gas);

    const diet_annual = FACTORS.diet[diet_type] || FACTORS.diet.average;
    const food_waste_annual = food_waste_kg_month * 12 * FACTORS.food_waste;

    const breakdown = {
      "Car (annual kg CO₂)": round(car_annual),
      "Public Transport (annual kg CO₂)": round(pt_annual),
      "Flights (annual kg CO₂)": round(flights_annual),
      "Electricity (annual kg CO₂)": round(elec_annual),
      "Heating (annual kg CO₂ est.)": round(heating_annual),
      "Diet (annual kg CO₂ est.)": round(diet_annual),
      "Food waste (annual kg CO₂)": round(food_waste_annual)
    };

    const total = Object.values(breakdown).reduce((a,b)=>a+b,0);

    // Render
    renderResult(total, breakdown);
  }

  function round(v){ return Math.round(v*10)/10; }

  function renderResult(total, breakdown) {
    totalKgEl.textContent = `${round(total).toLocaleString()} kg CO\u2082 / year`;
    contextEl.textContent = contextText(total);
    breakdownList.innerHTML = '';
    suggestionsList.innerHTML = '';

    // breakdown list
    for (const [k,v] of Object.entries(breakdown)) {
      const li = document.createElement('li');
      li.textContent = `${k}: ${v.toLocaleString()} kg`;
      breakdownList.appendChild(li);
    }

    // suggestions
    const suggestions = generateSuggestions(breakdown);
    suggestions.forEach(s => {
      const li = document.createElement('li');
      li.textContent = s;
      suggestionsList.appendChild(li);
    });

    // Optional: draw a tiny bar chart
    drawChart(breakdown);
  }

  function contextText(total) {
    // Simple categorization (values are indicative only)
    if (total < 2000) return "Good — your footprint is relatively low vs global averages.";
    if (total < 5000) return "Average — there are several easy wins to reduce it.";
    return "High — consider changes in travel, electricity source, and diet to reduce emissions.";
  }

  function generateSuggestions(breakdown) {
    const suggestions = [];
    if (breakdown["Car (annual kg CO₂)"] > 1000) {
      suggestions.push("Consider carpooling, switching to public transport, or switching to an EV.");
    } else {
      suggestions.push("Your car emissions are relatively low — maintain efficient driving habits.");
    }
    if (breakdown["Flights (annual kg CO₂)"] > 300) {
      suggestions.push("Reduce flights where possible or choose fewer long-haul trips; compensate emissions if needed.");
    }
    if (breakdown["Electricity (annual kg CO₂)"] > 1200) {
      suggestions.push("Lower electricity use and consider switching to a renewable tariff or rooftop solar.");
    } else {
      suggestions.push("Keep optimizing appliance efficiency (LEDs, smart thermostats).");
    }
    if (breakdown["Diet (annual kg CO₂ est.)"] > 2000) {
      suggestions.push("Try reducing red meat and replacing with plant-based proteins a few times a week.");
    } else {
      suggestions.push("Maintain your sustainable diet habits and reduce food waste.");
    }
    if (breakdown["Food waste (annual kg CO₂)"] > 50) {
      suggestions.push("Reduce food waste: plan meals, freeze leftovers, and compost when possible.");
    }
    return suggestions;
  }

  // --- Tiny canvas bar chart ---
  function drawChart(breakdown) {
    const canvas = document.getElementById('chart');
    const ctx = canvas.getContext('2d');
    // Show canvas on small screens as well
    canvas.classList.remove('hidden');

    const labels = Object.keys(breakdown);
    const values = Object.values(breakdown);
    const max = Math.max(...values, 1);

    // clear
    ctx.clearRect(0,0,canvas.width,canvas.height);

    const padding = 10;
    const barAreaWidth = canvas.width - padding*2;
    const barHeight = (canvas.height - padding*2) / labels.length;

    // draw bars
    labels.forEach((label, i) => {
      const v = values[i];
      const w = (v/max) * (barAreaWidth * 0.8);
      const y = padding + i*barHeight;
      // bar
      ctx.fillStyle = '#0b7fa2';
      ctx.fillRect(padding, y + 6, w, barHeight - 12);
      // label
      ctx.fillStyle = '#163238';
      ctx.font = '12px Inter, Arial';
      ctx.fillText(`${label} — ${v} kg`, padding + w + 8, y + (barHeight/2)+4);
    });
  }

  // --- Download report as simple text ---
  function downloadReport() {
    const totalText = totalKgEl.textContent;
    const breakdownItems = Array.from(breakdownList.children).map(li => li.textContent);
    const suggestions = Array.from(suggestionsList.children).map(li => li.textContent);

    const content = [
      "Eco Calculator — Report",
      "-----------------------",
      `Estimate: ${totalText}`,
      "",
      "Breakdown:",
      ...breakdownItems,
      "",
      "Suggestions:",
      ...suggestions
    ].join("\n");

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'eco_report.txt';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // --- Reset ---
  function resetForm() {
    form.reset();
    totalKgEl.textContent = "— kg CO₂ / year";
    contextEl.textContent = "Enter your details and click Calculate.";
    breakdownList.innerHTML = '';
    suggestionsList.innerHTML = '';
    document.getElementById('chart').classList.add('hidden');
  }

  // --- Event listeners ---
  calcBtn.addEventListener('click', calculate);
  resetBtn.addEventListener('click', resetForm);
  downloadBtn.addEventListener('click', downloadReport);

  // Populate form with some sensible defaults
  function populateDefaults() {
    $('car_km_week').value = 120;
    $('car_fuel').value = 'petrol';
    $('pt_km_week').value = 20;
    $('flights_short').value = 1;
    $('flights_long').value = 0;
    $('elec_kwh_month').value = 250;
    $('heating_type').value = 'gas';
    $('diet_type').value = 'average';
    $('food_waste').value = 4;
  }

  populateDefaults();
})();
