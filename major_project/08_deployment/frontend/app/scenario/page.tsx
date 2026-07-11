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

function normalizeResponse(data: any): Row[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

async function fetchRows(endpoint: string): Promise<Row[]> {
  const response = await fetch(`${API_BASE}${endpoint}`);
  if (!response.ok) throw new Error(`Failed to fetch ${endpoint}`);
  return normalizeResponse(await response.json());
}

function formatNumber(value: any, digits = 2) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "-";
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
            {rows.map((row, index) => (
              <tr key={index}>
                {columns.map((col) => (
                  <td key={col}>
                    {typeof row[col] === "number"
                      ? col === "YEAR"
                        ? formatYear(row[col])
                        : formatNumber(row[col], 3)
                      : row[col] ?? "-"}
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
  const [selectedCountry, setSelectedCountry] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [comparisonRows, topRows, lowRows] = await Promise.all([
          fetchRows("/comparison/imf-vs-forecast"),
          fetchRows("/ews/top-risk"),
          fetchRows("/ews/low-risk")
        ]);

        setComparison(comparisonRows);
        setTopRisk(topRows);
        setLowRisk(lowRows);

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
    return Array.from(
      new Set(comparison.map((row) => row.COUNTRY).filter(Boolean))
    ).sort();
  }, [comparison]);

  const countryTrend = useMemo(() => {
    return comparison
      .filter((row) => row.COUNTRY === selectedCountry)
      .map((row) => ({
        year: String(row.YEAR),
        IMF: Number(row.IMF_GDP_Growth),
        Predicted: Number(row.Predicted_GDP_Growth),
        Error: Number(row.Prediction_Error)
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
      <section className="hero glass">
        <div>
          <p className="eyebrow">2024-2026 IMF Projection Scenario</p>
          <h1>Backend Scenario Dashboard</h1>
          <p className="hero-text">
            This page compares model-predicted GDP growth with IMF projection
            values and displays early-warning risk rankings for 2024-2026.
          </p>
        </div>
      </section>

      {error && <div className="error-box">{error}</div>}

      <section className="year-legend glass">
        <span><i className="legend-2024" /> 2024</span>
        <span><i className="legend-2025" /> 2025</span>
        <span><i className="legend-2026" /> 2026</span>
      </section>

      <section className="input-panel glass">
        <div>
          <label>Select Country</label>
          <select
            value={selectedCountry}
            onChange={(event) => setSelectedCountry(event.target.value)}
          >
            {countries.map((country) => (
              <option key={country}>{country}</option>
            ))}
          </select>
        </div>
      </section>

      <section className="chart-grid">
        <div className="panel glass hover-lift">
          <h2>Actual IMF vs Predicted GDP Growth</h2>
          <p className="muted">
            Country-wise comparison across 2024-2026.
          </p>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height={330}>
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
                />
                <Line
                  type="monotone"
                  dataKey="Predicted"
                  stroke="#38bdf8"
                  strokeWidth={4}
                  dot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel glass hover-lift">
          <h2>Largest Absolute Forecast Errors</h2>
          <p className="muted">
            Countries and years where model forecast differs most from IMF
            projection.
          </p>
          <div className="chart-box tall-chart">
            <ResponsiveContainer width="100%" height={420}>
              <BarChart data={errorChart} layout="vertical" margin={{ left: 30 }}>
                <XAxis type="number" stroke="#cbd5e1" />
                <YAxis
                  type="category"
                  dataKey="label"
                  stroke="#cbd5e1"
                  width={150}
                  interval={0}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip />
                <Bar dataKey="error" animationDuration={1000}>
                  {errorChart.map((entry, index) => (
                    <Cell key={index} fill={yearColor(entry.year)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="chart-grid">
        <div className="panel glass hover-lift">
          <h2>Top 20 High-Risk Countries</h2>
          <div className="chart-box tall-chart">
            <ResponsiveContainer width="100%" height={440}>
              <BarChart data={highRiskChart} layout="vertical" margin={{ left: 30 }}>
                <XAxis type="number" domain={[0, 1]} stroke="#cbd5e1" />
                <YAxis
                  type="category"
                  dataKey="label"
                  stroke="#cbd5e1"
                  width={150}
                  interval={0}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip />
                <Bar dataKey="probability">
                  {highRiskChart.map((entry, index) => (
                    <Cell key={index} fill={yearColor(entry.year)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel glass hover-lift">
          <h2>Top 20 Low-Risk Countries</h2>
          <div className="chart-box tall-chart">
            <ResponsiveContainer width="100%" height={440}>
              <BarChart data={lowRiskChart} layout="vertical" margin={{ left: 30 }}>
                <XAxis type="number" domain={[0, 1]} stroke="#cbd5e1" />
                <YAxis
                  type="category"
                  dataKey="label"
                  stroke="#cbd5e1"
                  width={150}
                  interval={0}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip />
                <Bar dataKey="probability">
                  {lowRiskChart.map((entry, index) => (
                    <Cell key={index} fill={yearColor(entry.year)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <DataTable
        title="IMF Projection vs Model Prediction Sample"
        rows={comparison.slice(0, 30)}
        columns={[
          "COUNTRY",
          "YEAR",
          "IMF_GDP_Growth",
          "Predicted_GDP_Growth",
          "Prediction_Error",
          "Crisis_Probability",
          "Risk_Level"
        ]}
      />

      <DataTable
        title="Top 20 High-Risk EWS Countries"
        rows={topRisk}
        columns={[
          "COUNTRY",
          "YEAR",
          "Crisis_Probability",
          "Risk_Level",
          "Early_Warning_Flag"
        ]}
      />

      <DataTable
        title="Top 20 Low-Risk EWS Countries"
        rows={lowRisk}
        columns={[
          "COUNTRY",
          "YEAR",
          "Crisis_Probability",
          "Risk_Level",
          "Early_Warning_Flag"
        ]}
      />

      <section className="disclaimer glass">
        <p>
          <strong>* Disclaimer:</strong> The 2024-2026 values are evaluated
          against IMF projection-based values, not final real-world observed
          outcomes. Forecasts do not account for sudden natural calamities,
          wars, pandemics, policy shocks, or unexpected geopolitical events.
        </p>
      </section>
    </main>
  );
}
