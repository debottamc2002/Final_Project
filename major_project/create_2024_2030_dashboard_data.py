import pandas as pd
from pathlib import Path

base = Path("08_deployment/backend/data")

old_ml = pd.read_csv(base / "layer2b_forecasts_2024_2026.csv")
old_ews = pd.read_csv(base / "final_ews_2024_2026.csv")
old_imf = pd.read_csv(base / "ews_vs_imf_projection_comparison_2024_2026.csv")

new_scenario = pd.read_csv(base / "scenario_forecasts_2026_2030.csv")

old_ml.columns = [c.strip() for c in old_ml.columns]
old_ews.columns = [c.strip() for c in old_ews.columns]
old_imf.columns = [c.strip() for c in old_imf.columns]
new_scenario.columns = [c.strip() for c in new_scenario.columns]

old_ml["YEAR"] = old_ml["YEAR"].astype(int)
old_ews["YEAR"] = old_ews["YEAR"].astype(int)
old_imf["YEAR"] = old_imf["YEAR"].astype(int)
new_scenario["YEAR"] = new_scenario["YEAR"].astype(int)

forecast_col = "Random Forest_Forecast"

old_part = old_ml[["COUNTRY", "YEAR", forecast_col]].copy()
old_part = old_part.rename(columns={
    forecast_col: "Predicted_GDP_Growth"
})

old_part = old_part.merge(
    old_imf[["COUNTRY", "YEAR", "GDP_Growth"]],
    on=["COUNTRY", "YEAR"],
    how="left"
)

old_part = old_part.rename(columns={
    "GDP_Growth": "IMF_GDP_Growth"
})

old_part = old_part.merge(
    old_ews[["COUNTRY", "YEAR", "Crisis_Probability", "Risk_Level", "Early_Warning_Flag"]],
    on=["COUNTRY", "YEAR"],
    how="left"
)

old_part["Prediction_Error"] = (
    old_part["IMF_GDP_Growth"] - old_part["Predicted_GDP_Growth"]
)

old_part = old_part[
    [
        "COUNTRY",
        "YEAR",
        "IMF_GDP_Growth",
        "Predicted_GDP_Growth",
        "Prediction_Error",
        "Crisis_Probability",
        "Risk_Level",
        "Early_Warning_Flag",
    ]
]

future_part = new_scenario[new_scenario["YEAR"].isin([2027, 2028, 2029, 2030])].copy()

future_part = future_part[
    [
        "COUNTRY",
        "YEAR",
        "IMF_GDP_Growth",
        "Predicted_GDP_Growth",
        "Prediction_Error",
        "Crisis_Probability",
        "Risk_Level",
        "Early_Warning_Flag",
    ]
]

combined = pd.concat([old_part, future_part], ignore_index=True)

combined = combined.sort_values(["YEAR", "COUNTRY"])

combined.to_csv(
    base / "scenario_forecasts_2024_2030.csv",
    index=False
)

top_high_2024_2026 = (
    combined[combined["YEAR"].isin([2024, 2025, 2026])]
    .sort_values("Crisis_Probability", ascending=False)
    .head(20)
)

top_low_2024_2026 = (
    combined[combined["YEAR"].isin([2024, 2025, 2026])]
    .sort_values("Crisis_Probability", ascending=True)
    .head(20)
)

top_high_2027_2030 = (
    combined[combined["YEAR"].isin([2027, 2028, 2029, 2030])]
    .sort_values("Crisis_Probability", ascending=False)
    .head(20)
)

top_low_2027_2030 = (
    combined[combined["YEAR"].isin([2027, 2028, 2029, 2030])]
    .sort_values("Crisis_Probability", ascending=True)
    .head(20)
)

cols = [
    "COUNTRY",
    "YEAR",
    "Crisis_Probability",
    "Risk_Level",
    "Early_Warning_Flag",
]

top_high_2024_2026[cols].to_csv(
    base / "ews_top20_high_risk_2024_2026.csv",
    index=False
)

top_low_2024_2026[cols].to_csv(
    base / "ews_top20_low_risk_2024_2026.csv",
    index=False
)

top_high_2027_2030[cols].to_csv(
    base / "ews_top20_high_risk_2027_2030.csv",
    index=False
)

top_low_2027_2030[cols].to_csv(
    base / "ews_top20_low_risk_2027_2030.csv",
    index=False
)

print("Created combined scenario file")
print("Rows:", len(combined))
print("Countries:", combined["COUNTRY"].nunique())
print("Years:", sorted(combined["YEAR"].unique()))