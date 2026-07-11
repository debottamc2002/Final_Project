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
  { Layer: "Layer 2a Econometric", Best_Model: "Pooled OLS", RMSE: 4.816, MAE: 2.755, R2: 0.206, ML_Improvement_Percent: "-" },
  { Layer: "Layer 2b ML", Best_Model: "Random Forest", RMSE: 4.709, MAE: 2.631, R2: 0.241, ML_Improvement_Percent: 2.22 },
  { Layer: "Layer 3 LSTM", Best_Model: "LSTM", RMSE: 5.117, MAE: 2.771, R2: 0.104, ML_Improvement_Percent: "-" },
  { Layer: "EWS Classifier", Best_Model: "Extra Trees", RMSE: "-", MAE: "-", R2: "ROC-AUC 0.930", ML_Improvement_Percent: "-" }
];

function normalizeResponse(data: any): Row[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

async function fetchRows(endpoint: string): Promise<Row[]> {
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

function formatNumber(value: any, digits = 2) {
  const num = Number(value);
  if (!Number.isFinite(num)) return value ?? "-";
  return num.toFixed(digits);
}

function formatYear(value: any) {
  const year = Number(value);
  if (!Number.isFinite(year)) return value ?? "-";
  return String(Math.trunc(year));
}

function yearColor(year: any) {
  const key = String(Math.trunc(Number(year)));
  if (key === "2024") return "#38bdf8";
  if (key === "2025") return "#a855f7";
  if (key === "2026") return "#f97316";
  return "#22c55e";
}

function shortCountry(name: string) {
  return String(name || "")
    .replace(", Islamic Republic of", "")
    .replace(", Republic of", "")
    .replace(", The", "")
    .slice(0, 24);
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

function DataTable({ title, rows, columns }: { title: string; rows: Row[]; columns: string[] }) {
  return (
    <section className="panel glass">
      <h2>{title}</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {columns.map((col) => <th key={col}>{col}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={columns.length}>No data available</td></tr>
            ) : rows.map((row, index) => (
              <tr key={index}>
                {columns.map((col) => (
                  <td key={col}>
                    {col === "Risk_Level" ? (
                      <RiskBadge value={row[col]} />
                    ) : typeof row[col] === "number" ? (
                      col === "YEAR" ? formatYear(row[col]) : formatNumber(row[col], 3)
                    ) : row[col] ?? "-"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function ScenarioPage() {
  const [comparison, setComparison] = useState<Row[]>([]);
  const [topRisk, setTopRisk] = useState<Row[]>([]);
  const [lowRisk, setLowRisk] = useState<Row[]>([]);
  const [models, setModels] = useState<Row[]>(FALLBACK_MODELS);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedYear, setSelectedYear] = useState("2026");
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [comparisonRows, topRows, lowRows, modelRows] = await Promise.all([
          fetchRows("/comparison/imf-vs-forecast"),
          fetchRows("/ews/top-risk"),
          fetchRows("/ews/low-risk"),
          fetchRowsSafe("/models/summary", FALLBACK_MODELS)
        ]);

        setComparison(comparisonRows);
        setTopRisk(topRows);
        setLowRisk(lowRows);
        setModels(
          modelRows.length
            ? modelRows.map((row) => ({
                ...row,
                ML_Improvement_Percent: row.ML_Improvement_Percent ?? row["ML_Improvement_%"]
              }))
            : FALLBACK_MODELS
        );

        const firstCountry =
          comparisonRows.find((row) => String(row.YEAR) === "2026")?.COUNTRY ||
          comparisonRows[0]?.COUNTRY ||
          "";
        setSelectedCountry(firstCountry);
      } catch (err: any) {
        setError(err.message ?? "Something went wrong");
      }
    }

    load();
  }, []);

  const countries = useMemo(() => {
    return Array.from(new Set(comparison.map((row) => row.COUNTRY).filter(Boolean))).sort();
  }, [comparison]);

  const years = useMemo(() => {
    return Array.from(new Set(comparison.map((row) => formatYear(row.YEAR)).filter(Boolean))).sort();
  }, [comparison]);

  const selectedRow = useMemo(() => {
    return comparison.find(
      (row) => row.COUNTRY === selectedCountry && formatYear(row.YEAR) === selectedYear
    );
  }, [comparison, selectedCountry, selectedYear]);

  const countryTrend = useMemo(() => {
    return comparison
      .filter((row) => row.COUNTRY === selectedCountry)
      .map((row) => ({
        year: formatYear(row.YEAR),
        IMF: Number(row.IMF_GDP_Growth),
        Predicted: Number(row.Predicted_GDP_Growth)
      }))
      .filter((row) => Number.isFinite(row.IMF) && Number.isFinite(row.Predicted));
  }, [comparison, selectedCountry]);

  const errorChart = useMemo(() => {
    return comparison
      .map((row) => ({
        label: `${shortCountry(row.COUNTRY)} (${formatYear(row.YEAR)})`,
        year: formatYear(row.YEAR),
        error: Math.abs(Number(row.Prediction_Error ?? 0))
      }))
      .sort((a, b) => b.error - a.error)
      .slice(0, 15);
  }, [comparison]);

  const highRiskChart = topRisk.slice(0, 15).map((row) => ({
    label: `${shortCountry(row.COUNTRY)} (${formatYear(row.YEAR)})`,
    year: formatYear(row.YEAR),
    probability: Number(row.Crisis_Probability ?? 0)
  }));

  const lowRiskChart = lowRisk.slice(0, 15).map((row) => ({
    label: `${shortCountry(row.COUNTRY)} (${formatYear(row.YEAR)})`,
    year: formatYear(row.YEAR),
    probability: Number(row.Crisis_Probability ?? 0)
  }));

  return (
    <main>
      <section className="hero glass single-hero">
        <div>
          <p className="eyebrow">2024-2026 IMF Projection Scenario</p>
          <h1>Macroeconomic Forecast & Early Warning Dashboard</h1>
          <p className="hero-text">
            Select a country and forecast year to view predicted GDP growth,
            IMF projection comparison, crisis probability, risk level, and
            early-warning rankings.
          </p>
        </div>
      </section>

      {error && <div className="error-box">{error}</div>}

      <section className="year-legend glass">
        <span><i className="legend-2024" /> 2024</span>
        <span><i className="legend-2025" /> 2025</span>
        <span><i className="legend-2026" /> 2026</span>
      </section>

      <section className="input-panel glass two-inputs">
        <div>
          <label>Select Country</label>
          <select value={selectedCountry} onChange={(event) => setSelectedCountry(event.target.value)}>
            {countries.map((country) => <option key={country}>{country}</option>)}
          </select>
        </div>
        <div>
          <label>Forecast Year</label>
          <select value={selectedYear} onChange={(event) => setSelectedYear(event.target.value)}>
            {years.map((year) => <option key={year}>{year}</option>)}
          </select>
        </div>
      </section>

      <section className="metrics-grid app-metrics scenario-metrics">
        <MetricCard
          label="Forecast Year"
          value={selectedYear}
          subtitle="Selected projection year"
        />
        <MetricCard
          label="Predicted GDP Growth"
          value={selectedRow?.Predicted_GDP_Growth !== undefined ? `${formatNumber(selectedRow.Predicted_GDP_Growth, 2)}%` : "Not available"}
          subtitle="Random Forest forecast"
        />
        <MetricCard
          label="IMF Projection"
          value={selectedRow?.IMF_GDP_Growth !== undefined ? `${formatNumber(selectedRow.IMF_GDP_Growth, 2)}%` : "Not available"}
          subtitle="Projection comparison value"
        />
        <MetricCard
          label="Crisis Probability"
          value={selectedRow?.Crisis_Probability !== undefined ? formatNumber(selectedRow.Crisis_Probability, 3) : "Not available"}
          subtitle="Early warning score"
        />
        <MetricCard
          label="Risk Level"
          value={selectedRow?.Risk_Level ?? "Not available"}
          subtitle="Low / Moderate / High"
        />
      </section>

      <section className="app-focus-grid">
        <div className="panel glass hover-lift hero-chart-card">
          <h2>Actual IMF vs Predicted GDP Growth</h2>
          <p className="muted">Large country-level trend view across the available projection years.</p>
          <div className="chart-box mega-chart">
            <ResponsiveContainer width="100%" height={500}>
              <LineChart data={countryTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#24324d" />
                <XAxis dataKey="year" stroke="#cbd5e1" />
                <YAxis stroke="#cbd5e1" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="IMF" stroke="#22c55e" strokeWidth={5} dot={{ r: 8 }} activeDot={{ r: 11 }} />
                <Line type="monotone" dataKey="Predicted" stroke="#38bdf8" strokeWidth={5} dot={{ r: 8 }} activeDot={{ r: 11 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="panel glass interpretation-panel">
        <h2>AI-Style Interpretation</h2>
        <p>
          For <strong>{selectedCountry || "the selected country"}</strong> in <strong>{selectedYear}</strong>,
          the Random Forest model estimates GDP growth at <strong>{selectedRow?.Predicted_GDP_Growth !== undefined ? `${formatNumber(selectedRow.Predicted_GDP_Growth, 2)}%` : "not available"}</strong>,
          compared with the IMF projection of <strong>{selectedRow?.IMF_GDP_Growth !== undefined ? `${formatNumber(selectedRow.IMF_GDP_Growth, 2)}%` : "not available"}</strong>.
          The early warning system assigns a crisis probability of <strong>{selectedRow?.Crisis_Probability !== undefined ? formatNumber(selectedRow.Crisis_Probability, 3) : "not available"}</strong>,
          placing the country in the <strong>{selectedRow?.Risk_Level ?? "not available"}</strong> risk category.
        </p>
      </section>

      <DataTable
        title="Model Comparison"
        rows={models}
        columns={["Layer", "Best_Model", "RMSE", "MAE", "R2", "ML_Improvement_Percent"]}
      />

      <section className="chart-grid">
        <div className="panel glass hover-lift">
          <h2>Top 20 High-Risk Countries</h2>
          <p className="muted">Each bar includes country and year to avoid duplicate-country confusion.</p>
          <div className="chart-box tall-chart">
            <ResponsiveContainer width="100%" height={440}>
              <BarChart data={highRiskChart} layout="vertical" margin={{ left: 30 }}>
                <XAxis type="number" domain={[0, 1]} stroke="#cbd5e1" />
                <YAxis type="category" dataKey="label" stroke="#cbd5e1" width={170} interval={0} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="probability">
                  {highRiskChart.map((entry, index) => <Cell key={index} fill={yearColor(entry.year)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel glass hover-lift">
          <h2>Top 20 Low-Risk Countries</h2>
          <p className="muted">Lower probabilities indicate more stable projection-year cases.</p>
          <div className="chart-box tall-chart">
            <ResponsiveContainer width="100%" height={440}>
              <BarChart data={lowRiskChart} layout="vertical" margin={{ left: 30 }}>
                <XAxis type="number" domain={[0, 1]} stroke="#cbd5e1" />
                <YAxis type="category" dataKey="label" stroke="#cbd5e1" width={170} interval={0} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="probability">
                  {lowRiskChart.map((entry, index) => <Cell key={index} fill={yearColor(entry.year)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <DataTable
        title="IMF Projection vs Model Prediction Sample"
        rows={comparison.slice(0, 30)}
        columns={["COUNTRY", "YEAR", "IMF_GDP_Growth", "Predicted_GDP_Growth", "Prediction_Error", "Crisis_Probability", "Risk_Level"]}
      />

      <DataTable
        title="Top 20 High-Risk EWS Countries"
        rows={topRisk}
        columns={["COUNTRY", "YEAR", "Crisis_Probability", "Risk_Level", "Early_Warning_Flag"]}
      />

      <DataTable
        title="Top 20 Low-Risk EWS Countries"
        rows={lowRisk}
        columns={["COUNTRY", "YEAR", "Crisis_Probability", "Risk_Level", "Early_Warning_Flag"]}
      />

      <section className="panel glass hover-lift">
        <h2>Largest Absolute Forecast Errors</h2>
        <p className="muted">Placed last as diagnostic analysis: where model forecasts differ most from IMF projection values.</p>
        <div className="chart-box tall-chart">
          <ResponsiveContainer width="100%" height={440}>
            <BarChart data={errorChart} layout="vertical" margin={{ left: 30 }}>
              <XAxis type="number" stroke="#cbd5e1" />
              <YAxis type="category" dataKey="label" stroke="#cbd5e1" width={170} interval={0} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="error" animationDuration={1000}>
                {errorChart.map((entry, index) => <Cell key={index} fill={yearColor(entry.year)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="disclaimer glass">
        <p>
          <strong>* Disclaimer:</strong> The 2024-2026 values are evaluated against IMF projection-based values, not final real-world observed outcomes. Forecasts do not account for sudden natural calamities, wars, pandemics, policy shocks, or unexpected geopolitical events.
        </p>
      </section>
    </main>
  );
}
