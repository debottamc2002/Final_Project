from pathlib import Path

import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Macro Surveillance API",
    description="GDP forecasting and early warning system backend",
    version="1.0.0",
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


def read_csv(filename):
    path = DATA_DIR / filename
    if not path.exists():
        return []
    df = pd.read_csv(path)
    df = df.replace({float("inf"): None, float("-inf"): None})
    df = df.where(pd.notnull(df), None)
    return df.to_dict(orient="records")


@app.get("/")
def root():
    return {
        "message": "Macro Surveillance API is running",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/forecasts/ml")
def ml_forecasts():
    return {
        "data": read_csv("layer2b_forecasts_2024_2026.csv")
    }


@app.get("/forecasts/lstm")
def lstm_forecasts():
    return {
        "data": read_csv("layer3_lstm_forecasts_2024_2026.csv")
    }


@app.get("/ews")
def ews_all():
    return {
        "data": read_csv("final_ews_2024_2026.csv")
    }


@app.get("/ews/top-risk")
def ews_top_risk():
    rows = read_csv("final_ews_2024_2026.csv")
    rows = sorted(
        rows,
        key=lambda row: row.get("Crisis_Probability") or 0,
        reverse=True,
    )
    return {"data": rows[:20]}


@app.get("/ews/low-risk")
def ews_low_risk():
    rows = read_csv("final_ews_2024_2026.csv")
    rows = sorted(
        rows,
        key=lambda row: row.get("Crisis_Probability") or 0,
    )
    return {"data": rows[:20]}


@app.get("/models/summary")
def model_summary():
    rows = []

    rows.extend(read_csv("layer2a_vs_2b_summary.csv"))

    lstm_rows = read_csv("layer2b_vs_lstm_comparison.csv")
    for row in lstm_rows:
        rows.append({
            "Layer": row.get("Layer"),
            "Best_Model": row.get("Model"),
            "RMSE": row.get("RMSE"),
            "MAE": row.get("MAE"),
            "R2": row.get("R2"),
            "ML_Improvement_%": None,
        })

    return {"data": rows}
@app.get("/comparison/imf-vs-forecast")
def imf_vs_forecast():
    ml_rows = read_csv("layer2b_forecasts_2024_2026.csv")
    imf_rows = read_csv("ews_vs_imf_projection_comparison_2024_2026.csv")

    imf_lookup = {
        (row.get("COUNTRY"), row.get("YEAR")): row
        for row in imf_rows
    }

    output = []

    for row in ml_rows:
        key = (row.get("COUNTRY"), row.get("YEAR"))
        imf = imf_lookup.get(key, {})

        actual = imf.get("GDP_Growth")
        predicted = row.get("Random Forest_Forecast")

        error = None
        if actual is not None and predicted is not None:
            error = actual - predicted

        output.append({
            "COUNTRY": row.get("COUNTRY"),
            "YEAR": row.get("YEAR"),
            "IMF_GDP_Growth": actual,
            "Predicted_GDP_Growth": predicted,
            "Prediction_Error": error,
            "Crisis_Probability": imf.get("Crisis_Probability"),
            "Risk_Level": imf.get("Risk_Level"),
            "Early_Warning_Flag": imf.get("Early_Warning_Flag"),
        })

    return {"data": output}

