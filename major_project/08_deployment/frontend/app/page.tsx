"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

type Row = Record<string, any>;

const FALLBACK_MODELS: Row[] = [
  {
    Layer: "Layer 2a Econometric",
    Best_Model: "Pooled OLS",
    RMSE: 4.816,
    MAE: 2.755,
    R2: 0.206,
    ML_Improvement_Percent: "-"
  },
  {
    Layer: "Layer 2b ML",
    Best_Model: "Random Forest",
    RMSE: 4.709,
    MAE: 2.631,
    R2: 0.241,
    ML_Improvement_Percent: 2.22
  },
  {
    Layer: "Layer 3 LSTM",
    Best_Model: "LSTM",
    RMSE: 5.117,
    MAE: 2.771,
    R2: 0.104,
    ML_Improvement_Percent: "-"
  },
  {
    Layer: "EWS Classifier",
    Best_Model: "Extra Trees",
    RMSE: "-",
    MAE: "-",
    R2: "ROC-AUC 0.930",
    ML_Improvement_Percent: "-"
  }
];

function normalizeResponse(data: any): Row[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

async function fetchRows(endpoint: string): Promise<Row[]> {
  if (!API_BASE) throw new Error("NEXT_PUBLIC_API_URL is missing");

  const response = await fetch(`${API_BASE}${endpoint}`);
  if (!response.ok) throw new Error(`Failed to fetch ${endpoint}`);
  return normalizeResponse(await response.json());
}

async function fetchRowsSafe(endpoint: string, fallback: Row[] = []) {
  try {
    return await fetchRows(endpoint);
  } catch {
    return fallback;
  }
}

function formatNumber(value: any, digits = 3) {
  const num = Number(value);
  if (!Number.isFinite(num)) return value ?? "-";
  return num.toFixed(digits);
}

function shortCountry(name: string) {
  return String(name || "")
    .replace(", Islamic Republic of", "")
    .replace(", Republic of", "")
    .replace(", The", "")
    .slice(0, 28);
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

function DataTable({
  title,
  rows,
  columns
}: {
  title: string;
  rows: Row[];
  columns: string[];
}) {
  return (
    <section className="panel glass">
      {title ? <h2>{title}</h2> : null}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>No data available</td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={index}>
                  {columns.map((column) => (
                    <td key={column}>
                      {column === "Risk_Level" ? (
                        <RiskBadge value={row[column]} />
                      ) : typeof row[column] === "number" ? (
                        formatNumber(row[column], 3)
                      ) : (
                        row[column] ?? "-"
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function Home() {
  const [comparisonRows, setComparisonRows] = useState<Row[]>([]);
  const [topRisk, setTopRisk] = useState<Row[]>([]);
  const [lowRisk, setLowRisk] = useState<Row[]>([]);
  const [models, setModels] = useState<Row[]>(FALLBACK_MODELS);
  const [health, setHealth] = useState("Checking...");
  const [error, setError] = useState("");

  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedYear, setSelectedYear] = useState("2026");

  useEffect(() => {
    async function loadData() {
      try {
        const healthResponse = await fetch(`${API_BASE}/health`);
        setHealth(healthResponse.ok ? "Online" : "Issue detected");

        const [comparison, topRows, lowRows, modelRows] = await Promise.all([
          fetchRows("/comparison/imf-vs-forecast"),
          fetchRowsSafe("/ews/top-risk"),
          fetchRowsSafe("/ews/low-risk"),
          fetchRowsSafe("/models/summary", FALLBACK_MODELS)
        ]);

        setComparisonRows(comparison);
        setTopRisk(topRows);
        setLowRisk(lowRows);
        setModels(modelRows.length ? modelRows : FALLBACK_MODELS);

        const first2026 =
          comparison.find((row) => String(row.YEAR) === "2026")?.COUNTRY ||
          comparison[0]?.COUNTRY ||
          "";

        setSelectedCountry(first2026);
      } catch (err: any) {
        setError(err.message ?? "Could not load the forecast interface data");
      }
    }

    loadData();
  }, []);

  const countries = useMemo(() => {
    return Array.from(
      new Set(comparisonRows.map((row) => row.COUNTRY).filter(Boolean))
    ).sort();
  }, [comparisonRows]);

  const years = useMemo(() => {
    return Array.from(
      new Set(comparisonRows.map((row) => String(row.YEAR)).filter(Boolean))
    ).sort();
  }, [comparisonRows]);

  const selectedRow = useMemo(() => {
    return comparisonRows.find(
      (row) =>
        row.COUNTRY === selectedCountry && String(row.YEAR) === selectedYear
    );
  }, [comparisonRows, selectedCountry, selectedYear]);

  const countryTrend = useMemo(() => {
    return comparisonRows
      .filter((row) => row.COUNTRY === selectedCountry)
      .map((row) => ({
        year: String(row.YEAR),
        IMF: Number(row.IMF_GDP_Growth),
        Predicted: Number(row.Predicted_GDP_Growth)
      }))
      .filter(
        (row) => Number.isFinite(row.IMF) && Number.isFinite(row.Predicted)
      );
  }, [comparisonRows, selectedCountry]);

  const topRiskChart = topRisk.slice(0, 12).map((row) => ({
    country: shortCountry(row.COUNTRY),
    probability: Number(row.Crisis_Probability ?? 0)
  }));

  const lowRiskChart = lowRisk.slice(0, 12).map((row) => ({
    country: shortCountry(row.COUNTRY),
    probability: Number(row.Crisis_Probability ?? 0)
  }));

  return (
    <main>
      <section className="hero glass">
        <div>
          <p className="eyebrow">AI-Powered Macroeconomic Surveillance</p>
          <h1>Interactive GDP Forecast & Early Warning Interface</h1>
          <p className="hero-text">
            Select a country and year to view Random Forest GDP forecast, IMF
            projection comparison, crisis probability, risk category, and early
            warning status.
          </p>
        </div>

        <div className="status-card hover-lift">
          <span>Backend API</span>
          <strong>{health}</strong>
          <small>{API_BASE}</small>
        </div>
      </section>

      {error && <div className="error-box">{error}</div>}

      <section className="input-panel glass two-inputs">
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
      </section>

      <section className="metrics-grid">
        <MetricCard
          label="Predicted GDP Growth"
          value={
            selectedRow?.Predicted_GDP_Growth !== undefined
              ? `${formatNumber(selectedRow.Predicted_GDP_Growth, 2)}%`
              : "Not available"
          }
          subtitle="Random Forest forecast"
        />
        <MetricCard
          label="IMF Projection"
          value={
            selectedRow?.IMF_GDP_Growth !== undefined
              ? `${formatNumber(selectedRow.IMF_GDP_Growth, 2)}%`
              : "Not available"
          }
          subtitle="Projection-based comparison value"
        />
        <MetricCard
          label="Crisis Probability"
          value={
            selectedRow?.Crisis_Probability !== undefined
              ? formatNumber(selectedRow.Crisis_Probability, 3)
              : "Not available"
          }
          subtitle="EWS classifier score"
        />
        <MetricCard
          label="Risk Level"
          value={selectedRow?.Risk_Level ?? "Not available"}
          subtitle="Low / Moderate / High"
        />
      </section>

      <section className="chart-grid">
        <div className="panel glass hover-lift">
          <h2>Country Forecast Trend</h2>
          <p className="muted">
            Random Forest forecast compared with IMF projection for the selected
            country.
          </p>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={countryTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#24324d" />
                <XAxis dataKey="year" stroke="#cbd5e1" />
                <YAxis stroke="#cbd5e1" />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="IMF"
                  stroke="#22c55e"
                  strokeWidth={4}
                  dot={{ r: 6 }}
                  activeDot={{ r: 9 }}
                  animationDuration={1200}
                />
                <Line
                  type="monotone"
                  dataKey="Predicted"
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
          <p className="muted">Highest predicted crisis probabilities.</p>
          <div className="chart-box tall-chart">
            <ResponsiveContainer width="100%" height={430}>
              <BarChart data={topRiskChart} layout="vertical" margin={{ left: 30 }}>
                <XAxis type="number" domain={[0, 1]} stroke="#cbd5e1" />
                <YAxis
                  type="category"
                  dataKey="country"
                  stroke="#cbd5e1"
                  width={155}
                  interval={0}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip />
                <Bar dataKey="probability" animationDuration={1200}>
                  {topRiskChart.map((_, index) => (
                    <Cell key={index} fill="#ef4444" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="chart-grid">
        <DataTable
          title="Top 20 High-Risk Countries"
          rows={topRisk.slice(0, 20)}
          columns={[
            "COUNTRY",
            "YEAR",
            "Crisis_Probability",
            "Risk_Level",
            "Early_Warning_Flag"
          ]}
        />

        <div className="panel glass hover-lift">
          <h2>Top 20 Low-Risk Countries</h2>
          <div className="chart-box tall-chart">
            <ResponsiveContainer width="100%" height={430}>
              <BarChart data={lowRiskChart} layout="vertical" margin={{ left: 30 }}>
                <XAxis type="number" domain={[0, 1]} stroke="#cbd5e1" />
                <YAxis
                  type="category"
                  dataKey="country"
                  stroke="#cbd5e1"
                  width={155}
                  interval={0}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip />
                <Bar dataKey="probability" fill="#22c55e" animationDuration={1200} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <DataTable
        title="Top 20 Non-Crisis / Low-Risk Countries"
        rows={lowRisk.slice(0, 20)}
        columns={[
          "COUNTRY",
          "YEAR",
          "Crisis_Probability",
          "Risk_Level",
          "Early_Warning_Flag"
        ]}
      />

      <section className="panel glass interpretation-panel">
        <h2>AI-Style Interpretation</h2>
        <p>
          For <strong>{selectedCountry || "the selected country"}</strong> in{" "}
          <strong>{selectedYear}</strong>, the Random Forest model estimates GDP
          growth at{" "}
          <strong>
            {selectedRow?.Predicted_GDP_Growth !== undefined
              ? `${formatNumber(selectedRow.Predicted_GDP_Growth, 2)}%`
              : "not available"}
          </strong>
          , compared with the IMF projection value of{" "}
          <strong>
            {selectedRow?.IMF_GDP_Growth !== undefined
              ? `${formatNumber(selectedRow.IMF_GDP_Growth, 2)}%`
              : "not available"}
          </strong>
          . The early warning system assigns a crisis probability of{" "}
          <strong>
            {selectedRow?.Crisis_Probability !== undefined
              ? formatNumber(selectedRow.Crisis_Probability, 3)
              : "not available"}
          </strong>
          , placing the country in the{" "}
          <strong>{selectedRow?.Risk_Level ?? "not available"}</strong> risk
          category.
        </p>
      </section>

      <DataTable
        title="Model Comparison"
        rows={models}
        columns={[
          "Layer",
          "Best_Model",
          "RMSE",
          "MAE",
          "R2",
          "ML_Improvement_Percent"
        ]}
      />

      <section className="disclaimer glass">
        <p>
          <strong>* Disclaimer:</strong> Forecasts are model-based scenario
          estimates and do not account for sudden natural calamities, wars,
          pandemics, policy shocks, financial crises, or unexpected geopolitical
          events. These outputs should be interpreted as decision-support
          indicators, not guaranteed real-world outcomes.
        </p>
      </section>
    </main>
  );
}
