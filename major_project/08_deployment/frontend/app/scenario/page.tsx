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
  YAxis,
} from "recharts";

const API_BASE =
<<<<<<< HEAD
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:7860";
=======
  process.env.NEXT_PUBLIC_API_URL ||
  "https://macro-surveillance-api.onrender.com";
>>>>>>> e3e040a48179c681f685fe08427973bdf583e1e6

type Row = Record<string, any>;

const FALLBACK_MODELS: Row[] = [
  { Layer: "Layer 2a Econometric", Best_Model: "Pooled OLS", RMSE: 4.816, MAE: 2.755, R2: 0.206, ML_Improvement_Percent: "-" },
  { Layer: "Layer 2b ML", Best_Model: "Random Forest", RMSE: 4.709, MAE: 2.631, R2: 0.241, ML_Improvement_Percent: 2.22 },
  { Layer: "Layer 3 LSTM", Best_Model: "LSTM", RMSE: 5.117, MAE: 2.771, R2: 0.104, ML_Improvement_Percent: "-" },
  { Layer: "EWS Classifier", Best_Model: "Extra Trees", RMSE: "-", MAE: "-", R2: "ROC-AUC 0.930", ML_Improvement_Percent: "-" },
];

function normalizeResponse(data: any): Row[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

async function fetchRows(endpoint: string): Promise<Row[]> {
  const cleanBase = API_BASE.replace(/\/$/, "");
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${cleanBase}${cleanEndpoint}`;

  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) throw new Error(`Failed to fetch ${url}`);
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
<<<<<<< HEAD
  if (key === "2024") return "#38bdf8";
  if (key === "2025") return "#14b8a6";
=======
>>>>>>> e3e040a48179c681f685fe08427973bdf583e1e6
  if (key === "2026") return "#f97316";
  if (key === "2027") return "#a855f7";
  if (key === "2028") return "#22c55e";
  if (key === "2029") return "#f43f5e";
  if (key === "2030") return "#eab308";
  return "#38bdf8";
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

function DataTable({
  title,
  rows,
  columns,
}: {
  title: string;
  rows: Row[];
  columns: string[];
}) {
  return (
    <section className="panel glass">
      <h2>{title}</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col}>{col}</th>
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
                  {columns.map((col) => (
                    <td key={col}>
                      {col === "Risk_Level" ? (
                        <RiskBadge value={row[col]} />
                      ) : typeof row[col] === "number" ? (
                        col === "YEAR" ? formatYear(row[col]) : formatNumber(row[col], 3)
                      ) : (
                        row[col] ?? "-"
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

function RiskChart({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <div className="panel glass hover-lift">
      <h2>{title}</h2>
      <p className="muted">
        Each bar includes country and year to avoid duplicate-country confusion.
      </p>
      <div className="chart-box tall-chart">
        <ResponsiveContainer width="100%" height={440}>
          <BarChart data={rows} layout="vertical" margin={{ left: 30 }}>
            <XAxis type="number" domain={[0, 1]} stroke="#cbd5e1" />
            <YAxis
              type="category"
              dataKey="label"
              stroke="#cbd5e1"
              width={170}
              interval={0}
              tick={{ fontSize: 12 }}
            />
            <Tooltip />
            <Bar dataKey="probability">
              {rows.map((entry, index) => (
                <Cell key={index} fill={yearColor(entry.year)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function ScenarioPage() {
  const [comparison, setComparison] = useState<Row[]>([]);
  const [models, setModels] = useState<Row[]>(FALLBACK_MODELS);
  const [selectedBenchmarkCountry, setSelectedBenchmarkCountry] = useState("");
  const [selectedBenchmarkYear, setSelectedBenchmarkYear] = useState("2026");
  const [selectedScenarioCountry, setSelectedScenarioCountry] = useState("");
  const [selectedScenarioYear, setSelectedScenarioYear] = useState("2027");
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
<<<<<<< HEAD
        const [comparisonRows, modelRows] = await Promise.all([
          fetchRows("/comparison/scenario-2026-2030"),
          fetchRowsSafe("/models/summary", FALLBACK_MODELS),
=======
        const [comparisonRows, topRows, lowRows, modelRows] = await Promise.all([
          fetchRows("/comparison/scenario-2026-2030"),
          fetchRows("/ews/top-risk-2026-2030"),
          fetchRows("/ews/low-risk-2026-2030"),
          fetchRowsSafe("/models/summary", FALLBACK_MODELS)
>>>>>>> e3e040a48179c681f685fe08427973bdf583e1e6
        ]);

        setComparison(comparisonRows);

        const mergedModels = modelRows.length
          ? modelRows.map((row) => ({
              ...row,
              ML_Improvement_Percent:
                row.ML_Improvement_Percent ?? row["ML_Improvement_%"],
            }))
          : FALLBACK_MODELS;

        const hasLstm = mergedModels.some((row) =>
          String(row.Layer ?? "").toLowerCase().includes("lstm")
        );
        const hasEws = mergedModels.some((row) =>
          String(row.Layer ?? "").toLowerCase().includes("ews")
        );

        setModels([
          ...mergedModels,
          ...(hasLstm ? [] : [FALLBACK_MODELS[2]]),
          ...(hasEws ? [] : [FALLBACK_MODELS[3]]),
        ]);

        const firstBenchmark =
          comparisonRows.find((row) => ["2024", "2025", "2026"].includes(formatYear(row.YEAR)))?.COUNTRY ||
          "";

        const firstScenario =
          comparisonRows.find((row) => formatYear(row.YEAR) === "2027")?.COUNTRY ||
          comparisonRows.find((row) => ["2028", "2029", "2030"].includes(formatYear(row.YEAR)))?.COUNTRY ||
          "";

        setSelectedBenchmarkCountry(firstBenchmark);
        setSelectedScenarioCountry(firstScenario);
      } catch (err: any) {
        setError(err.message ?? "Something went wrong");
      }
    }

    load();
  }, []);

  const benchmarkRows = useMemo(() => {
    return comparison.filter((row) =>
      ["2024", "2025", "2026"].includes(formatYear(row.YEAR))
    );
  }, [comparison]);

  const scenarioFuture = useMemo(() => {
    return comparison.filter((row) =>
      ["2027", "2028", "2029", "2030"].includes(formatYear(row.YEAR))
    );
  }, [comparison]);

  const benchmarkCountries = useMemo(() => {
    return Array.from(
      new Set(benchmarkRows.map((row) => row.COUNTRY).filter(Boolean))
    ).sort();
  }, [benchmarkRows]);

  const scenarioCountries = useMemo(() => {
    return Array.from(
      new Set(scenarioFuture.map((row) => row.COUNTRY).filter(Boolean))
    ).sort();
  }, [scenarioFuture]);

  const benchmarkYears = ["2024", "2025", "2026"];
  const scenarioYears = ["2027", "2028", "2029", "2030"];

  const selectedBenchmarkRow = useMemo(() => {
    return benchmarkRows.find(
      (row) =>
        row.COUNTRY === selectedBenchmarkCountry &&
        formatYear(row.YEAR) === selectedBenchmarkYear
    );
  }, [benchmarkRows, selectedBenchmarkCountry, selectedBenchmarkYear]);

  const selectedScenarioRow = useMemo(() => {
    return scenarioFuture.find(
      (row) =>
        row.COUNTRY === selectedScenarioCountry &&
        formatYear(row.YEAR) === selectedScenarioYear
    );
  }, [scenarioFuture, selectedScenarioCountry, selectedScenarioYear]);

  const benchmarkTrend = useMemo(() => {
    return benchmarkRows
      .filter((row) => row.COUNTRY === selectedBenchmarkCountry)
      .map((row) => ({
        year: formatYear(row.YEAR),
<<<<<<< HEAD
        IMF:
          row.IMF_GDP_Growth === null || row.IMF_GDP_Growth === undefined
            ? null
            : Number(row.IMF_GDP_Growth),
        Predicted: Number(row.Predicted_GDP_Growth),
      }))
      .filter((row) => Number.isFinite(row.Predicted));
  }, [benchmarkRows, selectedBenchmarkCountry]);

  const scenarioTrend = useMemo(() => {
    return scenarioFuture
      .filter((row) => row.COUNTRY === selectedScenarioCountry)
      .map((row) => ({
        year: formatYear(row.YEAR),
        Predicted: Number(row.Predicted_GDP_Growth),
      }))
      .filter((row) => Number.isFinite(row.Predicted));
  }, [scenarioFuture, selectedScenarioCountry]);

  const topHighBenchmark = useMemo(() => {
    return [...benchmarkRows]
      .sort((a, b) => Number(b.Crisis_Probability ?? 0) - Number(a.Crisis_Probability ?? 0))
      .slice(0, 20);
  }, [benchmarkRows]);

  const topLowBenchmark = useMemo(() => {
    return [...benchmarkRows]
      .sort((a, b) => Number(a.Crisis_Probability ?? 0) - Number(b.Crisis_Probability ?? 0))
      .slice(0, 20);
  }, [benchmarkRows]);

  const topHighScenario = useMemo(() => {
    return [...scenarioFuture]
      .sort((a, b) => Number(b.Crisis_Probability ?? 0) - Number(a.Crisis_Probability ?? 0))
      .slice(0, 20);
  }, [scenarioFuture]);

  const topLowScenario = useMemo(() => {
    return [...scenarioFuture]
      .sort((a, b) => Number(a.Crisis_Probability ?? 0) - Number(b.Crisis_Probability ?? 0))
      .slice(0, 20);
  }, [scenarioFuture]);

  const benchmarkErrorChart = useMemo(() => {
    return benchmarkRows
=======
        IMF: row.IMF_GDP_Growth === null || row.IMF_GDP_Growth === undefined ? null : Number(row.IMF_GDP_Growth),
        Predicted: Number(row.Predicted_GDP_Growth)
      }))
      .filter((row) => Number.isFinite(row.Predicted));
  }, [comparison, selectedCountry]);

  const errorChart = useMemo(() => {
    return comparison
>>>>>>> e3e040a48179c681f685fe08427973bdf583e1e6
      .filter((row) => Number.isFinite(Number(row.Prediction_Error)))
      .map((row) => ({
        label: `${shortCountry(row.COUNTRY)} (${formatYear(row.YEAR)})`,
        year: formatYear(row.YEAR),
<<<<<<< HEAD
        error: Math.abs(Number(row.Prediction_Error)),
=======
        error: Math.abs(Number(row.Prediction_Error))
>>>>>>> e3e040a48179c681f685fe08427973bdf583e1e6
      }))
      .sort((a, b) => b.error - a.error)
      .slice(0, 15);
  }, [benchmarkRows]);

  const regressionModelsOnly = useMemo(() => {
    return models.filter((row) => {
      const layer = String(row.Layer ?? "").toLowerCase();
      return layer.includes("2a") || layer.includes("2b") || layer.includes("econometric") || layer.includes("ml");
    });
  }, [models]);

  function riskChartRows(rows: Row[]) {
    return rows.slice(0, 15).map((row) => ({
      label: `${shortCountry(row.COUNTRY)} (${formatYear(row.YEAR)})`,
      year: formatYear(row.YEAR),
      probability: Number(row.Crisis_Probability ?? 0),
    }));
  }

  return (
    <main>
      <section className="hero glass single-hero">
        <div>
<<<<<<< HEAD
          <p className="eyebrow">MacroVision AI</p>
=======
          <p className="eyebrow">2026-2030 GDP Forecast Scenario</p>
>>>>>>> e3e040a48179c681f685fe08427973bdf583e1e6
          <h1>Macroeconomic Forecast & Early Warning Dashboard</h1>
          <p className="hero-text">
            The dashboard separates the 2024-2026 IMF benchmark view from
            the 2027-2030 recursive scenario forecast view.
          </p>
        </div>
      </section>

      {error && <div className="error-box">{error}</div>}

      <section className="panel glass">
        <p className="eyebrow">2024-2026 IMF Benchmark Dashboard</p>
        <h2>Model Prediction vs IMF Projection</h2>
        <p className="muted">
          This section compares model forecasts with available IMF projection
          values for 2024, 2025, and 2026.
        </p>
      </section>

      <section className="year-legend glass">
        <span><i className="legend-2026" /> 2026</span>
        <span><i className="legend-2027" /> 2027</span>
        <span><i className="legend-2028" /> 2028</span>
        <span><i className="legend-2029" /> 2029</span>
        <span><i className="legend-2030" /> 2030</span>
      </section>

      <section className="input-panel glass two-inputs">
        <div>
          <label>Select Country</label>
          <select
            value={selectedBenchmarkCountry}
            onChange={(event) => setSelectedBenchmarkCountry(event.target.value)}
          >
            {benchmarkCountries.map((country) => (
              <option key={country}>{country}</option>
            ))}
          </select>
        </div>

        <div>
          <label>Forecast Year</label>
          <select
            value={selectedBenchmarkYear}
            onChange={(event) => setSelectedBenchmarkYear(event.target.value)}
          >
            {benchmarkYears.map((year) => (
              <option key={year}>{year}</option>
            ))}
          </select>
        </div>
      </section>

      <section className="metrics-grid app-metrics scenario-metrics">
        <MetricCard label="Forecast Year" value={selectedBenchmarkYear} subtitle="IMF benchmark year" />

        <MetricCard
          label="Predicted GDP Growth"
          value={
            selectedBenchmarkRow?.Predicted_GDP_Growth !== undefined
              ? `${formatNumber(selectedBenchmarkRow.Predicted_GDP_Growth, 2)}%`
              : "Not available"
          }
          subtitle="Random Forest forecast"
        />

        <MetricCard
          label="IMF Projection"
          value={
            selectedBenchmarkRow?.IMF_GDP_Growth !== undefined &&
            selectedBenchmarkRow?.IMF_GDP_Growth !== null
              ? `${formatNumber(selectedBenchmarkRow.IMF_GDP_Growth, 2)}%`
              : "Not available"
          }
          subtitle="Available IMF projection"
        />

        <MetricCard
          label="Crisis Probability"
          value={
            selectedBenchmarkRow?.Crisis_Probability !== undefined
              ? formatNumber(selectedBenchmarkRow.Crisis_Probability, 3)
              : "Not available"
          }
          subtitle="EWS classifier score"
        />

        <MetricCard
          label="Risk Level"
          value={selectedBenchmarkRow?.Risk_Level ?? "Not available"}
          subtitle="Low / Moderate / High"
        />
      </section>

      <section className="app-focus-grid">
        <div className="panel glass hover-lift hero-chart-card">
          <h2>2024-2026 IMF vs Predicted GDP Growth</h2>
          <p className="muted">
            Benchmark trend for the selected country across 2024, 2025, and 2026.
          </p>

          <div className="chart-box mega-chart">
            <ResponsiveContainer width="100%" height={500}>
              <LineChart data={benchmarkTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#24324d" />
                <XAxis dataKey="year" stroke="#cbd5e1" />
                <YAxis stroke="#cbd5e1" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="IMF" stroke="#22c55e" strokeWidth={5} dot={{ r: 8 }} />
                <Line type="monotone" dataKey="Predicted" stroke="#38bdf8" strokeWidth={5} dot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="panel glass interpretation-panel">
        <h2>AI-Style Interpretation</h2>
        <p>
          For <strong>{selectedBenchmarkCountry || "the selected country"}</strong> in{" "}
          <strong>{selectedBenchmarkYear}</strong>, the model estimates GDP growth at{" "}
          <strong>
            {selectedBenchmarkRow?.Predicted_GDP_Growth !== undefined
              ? `${formatNumber(selectedBenchmarkRow.Predicted_GDP_Growth, 2)}%`
              : "not available"}
          </strong>
          , compared with the IMF projection of{" "}
          <strong>
            {selectedBenchmarkRow?.IMF_GDP_Growth !== undefined &&
            selectedBenchmarkRow?.IMF_GDP_Growth !== null
              ? `${formatNumber(selectedBenchmarkRow.IMF_GDP_Growth, 2)}%`
              : "not available"}
          </strong>
          . The EWS model assigns a crisis probability of{" "}
          <strong>
            {selectedBenchmarkRow?.Crisis_Probability !== undefined
              ? formatNumber(selectedBenchmarkRow.Crisis_Probability, 3)
              : "not available"}
          </strong>
          , placing the country in the{" "}
          <strong>{selectedBenchmarkRow?.Risk_Level ?? "not available"}</strong> risk category.
        </p>
      </section>

      <DataTable
        title="Model Comparison: Econometric, ML, LSTM, EWS"
        rows={models}
        columns={["Layer", "Best_Model", "RMSE", "MAE", "R2", "ML_Improvement_Percent"]}
      />

      <section className="chart-grid">
        <RiskChart title="2024-2026 Top 20 High-Risk Countries" rows={riskChartRows(topHighBenchmark)} />
        <RiskChart title="2024-2026 Top 20 Low-Risk Countries" rows={riskChartRows(topLowBenchmark)} />
      </section>

      <DataTable
        title="2024-2026 IMF Projection vs Model Prediction Sample"
        rows={benchmarkRows.slice(0, 30)}
        columns={[
          "COUNTRY",
          "YEAR",
          "IMF_GDP_Growth",
          "Predicted_GDP_Growth",
          "Prediction_Error",
          "Crisis_Probability",
          "Risk_Level",
          "Early_Warning_Flag",
        ]}
      />

      <DataTable
        title="2024-2026 Top 20 High-Risk EWS Countries"
        rows={topHighBenchmark}
        columns={["COUNTRY", "YEAR", "Crisis_Probability", "Risk_Level", "Early_Warning_Flag"]}
      />

      <DataTable
        title="2024-2026 Top 20 Low-Risk EWS Countries"
        rows={topLowBenchmark}
        columns={["COUNTRY", "YEAR", "Crisis_Probability", "Risk_Level", "Early_Warning_Flag"]}
      />

      <section className="panel glass hover-lift">
        <h2>2024-2026 Largest Absolute Forecast Errors</h2>
        <p className="muted">
          This diagnostic compares model predictions with available IMF projection values.
        </p>

        <div className="chart-box tall-chart">
          <ResponsiveContainer width="100%" height={440}>
            <BarChart data={benchmarkErrorChart} layout="vertical" margin={{ left: 30 }}>
              <XAxis type="number" stroke="#cbd5e1" />
              <YAxis type="category" dataKey="label" stroke="#cbd5e1" width={170} interval={0} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="error">
                {benchmarkErrorChart.map((entry, index) => (
                  <Cell key={index} fill={yearColor(entry.year)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="panel glass">
        <p className="eyebrow">2027-2030 Scenario Forecast Dashboard</p>
        <h2>Recursive t+1 GDP and Crisis-Risk Forecasts</h2>
        <p className="muted">
          This section excludes IMF comparison because IMF projection values are
          not available for 2027-2030 in the project dataset.
        </p>
      </section>

      <section className="year-legend glass">
        <span><i className="legend-2027" /> 2027</span>
        <span><i className="legend-2028" /> 2028</span>
        <span><i className="legend-2029" /> 2029</span>
        <span><i className="legend-2030" /> 2030</span>
      </section>

      <section className="input-panel glass two-inputs">
        <div>
          <label>Select Country</label>
          <select
            value={selectedScenarioCountry}
            onChange={(event) => setSelectedScenarioCountry(event.target.value)}
          >
            {scenarioCountries.map((country) => (
              <option key={country}>{country}</option>
            ))}
          </select>
        </div>

        <div>
          <label>Forecast Year</label>
          <select
            value={selectedScenarioYear}
            onChange={(event) => setSelectedScenarioYear(event.target.value)}
          >
            {scenarioYears.map((year) => (
              <option key={year}>{year}</option>
            ))}
          </select>
        </div>
      </section>

      <section className="metrics-grid app-metrics scenario-metrics">
        <MetricCard label="Forecast Year" value={selectedScenarioYear} subtitle="Scenario forecast year" />

        <MetricCard
          label="Predicted GDP Growth"
          value={
            selectedScenarioRow?.Predicted_GDP_Growth !== undefined
              ? `${formatNumber(selectedScenarioRow.Predicted_GDP_Growth, 2)}%`
              : "Not available"
          }
          subtitle="Recursive t+1 forecast"
        />

        <MetricCard
          label="Crisis Probability"
          value={
            selectedScenarioRow?.Crisis_Probability !== undefined
              ? formatNumber(selectedScenarioRow.Crisis_Probability, 3)
              : "Not available"
          }
          subtitle="EWS classifier score"
        />

        <MetricCard
          label="Risk Level"
          value={selectedScenarioRow?.Risk_Level ?? "Not available"}
          subtitle="Low / Moderate / High"
        />

        <MetricCard
          label="Warning Flag"
          value={selectedScenarioRow?.Early_Warning_Flag ?? "Not available"}
          subtitle="1 means warning activated"
        />
      </section>

      <section className="app-focus-grid">
        <div className="panel glass hover-lift hero-chart-card">
          <h2>2027-2030 Predicted GDP Growth Trend</h2>
          <p className="muted">
            Scenario trend for the selected country. No IMF comparison is shown for these years.
          </p>

          <div className="chart-box mega-chart">
            <ResponsiveContainer width="100%" height={500}>
              <LineChart data={scenarioTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#24324d" />
                <XAxis dataKey="year" stroke="#cbd5e1" />
                <YAxis stroke="#cbd5e1" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="Predicted" stroke="#38bdf8" strokeWidth={5} dot={{ r: 8 }} activeDot={{ r: 11 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="panel glass interpretation-panel">
        <h2>AI-Style Interpretation</h2>
        <p>
          For <strong>{selectedScenarioCountry || "the selected country"}</strong> in{" "}
          <strong>{selectedScenarioYear}</strong>, the model projects GDP growth at{" "}
          <strong>
            {selectedScenarioRow?.Predicted_GDP_Growth !== undefined
              ? `${formatNumber(selectedScenarioRow.Predicted_GDP_Growth, 2)}%`
              : "not available"}
          </strong>
          . The early warning system estimates a crisis probability of{" "}
          <strong>
            {selectedScenarioRow?.Crisis_Probability !== undefined
              ? formatNumber(selectedScenarioRow.Crisis_Probability, 3)
              : "not available"}
          </strong>
          , assigning the country to the{" "}
          <strong>{selectedScenarioRow?.Risk_Level ?? "not available"}</strong> risk category.
        </p>
      </section>

      <DataTable
        title="Model Comparison: Econometric vs ML"
        rows={regressionModelsOnly}
        columns={["Layer", "Best_Model", "RMSE", "MAE", "R2", "ML_Improvement_Percent"]}
      />

      <section className="chart-grid">
        <RiskChart title="2027-2030 Top 20 High-Risk Countries" rows={riskChartRows(topHighScenario)} />
        <RiskChart title="2027-2030 Top 20 Low-Risk Countries" rows={riskChartRows(topLowScenario)} />
      </section>

      <DataTable
        title="2027-2030 Scenario Forecast Sample"
        rows={scenarioFuture.slice(0, 30)}
        columns={[
          "COUNTRY",
          "YEAR",
          "Predicted_GDP_Growth",
          "Crisis_Probability",
          "Risk_Level",
          "Early_Warning_Flag",
        ]}
      />

      <DataTable
        title="2027-2030 Top 20 High-Risk EWS Countries"
        rows={topHighScenario}
        columns={["COUNTRY", "YEAR", "Crisis_Probability", "Risk_Level", "Early_Warning_Flag"]}
      />

      <DataTable
        title="2027-2030 Top 20 Low-Risk EWS Countries"
        rows={topLowScenario}
        columns={["COUNTRY", "YEAR", "Crisis_Probability", "Risk_Level", "Early_Warning_Flag"]}
      />

      <section className="disclaimer glass">
        <p>
<<<<<<< HEAD
          <strong>* Disclaimer:</strong> The 2024-2026 dashboard compares model predictions
          against available IMF projection values. The 2027-2030 dashboard presents
          recursive t+1 scenario forecasts only. These forecasts do not account for
          sudden natural calamities, wars, pandemics, policy shocks, financial crises,
          or unexpected geopolitical events.
=======
          <strong>* Disclaimer:</strong> The 2026 value is compared with the available IMF projection horizon, while 2027-2030 are recursive t+1 model extrapolation scenarios. Forecasts do not account for sudden natural calamities, wars, pandemics, policy shocks, financial crises, or unexpected geopolitical events.
>>>>>>> e3e040a48179c681f685fe08427973bdf583e1e6
        </p>
      </section>
    </main>
  );
}