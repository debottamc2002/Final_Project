"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

type Row = Record<string, any>;

const MODEL_COLUMN: Record<string, string> = {
  "Random Forest": "Random Forest_Forecast",
  XGBoost: "XGBoost_Forecast",
  "Elastic Net": "Elastic Net_Forecast",
  SVR: "SVR_Forecast",
  LSTM: "LSTM_Forecast"
};

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

function formatNumber(value: any, digits = 3) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "-";
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
      <h2>{title}</h2>
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
            {rows.map((row, index) => (
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
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function Home() {
  const [ewsRows, setEwsRows] = useState<Row[]>([]);
  const [topRisk, setTopRisk] = useState<Row[]>([]);
  const [lowRisk, setLowRisk] = useState<Row[]>([]);
  const [models, setModels] = useState<Row[]>([]);
  const [mlForecasts, setMlForecasts] = useState<Row[]>([]);
  const [lstmForecasts, setLstmForecasts] = useState<Row[]>([]);
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

        const [ewsAll, topRiskRows, lowRiskRows, modelRows, mlRows, lstmRows] =
          await Promise.all([
            fetchRows("/ews"),
            fetchRows("/ews/top-risk"),
            fetchRows("/ews/low-risk"),
            fetchRows("/models/summary"),
            fetchRows("/forecasts/ml"),
            fetchRows("/forecasts/lstm")
          ]);

        setEwsRows(ewsAll);
        setTopRisk(topRiskRows);
        setLowRisk(lowRiskRows);
        setModels(modelRows);
        setMlForecasts(mlRows);
        setLstmForecasts(lstmRows);

        const first2026 =
          mlRows.find((row) => String(row.YEAR) === "2026")?.COUNTRY ||
          mlRows[0]?.COUNTRY ||
          "";

        setSelectedCountry(first2026);
      } catch (err: any) {
        setError(err.message ?? "Something went wrong");
      }
    }

    loadData();
  }, []);

  const mergedForecasts = useMemo(() => {
    return mlForecasts.map((row) => {
      const lstm = lstmForecasts.find(
        (item) => item.COUNTRY === row.COUNTRY && item.YEAR === row.YEAR
      );

      return {
        ...row,
        LSTM_Forecast: lstm?.LSTM_Forecast
      };
    });
  }, [mlForecasts, lstmForecasts]);

  const countries = useMemo(() => {
    return Array.from(
      new Set(mergedForecasts.map((row) => row.COUNTRY).filter(Boolean))
    ).sort();
  }, [mergedForecasts]);

  const years = useMemo(() => {
    return Array.from(
      new Set(
        mergedForecasts
          .map((row) => String(row.YEAR))
          .filter((year) => Number(year) >= 2026)
      )
    ).sort();
  }, [mergedForecasts]);

  const selectedForecast = useMemo(() => {
    return mergedForecasts.find(
      (row) =>
        row.COUNTRY === selectedCountry && String(row.YEAR) === selectedYear
    );
  }, [mergedForecasts, selectedCountry, selectedYear]);

  const selectedRisk = useMemo(() => {
    return ewsRows.find(
      (row) =>
        row.COUNTRY === selectedCountry && String(row.YEAR) === selectedYear
    );
  }, [ewsRows, selectedCountry, selectedYear]);

  const selectedForecastColumn = MODEL_COLUMN[selectedModel];
  const forecastValue = selectedForecast?.[selectedForecastColumn];

  const countryForecastTrend = useMemo(() => {
    return mergedForecasts
      .filter((row) => row.COUNTRY === selectedCountry)
      .filter((row) => Number(row.YEAR) >= 2026)
      .map((row) => ({
        year: String(row.YEAR),
        value: Number(row[selectedForecastColumn])
      }))
      .filter((row) => Number.isFinite(row.value));
  }, [mergedForecasts, selectedCountry, selectedForecastColumn]);

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
            Select a country, year, and model to view projected GDP growth,
            crisis probability, risk category, and early warning status.
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
            <option>SVR</option>
            <option>LSTM</option>
          </select>
        </div>
      </section>

      <section className="metrics-grid">
        <MetricCard
          label="Predicted GDP Growth"
          value={
            forecastValue !== undefined
              ? `${formatNumber(forecastValue, 2)}%`
              : "Not available"
          }
          subtitle={`${selectedModel} estimate`}
        />
        <MetricCard
          label="Crisis Probability"
          value={
            selectedRisk?.Crisis_Probability !== undefined
              ? formatNumber(selectedRisk.Crisis_Probability, 3)
              : "Not available"
          }
          subtitle="EWS classifier score"
        />
        <MetricCard
          label="Risk Level"
          value={selectedRisk?.Risk_Level ?? "Not available"}
          subtitle="Low / Moderate / High"
        />
        <MetricCard
          label="Warning Flag"
          value={selectedRisk?.Early_Warning_Flag ?? "Not available"}
          subtitle="1 means warning activated"
        />
      </section>

      <section className="chart-grid">
        <div className="panel glass hover-lift">
          <h2>Country Forecast Trend</h2>
          <p className="muted">
            GDP growth projection for the selected country and model.
          </p>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height={320}>
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
                  {topRiskChart.map((entry, index) => (
                    <Cell key={index} fill="#ef4444" />
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
          <DataTable
            title=""
            rows={topRisk.slice(0, 20)}
            columns={[
              "COUNTRY",
              "YEAR",
              "Crisis_Probability",
              "Risk_Level",
              "Early_Warning_Flag"
            ]}
          />
        </div>

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
          <strong>{selectedRisk?.Risk_Level ?? "not available"}</strong> risk
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
          "ML_Improvement_%"
        ]}
      />

      <section className="disclaimer glass">
        <p>
          <strong>* Disclaimer:</strong> Forecasts for future years are
          model-based scenario estimates. They do not account for unexpected
          natural calamities, wars, pandemics, policy shocks, financial crises,
          or sudden geopolitical events. These outputs should be interpreted as
          decision-support indicators, not guaranteed real-world outcomes.
        </p>
      </section>
    </main>
  );
}