import React, { useState, useRef, useEffect } from "react";
import "./index.css";

const Calculator = () => {
  // --- Emission Factors ---
  const FACTORS = {
    car: { petrol: 0.192, diesel: 0.171, ev: 0.05 },
    public_transport: 0.041,
    flight_short: 150,
    flight_long: 900,
    electricity_grid: 0.45,
    heating: { gas: 0.2, electric: 0.45, heatpump: 0.07 },
    diet: { omnivore: 2900, average: 2100, vegetarian: 1500, vegan: 1200 },
    food_waste: 0.5,
  };

  // --- State ---
  const [inputs, setInputs] = useState({
    car_km_week: 120,
    car_fuel: "petrol",
    pt_km_week: 20,
    flights_short: 1,
    flights_long: 0,
    elec_kwh_month: 250,
    heating_type: "gas",
    diet_type: "average",
    food_waste: 4,
  });

  const [result, setResult] = useState({
    total: null,
    breakdown: {},
    suggestions: [],
    context: "Enter your details and click Calculate.",
  });

  const canvasRef = useRef(null);

  // --- Helpers ---
  const toNum = (v) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  };

  // --- Handlers ---
  const handleChange = (e) => {
    const { id, value } = e.target;
    setInputs((prev) => ({ ...prev, [id]: value }));
  };

  const round = (v) => Math.round(v * 10) / 10;

  const calculate = () => {
    const {
      car_km_week,
      car_fuel,
      pt_km_week,
      flights_short,
      flights_long,
      elec_kwh_month,
      heating_type,
      diet_type,
      food_waste,
    } = inputs;

    // Travel
    const car_annual =
      toNum(car_km_week) * 52 * (FACTORS.car[car_fuel] || FACTORS.car.petrol);
    const pt_annual = toNum(pt_km_week) * 52 * FACTORS.public_transport;
    const flights_annual =
      toNum(flights_short) * FACTORS.flight_short +
      toNum(flights_long) * FACTORS.flight_long;

    // Home
    const elec_annual = toNum(elec_kwh_month) * 12 * FACTORS.electricity_grid;
    const heating_annual =
      toNum(elec_kwh_month) *
      0.5 *
      12 *
      (FACTORS.heating[heating_type] || FACTORS.heating.gas);

    // Diet
    const diet_annual = FACTORS.diet[diet_type] || FACTORS.diet.average;
    const food_waste_annual = toNum(food_waste) * 12 * FACTORS.food_waste;

    // Breakdown
    const breakdown = {
      "Car (annual kg CO₂)": round(car_annual),
      "Public Transport (annual kg CO₂)": round(pt_annual),
      "Flights (annual kg CO₂)": round(flights_annual),
      "Electricity (annual kg CO₂)": round(elec_annual),
      "Heating (annual kg CO₂ est.)": round(heating_annual),
      "Diet (annual kg CO₂ est.)": round(diet_annual),
      "Food waste (annual kg CO₂)": round(food_waste_annual),
    };

    const total = Object.values(breakdown).reduce((a, b) => a + b, 0);

    const context = contextText(total);
    const suggestions = generateSuggestions(breakdown);

    setResult({ total: round(total), breakdown, suggestions, context });
  };

  const contextText = (total) => {
    if (total < 2000)
      return "Good — your footprint is relatively low vs global averages.";
    if (total < 5000)
      return "Average — there are several easy wins to reduce it.";
    return "High — consider changes in travel, electricity source, and diet to reduce emissions.";
  };

  const generateSuggestions = (breakdown) => {
    const suggestions = [];
    if (breakdown["Car (annual kg CO₂)"] > 1000) {
      suggestions.push(
        "Consider carpooling, switching to public transport, or switching to an EV."
      );
    } else {
      suggestions.push(
        "Your car emissions are relatively low — maintain efficient driving habits."
      );
    }
    if (breakdown["Flights (annual kg CO₂)"] > 300) {
      suggestions.push(
        "Reduce flights where possible or choose fewer long-haul trips; compensate emissions if needed."
      );
    }
    if (breakdown["Electricity (annual kg CO₂)"] > 1200) {
      suggestions.push(
        "Lower electricity use and consider switching to a renewable tariff or rooftop solar."
      );
    } else {
      suggestions.push(
        "Keep optimizing appliance efficiency (LEDs, smart thermostats)."
      );
    }
    if (breakdown["Diet (annual kg CO₂ est.)"] > 2000) {
      suggestions.push(
        "Try reducing red meat and replacing with plant-based proteins a few times a week."
      );
    } else {
      suggestions.push(
        "Maintain your sustainable diet habits and reduce food waste."
      );
    }
    if (breakdown["Food waste (annual kg CO₂)"] > 50) {
      suggestions.push(
        "Reduce food waste: plan meals, freeze leftovers, and compost when possible."
      );
    }
    return suggestions;
  };

  const handleReset = () => {
    setInputs({
      car_km_week: 120,
      car_fuel: "petrol",
      pt_km_week: 20,
      flights_short: 1,
      flights_long: 0,
      elec_kwh_month: 250,
      heating_type: "gas",
      diet_type: "average",
      food_waste: 4,
    });
    setResult({
      total: null,
      breakdown: {},
      suggestions: [],
      context: "Enter your details and click Calculate.",
    });
    const ctx = canvasRef.current?.getContext("2d");
    ctx && ctx.clearRect(0, 0, 600, 120);
  };

  const handleDownload = () => {
    if (!result.total) return;
    const content = [
      "Eco Calculator — Report",
      "-----------------------",
      `Estimate: ${result.total} kg CO₂ / year`,
      "",
      "Breakdown:",
      ...Object.entries(result.breakdown).map(([k, v]) => `${k}: ${v} kg`),
      "",
      "Suggestions:",
      ...result.suggestions,
    ].join("\n");

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "eco_report.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  // --- Draw Chart ---
  useEffect(() => {
    if (!result.total) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const breakdown = result.breakdown;
    const labels = Object.keys(breakdown);
    const values = Object.values(breakdown);
    const max = Math.max(...values, 1);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const padding = 10;
    const barAreaWidth = canvas.width - padding * 2;
    const barHeight = (canvas.height - padding * 2) / labels.length;

    labels.forEach((label, i) => {
      const v = values[i];
      const w = (v / max) * (barAreaWidth * 0.8);
      const y = padding + i * barHeight;
      ctx.fillStyle = "#0b7fa2";
      ctx.fillRect(padding, y + 6, w, barHeight - 12);
      ctx.fillStyle = "#163238";
      ctx.font = "12px Inter, Arial";
      ctx.fillText(`${label} — ${v} kg`, padding + w + 8, y + barHeight / 2 + 4);
    });
  }, [result]);

  return (
    <main className="container">
      <header>
        <h1>Eco Calculator</h1>
        <p className="lead">
          Estimate your annual carbon footprint and get easy suggestions to
          reduce it.
        </p>
      </header>

      <form className="card" onSubmit={(e) => e.preventDefault()}>
        {/* Travel Section */}
        <section>
          <h2>Travel</h2>
          <div className="row">
            <label>
              Car km per week
              <input
                id="car_km_week"
                type="number"
                value={inputs.car_km_week}
                onChange={handleChange}
              />
            </label>
            <label>
              Fuel type
              <select
                id="car_fuel"
                value={inputs.car_fuel}
                onChange={handleChange}
              >
                <option value="petrol">Petrol</option>
                <option value="diesel">Diesel</option>
                <option value="ev">Electric (EV)</option>
              </select>
            </label>
          </div>
          <div className="row">
            <label>
              Public transport km/week
              <input
                id="pt_km_week"
                type="number"
                value={inputs.pt_km_week}
                onChange={handleChange}
              />
            </label>
            <label>
              Flights (short-haul/year)
              <input
                id="flights_short"
                type="number"
                value={inputs.flights_short}
                onChange={handleChange}
              />
            </label>
            <label>
              Flights (long-haul/year)
              <input
                id="flights_long"
                type="number"
                value={inputs.flights_long}
                onChange={handleChange}
              />
            </label>
          </div>
        </section>

        {/* Home */}
        <section>
          <h2>Home Energy</h2>
          <div className="row">
            <label>
              Electricity kWh/month
              <input
                id="elec_kwh_month"
                type="number"
                value={inputs.elec_kwh_month}
                onChange={handleChange}
              />
            </label>
            <label>
              Heating type
              <select
                id="heating_type"
                value={inputs.heating_type}
                onChange={handleChange}
              >
                <option value="gas">Gas</option>
                <option value="electric">Electric</option>
                <option value="heatpump">Heat Pump</option>
              </select>
            </label>
          </div>
        </section>

        {/* Diet */}
        <section>
          <h2>Diet</h2>
          <div className="row">
            <label>
              Diet type
              <select
                id="diet_type"
                value={inputs.diet_type}
                onChange={handleChange}
              >
                <option value="omnivore">Omnivore</option>
                <option value="average">Average</option>
                <option value="vegetarian">Vegetarian</option>
                <option value="vegan">Vegan</option>
              </select>
            </label>
            <label>
              Food waste (kg/month)
              <input
                id="food_waste"
                type="number"
                value={inputs.food_waste}
                onChange={handleChange}
              />
            </label>
          </div>
        </section>

        <div className="actions">
          <button type="button" onClick={calculate}>
            Calculate
          </button>
          <button type="button" className="muted" onClick={handleReset}>
            Reset
          </button>
          <button type="button" className="muted" onClick={handleDownload}>
            Download Report
          </button>
        </div>
      </form>

      <aside className="card results">
        <h2>Your Estimate</h2>
        <p className="big">
          {result.total ? `${result.total} kg CO₂ / year` : "— kg CO₂ / year"}
        </p>
        <p>{result.context}</p>

        {result.total && (
          <>
            <h3>Breakdown</h3>
            <ul>
              {Object.entries(result.breakdown).map(([k, v]) => (
                <li key={k}>
                  {k}: {v.toLocaleString()} kg
                </li>
              ))}
            </ul>

            <h3>Suggestions</h3>
            <ul>
              {result.suggestions.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </>
        )}
      </aside>

      <canvas
        ref={canvasRef}
        width="600"
        height="120"
        className={!result.total ? "hidden" : ""}
      ></canvas>

      <footer>
        <small>
          Estimates are indicative. Use them to compare choices and find ways to
          reduce emissions.
        </small>
      </footer>
    </main>
  );
};

export default Calculator;
