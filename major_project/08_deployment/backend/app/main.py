from pathlib import Path
import math

import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Partner's updated API description
app = FastAPI(
    title="MacroVision AI API",
    description="GDP forecasting and early warning system backend",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BASE_DIR / "data"

# Your data cleaning function
def clean_value(value):
    if value is None:
        return None
    try:
        if pd.isna(value):
            return None
    except Exception:
        pass
    if isinstance(value, float):
        if math.isnan(value) or math.isinf(value):
            return None
    return value

def read_csv(filename: str) -> list[dict]:
    path = DATA_DIR / filename

    if not path.exists():
        print(f"Missing file: {path}")
        return []

    df = pd.read_csv(path)
    df = df.loc[:, ~df.columns.astype(str).str.startswith("Unnamed")]
    df.columns = [str(col).strip() for col in df.columns]
    records = df.to_dict(orient="records")

    clean_records = []
    for row in records:
        clean_records.append({
            key: clean_value(value)
            for key, value in row.items()
        })
    return clean_records

# Partner's helper function
def sort_by_probability(rows: list[dict], reverse: bool) -> list[dict]:
    return sorted(
        rows,
        key=lambda row: row.get("Crisis_Probability") or 0,
        reverse=reverse,
    )

@app.get("/")
def root():
    return {
        "message": "MacroVision AI API is running",
        "docs": "/docs",
        "horizon": "2026-2030",
    }

@app.get("/health")
def health():
    return {"status": "ok"}

# Your debug endpoint
@app.get("/debug/files")
def debug_files():
    files = []
    for path in sorted(DATA_DIR.glob("*.csv")):
        try:
            df = pd.read_csv(path, nrows=2)
            files.append({
                "file": path.name,
                "size": path.stat().st_size,
                "columns": list(df.columns),
                "sample_rows": len(df),
            })
        except Exception as exc:
            files.append({
                "file": path.name,
                "error": str(exc),
            })
    return {
        "data_dir": str(DATA_DIR),
        "files": files,
    }

@app.get("/comparison/scenario-2026-2030")
def scenario_2026_2030():
    return {"data": read_csv("scenario_forecasts_2026_2030.csv")}

@app.get("/ews/scenario-2026-2030")
def ews_scenario_2026_2030():
    return {"data": read_csv("final_ews_2026_2030.csv")}

@app.get("/forecasts/ml-2026-2030")
def ml_forecasts_2026_2030():
    return {"data": read_csv("layer2b_forecasts_2026_2030.csv")}

@app.get("/ews/top-risk-2026-2030")
def ews_top_risk_2026_2030():
    rows = read_csv("ews_top20_high_risk_2026_2030.csv")
    if not rows:
        rows = sort_by_probability(
            read_csv("scenario_forecasts_2026_2030.csv"),
            reverse=True,
        )[:20]
    return {"data": rows}

@app.get("/ews/low-risk-2026-2030")
def ews_low_risk_2026_2030():
    rows = read_csv("ews_top20_low_risk_2026_2030.csv")
    if not rows:
        rows = sort_by_probability(
            read_csv("scenario_forecasts_2026_2030.csv"),
            reverse=False,
        )[:20]
    return {"data": rows}

@app.get("/models/summary")
def model_summary():
    rows = read_csv("layer2a_vs_2b_summary.csv")
    if rows:
        output = []
        for row in rows:
            output.append(
                {
                    "Layer": row.get("Layer"),
                    "Best_Model": row.get("Best_Model"),
                    "RMSE": row.get("RMSE"),
                    "MAE": row.get("MAE"),
                    "R2": row.get("R2"),
                    "ML_Improvement_Percent": row.get("ML_Improvement_%"),
                }
            )
        output.extend(
            [
                {
                    "Layer": "Layer 3 LSTM",
                    "Best_Model": "LSTM",
                    "RMSE": 5.117,
                    "MAE": 2.771,
                    "R2": 0.104,
                    "ML_Improvement_Percent": None,
                },
                {
                    "Layer": "EWS Classifier",
                    "Best_Model": "Extra Trees",
                    "RMSE": None,
                    "MAE": None,
                    "R2": "ROC-AUC 0.930",
                    "ML_Improvement_Percent": None,
                },
            ]
        )
        return {"data": output}

    return {
        "data": [
            {
                "Layer": "Layer 2a Econometric",
                "Best_Model": "Pooled OLS",
                "RMSE": 4.816,
                "MAE": 2.755,
                "R2": 0.206,
                "ML_Improvement_Percent": None,
            },
            {
                "Layer": "Layer 2b ML",
                "Best_Model": "Random Forest",
                "RMSE": 4.709,
                "MAE": 2.631,
                "R2": 0.241,
                "ML_Improvement_Percent": 2.22,
            },
        ]
    }

# Backward-compatible endpoints
@app.get("/comparison/imf-vs-forecast")
def imf_vs_forecast():
    return scenario_2026_2030()

@app.get("/ews/top-risk")
def ews_top_risk():
    return ews_top_risk_2026_2030()

@app.get("/ews/low-risk")
def ews_low_risk():
    return ews_low_risk_2026_2030()

@app.get("/ews")
def ews_all():
    return ews_scenario_2026_2030()


# Your new Mentor-Requested Endpoints
@app.get("/ews/top-risk-2024-2026")
def ews_top_risk_2024_2026():
    return {"data": read_csv("ews_top20_high_risk_2024_2026.csv")}

@app.get("/ews/low-risk-2024-2026")
def ews_low_risk_2024_2026():
    return {"data": read_csv("ews_top20_low_risk_2024_2026.csv")}

@app.get("/ews/top-risk-2027-2030")
def ews_top_risk_2027_2030():
    return {"data": read_csv("ews_top20_high_risk_2027_2030.csv")}

@app.get("/ews/low-risk-2027-2030")
def ews_low_risk_2027_2030():
    return {"data": read_csv("ews_top20_low_risk_2027_2030.csv")}