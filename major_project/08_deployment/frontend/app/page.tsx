"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Cell
} from "recharts";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

type Row = Record<string, any>;

function normalizeResponse(data: any): Row[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

async function fetchRows(endpoint: string): Promise<Row[]> {
  const response = await fetch(`${API_BASE}${endpoint}`);
  if (!response.ok) throw new Error(`Failed to fetch ${endpoint}`);
  return normalizeResponse(await response.json());
}

function formatNumber(value: any, digits = 3) {
  const num = Number(value);
  if (Number.isNaN(num)) return value ?? "-";
  return num.toFixed(digits);
}

function RiskBadge({ value }: { value: any }) {
  const risk = String(value ?? "").toLowerCase();
  let className = "badge neutral";
  if (risk.includes("high")) className = "badge high";
  if (risk.includes("moderate")) className = "badge moderate";
  if (risk.includes("low")) className = "badge low";
  return <span className={className}>{value ?? "Unknown"}</span>;
}

function MetricCard({ label, value, subtitle }: any) {
  return (
    <div className="metric-card hover-lift">
      <p>{label}</p>
      <h2>{value}</h2>
      <span>{subtitle}</span>
    </div>
  );
}

export default function Home() {
  const [topRisk, setTopRisk] = useState<Row[]>([]);
  const [lowRisk, setLowRisk] = useState<Row[]>([]);
  const [models, setModels] = useState<Row[]>([]);
  const [forecasts, setForecasts] = useState<Row[]>([]);
  const [health, setHealth] = useState("Checking...");
  const [error, setError] = useState("");

  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedYear, setSelectedYear] = useState("2026");
  const [selectedModel, setSelectedModel] = useState("Random Forest");

  useEffect(() => {
    async function loadData() {
      try {
        const healthResponse = await fetch(`${API_BASE}/health`);
        setHealth(healthResponse.ok ? "Online" : "Issue detected");

        const [topRiskRows, lowRiskRows, modelRows, forecastRows] =
          await Promise.all([
            fetchRows("/ews/top-risk"),
            fetchRows("/ews/low-risk"),
            fetchRows("/models/summary"),
            fetchRows("/forecasts/ml")
          ]);

        setTopRisk(topRiskRows);
        setLowRisk(lowRiskRows);
        setModels(modelRows);
        setForecasts(forecastRows);

        setSelectedCountry(forecastRows[0]?.COUNTRY ?? "");
      } catch (err: any) {
        setError(err.message ?? "Something went wrong");
      }
    }

    loadData();
  }, []);

  const countries = useMemo(() => {
    return Array.from(
      new Set(forecasts.map((row) => row.COUNTRY).filter(Boolean))
    ).sort();
  }, [forecasts]);

  const years = useMemo(() => {
    return Array.from(
      new Set(forecasts.map((row) => String(row.YEAR)).filter(Boolean))
    ).sort();
  }, [forecasts]);

  const selectedForecast = useMemo(() => {
    return forecasts.find(
      (row) =>
        row.COUNTRY === selectedCountry && String(row.YEAR) === selectedYear
    );
  }, [forecasts, selectedCountry, selectedYear]);

  const selectedRisk = useMemo(() => {
    return [...topRisk, ...lowRisk].find(
      (row) =>
        row.COUNTRY === selectedCountry && String(row.YEAR) === selectedYear
    );
  }, [topRisk, lowRisk, selectedCountry, selectedYear]);

  const countryForecastTrend = useMemo(() => {
    return forecasts
      .filter((row) => row.COUNTRY === selectedCountry)
      .map((row) => ({
        year: row.YEAR,
        value: Number(row[selectedModel] ?? 0)
      }));
  }, [forecasts, selectedCountry, selectedModel]);

  const topRiskChart = topRisk.slice(0, 10).map((row) => ({
    country: row.COUNTRY,
    probability: Number(row.Crisis_Probability ?? 0),
    risk: row.Risk_Level
  }));

  const forecastValue = selectedForecast?.[selectedModel];

  return (
    <main>
      <section className="hero glass">
        <div>
          <p className="eyebrow">AI-Powered Macroeconomic Surveillance</p>
          <h1>Interactive GDP Forecast & Early Warning System</h1>
          <p className="hero-text">
            Select a country, year, and model to generate a GDP growth forecast,
            crisis probability, and early-warning interpretation.
          </p>
        </div>

        <div className="status-card hover-lift">
          <span>Backend API</span>
          <strong>{health}</strong>
          <small>{API_BASE}</small>
        </div>
      </section>

      {error && <div className="error-box">{error}</div>}

      <section className="input-panel glass">
        <div>
          <label>Country</label>
          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
          >
            {countries.map((country) => (
              <option key={country}>{country}</option>
            ))}
          </select>
        </div>

        <div>
          <label>Forecast Year</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
          >
            {years.map((year) => (
              <option key={year}>{year}</option>
            ))}
          </select>
        </div>

        <div>
          <label>Model</label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
          >
            <option>Random Forest</option>
            <option>XGBoost</option>
            <option>Elastic Net</option>
          </select>
        </div>
      </section>

      <section className="metrics-grid">
        <MetricCard
          label="Predicted GDP Growth"
          value={
            forecastValue !== undefined
              ? `${formatNumber(forecastValue, 2)}%`
              : "Not found"
          }
          subtitle={`${selectedModel} estimate`}
        />
        <MetricCard
          label="Crisis Probability"
          value={
            selectedRisk?.Crisis_Probability !== undefined
              ? formatNumber(selectedRisk.Crisis_Probability, 3)
              : "Not found"
          }
          subtitle="Early warning classifier score"
        />
        <MetricCard
          label="Risk Level"
          value={selectedRisk?.Risk_Level ?? "Not found"}
          subtitle="Low / Moderate / High"
        />
        <MetricCard
          label="Warning Flag"
          value={selectedRisk?.Early_Warning_Flag ?? "Not found"}
          subtitle="1 means warning activated"
        />
      </section>

      <section className="chart-grid">
        <div className="panel glass hover-lift">
          <h2>Country Forecast Trend</h2>
          <p className="muted">
            Model-based GDP growth projection for the selected country.
          </p>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={countryForecastTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#24324d" />
                <XAxis dataKey="year" stroke="#cbd5e1" />
                <YAxis stroke="#cbd5e1" />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#38bdf8"
                  strokeWidth={4}
                  dot={{ r: 6 }}
                  activeDot={{ r: 9 }}
                  animationDuration={1200}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel glass hover-lift">
          <h2>Top Crisis Risk Countries</h2>
          <p className="muted">
            Hover over bars to inspect predicted crisis probability.
          </p>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topRiskChart} layout="vertical">
                <XAxis type="number" stroke="#cbd5e1" />
                <YAxis
                  type="category"
                  dataKey="country"
                  stroke="#cbd5e1"
                  width={120}
                />
                <Tooltip />
                <Bar dataKey="probability" animationDuration={1200}>
                  {topRiskChart.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={
                        entry.probability > 0.7
                          ? "#ef4444"
                          : entry.probability > 0.4
                          ? "#f59e0b"
                          : "#22c55e"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="panel glass interpretation-panel">
        <h2>AI-Style Interpretation</h2>
        <p>
          For <strong>{selectedCountry}</strong> in{" "}
          <strong>{selectedYear}</strong>, the selected model estimates GDP
          growth at{" "}
          <strong>
            {forecastValue !== undefined
              ? `${formatNumber(forecastValue, 2)}%`
              : "not available"}
          </strong>
          . The early warning system assigns a crisis probability of{" "}
          <strong>
            {selectedRisk?.Crisis_Probability !== undefined
              ? formatNumber(selectedRisk.Crisis_Probability, 3)
              : "not available"}
          </strong>
          , placing the country in the{" "}
          <strong>{selectedRisk?.Risk_Level ?? "unknown"}</strong> category.
          This combines predictive forecasting with risk surveillance, making
          the system useful for policy monitoring and decision support.
        </p>
      </section>

      <section className="panel glass">
        <h2>Model Comparison</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Layer</th>
                <th>Best Model</th>
                <th>RMSE</th>
                <th>MAE</th>
                <th>R²</th>
                <th>Improvement</th>
              </tr>
            </thead>
            <tbody>
              {models.map((row, index) => (
                <tr key={index}>
                  <td>{row.Layer}</td>
                  <td>{row.Best_Model}</td>
                  <td>{formatNumber(row.RMSE)}</td>
                  <td>{formatNumber(row.MAE)}</td>
                  <td>{formatNumber(row.R2)}</td>
                  <td>{formatNumber(row["ML_Improvement_%"], 2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}