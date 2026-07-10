from pathlib import Path

import pandas as pd
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"

app = FastAPI(
    title="Hybrid Macroeconomic Surveillance API",
    description="API for GDP forecasts, instability risk, and EWS outputs.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten later if needed
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def load_csv(filename: str) -> pd.DataFrame:
    path = DATA_DIR / filename
    if not path.exists():
        raise FileNotFoundError(f"{filename} not found in data directory.")
    return pd.read_csv(path)


@app.get("/")
def root():
    return {
        "message": "Hybrid Macroeconomic Surveillance API",
        "endpoints": [
            "/health",
            "/countries",
            "/ews",
            "/ews/top-risk",
            "/ews/low-risk",
            "/forecasts/ml",
            "/forecasts/lstm",
            "/models/summary",
        ],
    }


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/countries")
def countries():
    ews = load_csv("final_ews_2024_2026.csv")
    return sorted(ews["COUNTRY"].dropna().unique().tolist())


@app.get("/ews")
def ews(
    country: str | None = Query(default=None),
    year: int | None = Query(default=None),
):
    df = load_csv("final_ews_2024_2026.csv")

    if country:
        df = df[df["COUNTRY"].str.lower() == country.lower()]

    if year:
        df = df[df["YEAR"] == year]

    return df.to_dict(orient="records")


@app.get("/ews/top-risk")
def top_risk(
    year: int = Query(default=2024),
    n: int = Query(default=20),
):
    df = load_csv("final_ews_2024_2026.csv")

    df = df[df["YEAR"] == year]

    df = df.sort_values(
        "Crisis_Probability",
        ascending=False,
    ).head(n)

    return df.to_dict(orient="records")


@app.get("/ews/low-risk")
def low_risk(
    year: int = Query(default=2024),
    n: int = Query(default=20),
):
    df = load_csv("final_ews_2024_2026.csv")

    df = df[df["YEAR"] == year]

    df = df.sort_values(
        "Crisis_Probability",
        ascending=True,
    ).head(n)

    return df.to_dict(orient="records")


@app.get("/forecasts/ml")
def ml_forecasts(
    country: str | None = Query(default=None),
    year: int | None = Query(default=None),
):
    df = load_csv("layer2b_best_ml_forecasts_2024_2026.csv")

    if country:
        df = df[df["COUNTRY"].str.lower() == country.lower()]

    if year:
        df = df[df["YEAR"] == year]

    return df.to_dict(orient="records")


@app.get("/forecasts/lstm")
def lstm_forecasts(
    country: str | None = Query(default=None),
    year: int | None = Query(default=None),
):
    df = load_csv("layer3_lstm_forecasts_2024_2026.csv")

    if country:
        df = df[df["COUNTRY"].str.lower() == country.lower()]

    if year:
        df = df[df["YEAR"] == year]

    return df.to_dict(orient="records")


@app.get("/models/summary")
def model_summary():
    df = load_csv("final_project_model_summary.csv")
    return df.to_dict(orient="records")