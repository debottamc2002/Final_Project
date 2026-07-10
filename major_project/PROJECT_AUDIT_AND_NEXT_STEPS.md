# Project audit and next-layer implementation guide

This review is based on the notebooks and files currently in:

`C:\Users\Ananya Manna\OneDrive\Desktop\FINAL PROJECT\major_project`

## Overall assessment

Status: needs revision before final thesis submission.

The pipeline is conceptually strong and the ML layer is mostly in place, but the project is not yet reproducible end-to-end. The main issues are data-path inconsistency, use of 2024-2026 IMF projection rows as if they were normal observed data, future leakage in the instability index construction, an invalid fixed-effects prediction method, empty LSTM/model-comparison notebooks, and an EWS notebook that predicts GDP direction rather than crisis risk.

## Mandatory fixes before continuing

1. Standardize the data folder.

   The notebooks use `data/...`, but the available CSVs are under the root `Dataset/` folder. Create `major_project/data/` and keep every notebook checkpoint there, or update every notebook to use a shared path helper.

   ```python
   from pathlib import Path

   PROJECT_ROOT = Path.cwd()
   if PROJECT_ROOT.name != "major_project":
       PROJECT_ROOT = PROJECT_ROOT / "major_project"

   DATA_DIR = PROJECT_ROOT / "data"
   FALLBACK_DATA_DIR = PROJECT_ROOT.parent / "Dataset"
   if not DATA_DIR.exists() and FALLBACK_DATA_DIR.exists():
       DATA_DIR = FALLBACK_DATA_DIR

   MODELS_DIR = PROJECT_ROOT / "models"
   OUTPUT_DIR = PROJECT_ROOT / "outputs"
   MODELS_DIR.mkdir(exist_ok=True)
   OUTPUT_DIR.mkdir(exist_ok=True)
   ```

2. Separate observed data from IMF projections.

   Your raw WEO file contains 1995-2026. For thesis wording:

   - 1995-2023: observed or mostly observed historical panel
   - 2024-2026: IMF projection/scenario years

   Do not evaluate model accuracy on 2024-2026. Treat those rows as scenario forecasts only.

   ```python
   OBSERVED_END = 2023
   TRAIN_END = 2019
   COVID_YEARS = [2020, 2021]
   TEST_YEARS = [2022, 2023]
   SCENARIO_YEARS = [2024, 2025, 2026]
   ```

3. Rebuild the virtual environment.

   The current `venv` points to a missing Python executable. Recreate it before final execution:

   ```powershell
   cd "C:\Users\Ananya Manna\OneDrive\Desktop\FINAL PROJECT"
   py -3.12 -m venv venv
   .\venv\Scripts\Activate.ps1
   pip install -r .\major_project\08_deployment\requirements.txt
   pip install jupyter nbconvert linearmodels matplotlib seaborn joblib streamlit
   ```

## Layer-by-layer errors and modifications

### 00 Data preparation

What works:

- Raw WEO reshape from wide to country-year panel is correct.
- Missingness profiling is useful.
- Interpolation is limited for short gaps, which is defensible.

Fixes needed:

- The notebook says 20 countries removed in the final printout, but the executed output removed 22 countries.
- The imputation flag summary is inconsistent: one output says 7102 imputed cells, later output says 4.09 percent. Recompute the final imputation rate from the final feature matrix only.
- 2024-2026 projection years must be labelled clearly.
- `data/data_raw.csv` is required but not present in `major_project/data`.

Suggested final checks:

```python
assert df_panel.duplicated(["COUNTRY", "YEAR"]).sum() == 0
assert df_panel["GDP_Growth"].notna().all()
assert df_panel["YEAR"].min() >= 1995
assert df_panel["YEAR"].max() <= 2026

impute_cols = [c for c in df_panel.columns if c.endswith("_imputed")]
print("Final imputation rate:", df_panel[impute_cols].mean().mean())
```

### 01 Feature engineering

What works:

- Lagged variables use `shift(1)`, which avoids direct target leakage.
- Rolling means/std use shifted values, which is correct.
- Stationarity testing and differencing are appropriate for the econometric layer.

Fixes needed:

- Do not fit stationarity decisions or transformations using 2024-2026 projection years unless those years are explicitly part of a scenario dataset.
- Save a data dictionary listing which features are used for each layer.
- Consider winsorizing extreme GDP growth values for robustness checks, not necessarily for the main model.

### 02 Layer 1 instability index

Major issue: future leakage.

Current code calculates within-country z-scores using each country's full 1998-2026 mean/std and fits `RobustScaler`/`MinMaxScaler` on all years. That allows 2022-2026 information to influence earlier instability scores.

Fix:

- Fit country means/std and scalers on training years only.
- Apply those parameters to later years.
- Keep `Instability_Index_lag1` for forecasting models.
- Do not use the same-year `Instability_Index` as a predictor of same-year GDP growth.

Training-safe pattern:

```python
from sklearn.preprocessing import RobustScaler, MinMaxScaler
from scipy.stats import mstats
import numpy as np

TRAIN_END = 2019
train_mask = df_panel["YEAR"] <= TRAIN_END

instability_indicators = [
    "Inflation", "GDP_Growth", "Fiscal_Balance", "Debt", "Current_Account"
]

for col in instability_indicators:
    stats_by_country = (
        df_panel.loc[train_mask]
        .groupby("COUNTRY")[col]
        .agg(["mean", "std"])
        .rename(columns={"mean": f"{col}_train_mean", "std": f"{col}_train_std"})
    )
    df_panel = df_panel.merge(stats_by_country, on="COUNTRY", how="left")
    global_mean = df_panel.loc[train_mask, col].mean()
    global_std = df_panel.loc[train_mask, col].std()
    mu = df_panel[f"{col}_train_mean"].fillna(global_mean)
    sigma = df_panel[f"{col}_train_std"].replace(0, np.nan).fillna(global_std)
    df_panel[f"{col}_zscore"] = (df_panel[col] - mu) / (sigma + 1e-8)

for col in instability_indicators:
    df_panel[f"{col}_shock"] = (
        df_panel.groupby("COUNTRY")[col].diff().abs()
    )

volatility_cols = [f"{col}_rollstd3" for col in instability_indicators]
zscore_cols = [f"{col}_zscore" for col in instability_indicators]
shock_cols = [f"{col}_shock" for col in instability_indicators]
all_comp_cols = zscore_cols + volatility_cols + shock_cols

for col in all_comp_cols:
    df_panel[col] = mstats.winsorize(df_panel[col].fillna(0), limits=[0.05, 0.05])

robust_scaler = RobustScaler()
minmax_scaler = MinMaxScaler(feature_range=(0, 100))

df_panel.loc[train_mask, all_comp_cols] = robust_scaler.fit_transform(
    df_panel.loc[train_mask, all_comp_cols]
)
df_panel.loc[~train_mask, all_comp_cols] = robust_scaler.transform(
    df_panel.loc[~train_mask, all_comp_cols]
)
df_panel[all_comp_cols] = df_panel[all_comp_cols].clip(0, 1)

df_panel["z_component"] = df_panel[zscore_cols].abs().mean(axis=1)
df_panel["vol_component"] = df_panel[volatility_cols].mean(axis=1)
df_panel["shock_component"] = df_panel[shock_cols].mean(axis=1)

raw_index = (
    0.30 * df_panel["z_component"]
    + 0.40 * df_panel["vol_component"]
    + 0.30 * df_panel["shock_component"]
)

df_panel.loc[train_mask, "Instability_Index"] = minmax_scaler.fit_transform(
    raw_index.loc[train_mask].to_frame()
)
df_panel.loc[~train_mask, "Instability_Index"] = minmax_scaler.transform(
    raw_index.loc[~train_mask].to_frame()
)

df_panel["Instability_Index"] = df_panel["Instability_Index"].clip(0, 100)
df_panel["Instability_Index_lag1"] = (
    df_panel.sort_values(["COUNTRY", "YEAR"])
    .groupby("COUNTRY")["Instability_Index"]
    .shift(1)
)
```

### 03 Layer 2a econometric baseline

Major issue: fixed-effects predictions are not correct.

The current code predicts FE models with:

```python
X_test.values @ fe_model.params.values
```

That uses only common slope coefficients and drops the country fixed effect. For an entity FE model, predicted GDP growth should include the country effect for countries seen in training.

Other issue:

- The Hausman statistic is negative, so the reported "Use RANDOM EFFECTS" conclusion is not reliable. A negative Hausman statistic usually means the robust covariance difference is not positive semi-definite. Report it as inconclusive and keep FE as the conservative baseline.

Safer FE prediction helper:

```python
def predict_entity_fe(fe_result, X, index):
    beta_pred = X @ fe_result.params
    effects = fe_result.estimated_effects
    entity_effect = (
        effects.reset_index()
        .groupby("COUNTRY")["estimated_effects"]
        .mean()
    )
    country_effect = index.get_level_values("COUNTRY").map(entity_effect).fillna(0)
    return np.asarray(beta_pred) + np.asarray(country_effect)

fe_pred = predict_entity_fe(fe_model, X_test, X_test.index)
```

### 04 Layer 2b ML models

What works:

- Time-based train/test split is appropriate.
- Cross-validation uses rolling validation years.
- RF/XGBoost/ElasticNet/SVR comparison is useful.
- The COVID stress test is a good addition.

Fixes needed:

- The notebook saves models to `models/`, but `major_project/models` currently contains only `model_registry.json`. Rerun after fixing the data folder.
- `model_registry.json` disagrees with notebook outputs. It says 15 features and worse metrics, while the notebook uses 24 features and shows RF RMSE 4.591.
- Add a naive baseline: predict next-year GDP growth as last-year GDP growth. This shows whether ML beats a simple autoregressive rule.
- Treat 2024-2026 as scenario forecasts, not accuracy-tested forecasts.

Naive baseline:

```python
naive_pred = test["GDP_Growth_lag1"].to_numpy()
naive_result = eval_period(
    "Naive lag1 baseline",
    y_test,
    naive_pred,
    "Post-COVID test (2022-23)"
)
print(naive_result)
```

## Layer 3 LSTM code

Paste this into `05_layer3_lstm.ipynb` after fixing the data path.

```python
import os
import json
import joblib
import numpy as np
import pandas as pd
from pathlib import Path

from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score

import tensorflow as tf
from tensorflow.keras import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau

PROJECT_ROOT = Path.cwd()
if PROJECT_ROOT.name != "major_project":
    PROJECT_ROOT = PROJECT_ROOT / "major_project"

DATA_DIR = PROJECT_ROOT / "data"
if not (DATA_DIR / "03_panel_instability.csv").exists():
    DATA_DIR = PROJECT_ROOT.parent / "Dataset"

MODELS_DIR = PROJECT_ROOT / "models"
OUTPUT_DIR = PROJECT_ROOT / "outputs"
MODELS_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)

TRAIN_END = 2019
TEST_YEARS = [2022, 2023]
COVID_YEARS = [2020, 2021]
SCENARIO_YEARS = [2024, 2025, 2026]
SEQ_LEN = 3

df = pd.read_csv(DATA_DIR / "03_panel_instability.csv")
df = df.sort_values(["COUNTRY", "YEAR"]).copy()

sequence_features = [
    "GDP_Growth",
    "Inflation",
    "Exports",
    "Imports",
    "Fiscal_Balance",
    "Current_Account",
    "Debt",
    "Revenue",
    "Expenditure",
    "Savings",
    "Investment",
    "Instability_Index",
]
sequence_features = [c for c in sequence_features if c in df.columns]

df_model = df.dropna(subset=sequence_features + ["GDP_Growth"]).copy()

def make_sequences(panel, target_years=None):
    X, y, meta = [], [], []
    for country, grp in panel.groupby("COUNTRY"):
        grp = grp.sort_values("YEAR").reset_index(drop=True)
        values = grp[sequence_features].to_numpy(dtype=float)
        targets = grp["GDP_Growth"].to_numpy(dtype=float)
        years = grp["YEAR"].to_numpy()
        for i in range(SEQ_LEN, len(grp)):
            target_year = int(years[i])
            if target_years is not None and target_year not in target_years:
                continue
            X.append(values[i - SEQ_LEN:i])
            y.append(targets[i])
            meta.append({"COUNTRY": country, "YEAR": target_year})
    return np.asarray(X), np.asarray(y), pd.DataFrame(meta)

X_train, y_train, train_meta = make_sequences(
    df_model[df_model["YEAR"] <= TRAIN_END]
)
X_test, y_test, test_meta = make_sequences(df_model, TEST_YEARS)
X_covid, y_covid, covid_meta = make_sequences(df_model, COVID_YEARS)
X_scenario, y_scenario, scenario_meta = make_sequences(df_model, SCENARIO_YEARS)

n_features = X_train.shape[-1]
scaler = StandardScaler()
X_train_2d = X_train.reshape(-1, n_features)
scaler.fit(X_train_2d)

def scale_sequences(X):
    original_shape = X.shape
    return scaler.transform(X.reshape(-1, n_features)).reshape(original_shape)

X_train_s = scale_sequences(X_train)
X_test_s = scale_sequences(X_test)
X_covid_s = scale_sequences(X_covid)
X_scenario_s = scale_sequences(X_scenario)

tf.keras.utils.set_random_seed(42)

model = Sequential([
    LSTM(64, input_shape=(SEQ_LEN, n_features), return_sequences=False),
    Dropout(0.20),
    Dense(32, activation="relu"),
    Dropout(0.10),
    Dense(1),
])

model.compile(
    optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
    loss="mse",
    metrics=["mae"],
)

callbacks = [
    EarlyStopping(monitor="val_loss", patience=20, restore_best_weights=True),
    ReduceLROnPlateau(monitor="val_loss", factor=0.5, patience=8),
]

history = model.fit(
    X_train_s,
    y_train,
    validation_split=0.15,
    epochs=200,
    batch_size=32,
    callbacks=callbacks,
    verbose=1,
)

def evaluate_regression(name, y_true, y_pred, period):
    y_true = np.asarray(y_true)
    y_pred = np.asarray(y_pred).reshape(-1)
    return {
        "Model": name,
        "Period": period,
        "N": len(y_true),
        "RMSE": round(mean_squared_error(y_true, y_pred, squared=False), 3),
        "MAE": round(mean_absolute_error(y_true, y_pred), 3),
        "R2": round(r2_score(y_true, y_pred), 3),
        "Mean_Actual": round(float(np.mean(y_true)), 3),
        "Mean_Predicted": round(float(np.mean(y_pred)), 3),
    }

pred_test = model.predict(X_test_s).reshape(-1)
pred_covid = model.predict(X_covid_s).reshape(-1)
pred_scenario = model.predict(X_scenario_s).reshape(-1)

results = pd.DataFrame([
    evaluate_regression("LSTM", y_test, pred_test, "Post-COVID test (2022-23)"),
    evaluate_regression("LSTM", y_covid, pred_covid, "COVID stress test (2020-21)"),
])

results.to_csv(DATA_DIR / "layer3_lstm_results.csv", index=False)

forecast_df = scenario_meta.copy()
forecast_df["LSTM_Forecast"] = pred_scenario
forecast_df["IMF_Projection_GDP_Growth"] = y_scenario
forecast_df.to_csv(DATA_DIR / "layer3_lstm_scenario_forecasts_2024_2026.csv", index=False)

model.save(MODELS_DIR / "lstm_gdp.keras")
joblib.dump(scaler, MODELS_DIR / "lstm_sequence_scaler.pkl")

with open(MODELS_DIR / "lstm_features.json", "w", encoding="utf-8") as f:
    json.dump(
        {"sequence_length": SEQ_LEN, "features": sequence_features},
        f,
        indent=2,
    )

display(results)
display(forecast_df.head())
```

## Corrected Layer 6 EWS classifier code

The current `06_ews_classifier.ipynb` predicts whether GDP growth improves. That is not the workflow's early warning system. Use a next-year crisis target instead.

```python
import os
import joblib
import numpy as np
import pandas as pd
from pathlib import Path

from sklearn.base import clone
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, average_precision_score, confusion_matrix
)
from sklearn.model_selection import cross_validate

import xgboost as xgb

PROJECT_ROOT = Path.cwd()
if PROJECT_ROOT.name != "major_project":
    PROJECT_ROOT = PROJECT_ROOT / "major_project"

DATA_DIR = PROJECT_ROOT / "data"
if not (DATA_DIR / "03_panel_instability.csv").exists():
    DATA_DIR = PROJECT_ROOT.parent / "Dataset"

MODELS_DIR = PROJECT_ROOT / "models"
MODELS_DIR.mkdir(exist_ok=True)

TRAIN_TARGET_END = 2019
COVID_TARGET_YEARS = [2020, 2021]
TEST_TARGET_YEARS = [2022, 2023]
SCENARIO_TARGET_YEARS = [2024, 2025, 2026]

df = pd.read_csv(DATA_DIR / "03_panel_instability.csv")
df = df.sort_values(["COUNTRY", "YEAR"]).copy()

train_threshold = df.loc[df["YEAR"] <= TRAIN_TARGET_END, "Instability_Index"].quantile(0.80)

df["GDP_Contraction_Crisis"] = (df["GDP_Growth"] <= -2).astype(int)
df["Sharp_Slowdown_Crisis"] = (
    (df["GDP_Growth"] - df["GDP_Growth_lag1"]) <= -4
).astype(int)
df["Instability_Crisis"] = (df["Instability_Index"] >= train_threshold).astype(int)

df["Crisis_Event"] = (
    (df["GDP_Contraction_Crisis"] == 1)
    | (df["Sharp_Slowdown_Crisis"] == 1)
    | (df["Instability_Crisis"] == 1)
).astype(int)

df["Crisis_Next_Year"] = df.groupby("COUNTRY")["Crisis_Event"].shift(-1)
df["Target_Year"] = df["YEAR"] + 1

feature_cols = [
    "GDP_Growth_lag1",
    "GDP_Growth_rollmean3",
    "Inflation_lag1_log",
    "Exports_lag1",
    "Imports_lag1",
    "Fiscal_Balance_lag1",
    "Current_Account_lag1",
    "Debt_diff_lag1",
    "Expenditure_diff_lag1",
    "Revenue_diff_lag1",
    "Savings_diff_lag1",
    "Investment_diff_lag1",
    "Instability_Index_lag1",
]

volatility_cols = [
    c for c in [
        "GDP_Growth_rollstd3",
        "Inflation_rollstd3",
        "Exports_rollstd3",
        "Imports_rollstd3",
        "Fiscal_Balance_rollstd3",
        "Current_Account_rollstd3",
        "Debt_rollstd3",
        "Revenue_rollstd3",
        "Expenditure_rollstd3",
        "Savings_rollstd3",
        "Investment_rollstd3",
    ]
    if c in df.columns
]
feature_cols = feature_cols + volatility_cols

df_model = df.dropna(subset=feature_cols + ["Crisis_Next_Year"]).copy()
df_model["Crisis_Next_Year"] = df_model["Crisis_Next_Year"].astype(int)

train = df_model[df_model["Target_Year"] <= TRAIN_TARGET_END].copy()
test = df_model[df_model["Target_Year"].isin(TEST_TARGET_YEARS)].copy()
covid = df_model[df_model["Target_Year"].isin(COVID_TARGET_YEARS)].copy()
scenario = df_model[df_model["Target_Year"].isin(SCENARIO_TARGET_YEARS)].copy()

X_train = train[feature_cols].to_numpy()
y_train = train["Crisis_Next_Year"].to_numpy()
X_test = test[feature_cols].to_numpy()
y_test = test["Crisis_Next_Year"].to_numpy()
X_covid = covid[feature_cols].to_numpy()
y_covid = covid["Crisis_Next_Year"].to_numpy()
X_scenario = scenario[feature_cols].to_numpy()

train_years = train["Target_Year"].to_numpy()
time_splits = []
for validation_year in [2015, 2016, 2017, 2018, 2019]:
    train_idx = np.flatnonzero(train_years < validation_year)
    valid_idx = np.flatnonzero(train_years == validation_year)
    if len(train_idx) and len(valid_idx):
        time_splits.append((train_idx, valid_idx))

positive_rate = y_train.mean()
scale_pos_weight = (1 - positive_rate) / max(positive_rate, 1e-6)

classifiers = {
    "Logistic Regression": {
        "model": LogisticRegression(max_iter=2000, class_weight="balanced"),
        "scaled": True,
    },
    "Random Forest": {
        "model": RandomForestClassifier(
            n_estimators=400,
            max_depth=8,
            min_samples_leaf=5,
            class_weight="balanced_subsample",
            random_state=42,
            n_jobs=1,
        ),
        "scaled": False,
    },
    "XGBoost": {
        "model": xgb.XGBClassifier(
            n_estimators=300,
            max_depth=3,
            learning_rate=0.05,
            subsample=0.8,
            colsample_bytree=0.8,
            eval_metric="logloss",
            scale_pos_weight=scale_pos_weight,
            random_state=42,
            n_jobs=1,
        ),
        "scaled": False,
    },
}

def evaluate_classifier(name, y_true, proba, period, threshold=0.50):
    pred = (proba >= threshold).astype(int)
    return {
        "Model": name,
        "Period": period,
        "N": len(y_true),
        "Accuracy": round(accuracy_score(y_true, pred), 3),
        "Precision": round(precision_score(y_true, pred, zero_division=0), 3),
        "Recall": round(recall_score(y_true, pred, zero_division=0), 3),
        "F1": round(f1_score(y_true, pred, zero_division=0), 3),
        "ROC_AUC": round(roc_auc_score(y_true, proba), 3),
        "PR_AUC": round(average_precision_score(y_true, proba), 3),
        "Positive_Rate": round(float(np.mean(y_true)), 3),
    }

trained = {}
cv_rows = []
test_rows = []

scoring = {
    "roc_auc": "roc_auc",
    "average_precision": "average_precision",
    "f1": "f1",
    "recall": "recall",
}

for name, cfg in classifiers.items():
    estimator = clone(cfg["model"])
    if cfg["scaled"]:
        pipeline = Pipeline([("scaler", StandardScaler()), ("model", estimator)])
    else:
        pipeline = Pipeline([("model", estimator)])

    scores = cross_validate(
        pipeline,
        X_train,
        y_train,
        cv=time_splits,
        scoring=scoring,
        n_jobs=1,
        error_score="raise",
    )

    cv_rows.append({
        "Model": name,
        "CV_ROC_AUC": round(scores["test_roc_auc"].mean(), 3),
        "CV_PR_AUC": round(scores["test_average_precision"].mean(), 3),
        "CV_F1": round(scores["test_f1"].mean(), 3),
        "CV_Recall": round(scores["test_recall"].mean(), 3),
    })

    pipeline.fit(X_train, y_train)
    trained[name] = pipeline
    joblib.dump(pipeline, MODELS_DIR / f"ews_{name.lower().replace(' ', '_')}.pkl")

    proba_test = pipeline.predict_proba(X_test)[:, 1]
    proba_covid = pipeline.predict_proba(X_covid)[:, 1]
    test_rows.append(evaluate_classifier(name, y_test, proba_test, "Post-COVID test target (2022-23)"))
    test_rows.append(evaluate_classifier(name, y_covid, proba_covid, "COVID stress target (2020-21)"))

cv_results = pd.DataFrame(cv_rows)
test_results = pd.DataFrame(test_rows)

cv_results.to_csv(DATA_DIR / "ews_cv_results.csv", index=False)
test_results.to_csv(DATA_DIR / "ews_test_results.csv", index=False)

best_name = test_results[
    test_results["Period"] == "Post-COVID test target (2022-23)"
].sort_values(["ROC_AUC", "PR_AUC"], ascending=False).iloc[0]["Model"]

best_model = trained[best_name]
scenario_output = scenario[["COUNTRY", "YEAR", "Target_Year"]].copy()
scenario_output["Crisis_Probability"] = best_model.predict_proba(X_scenario)[:, 1]
scenario_output["Risk_Band"] = pd.cut(
    scenario_output["Crisis_Probability"],
    bins=[0, 0.25, 0.50, 0.75, 1.0],
    labels=["Low", "Watch", "High", "Severe"],
    include_lowest=True,
)
scenario_output.to_csv(DATA_DIR / "ews_crisis_probabilities_2024_2026.csv", index=False)

display(cv_results)
display(test_results.sort_values(["Period", "ROC_AUC"], ascending=[True, False]))
display(scenario_output.head())
```

## Layer 7 model comparison code

Paste this into `07_model_comparison.ipynb`.

```python
import pandas as pd
import matplotlib.pyplot as plt
from pathlib import Path

PROJECT_ROOT = Path.cwd()
if PROJECT_ROOT.name != "major_project":
    PROJECT_ROOT = PROJECT_ROOT / "major_project"

DATA_DIR = PROJECT_ROOT / "data"
if not (DATA_DIR / "layer2b_results.csv").exists():
    DATA_DIR = PROJECT_ROOT.parent / "Dataset"

OUTPUT_DIR = PROJECT_ROOT / "outputs"
OUTPUT_DIR.mkdir(exist_ok=True)

frames = []

layer2a_path = DATA_DIR / "layer2a_results.csv"
if layer2a_path.exists():
    l2a = pd.read_csv(layer2a_path)
    l2a["Layer"] = "Layer 2a Econometric"
    frames.append(l2a)

layer2b_path = DATA_DIR / "layer2b_results.csv"
if layer2b_path.exists():
    l2b = pd.read_csv(layer2b_path)
    l2b["Layer"] = "Layer 2b ML"
    frames.append(l2b)

layer3_path = DATA_DIR / "layer3_lstm_results.csv"
if layer3_path.exists():
    l3 = pd.read_csv(layer3_path)
    l3["Layer"] = "Layer 3 LSTM"
    frames.append(l3)

comparison = pd.concat(frames, ignore_index=True)
main_period = comparison[
    comparison["Period"].str.contains("2022-23|Full test", case=False, na=False)
].copy()

main_period = main_period.sort_values("RMSE")
main_period.to_csv(DATA_DIR / "model_comparison_summary.csv", index=False)

display(main_period[["Layer", "Model", "Period", "N", "RMSE", "MAE", "R2"]])

plt.figure(figsize=(10, 5))
labels = main_period["Layer"] + "\n" + main_period["Model"]
plt.bar(labels, main_period["RMSE"])
plt.ylabel("RMSE")
plt.title("Model comparison on observed test years")
plt.xticks(rotation=30, ha="right")
plt.tight_layout()
plt.savefig(OUTPUT_DIR / "model_comparison_rmse.png", dpi=150)
plt.show()

best = main_period.iloc[0]
print(
    f"Best observed-test model: {best['Layer']} / {best['Model']} "
    f"with RMSE={best['RMSE']} and R2={best['R2']}"
)
```

## Explainability layer

Keep the SHAP layer for XGBoost, but add a small table explaining the direction of effect. For the final thesis, report:

- RF feature importance
- XGBoost SHAP mean absolute importance
- Econometric FE coefficients with confidence intervals
- LSTM limitation: harder to interpret; use sequence sensitivity or leave as predictive benchmark

## Deployment checklist

Your current `08_deployment/app.py` is only a placeholder. A minimal Streamlit app should load:

- `model_comparison_summary.csv`
- `layer2b_forecasts_2024_2026.csv`
- `layer3_lstm_scenario_forecasts_2024_2026.csv`
- `ews_crisis_probabilities_2024_2026.csv`

Minimal app skeleton:

```python
import streamlit as st
import pandas as pd
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
if not DATA_DIR.exists():
    DATA_DIR = ROOT.parent / "Dataset"

st.set_page_config(page_title="Macroeconomic EWS", layout="wide")
st.title("Hybrid Macroeconomic Surveillance System")

country = st.text_input("Country contains", "")

def load_csv(name):
    path = DATA_DIR / name
    if path.exists():
        return pd.read_csv(path)
    st.warning(f"Missing file: {name}")
    return pd.DataFrame()

comparison = load_csv("model_comparison_summary.csv")
ews = load_csv("ews_crisis_probabilities_2024_2026.csv")

st.subheader("Model comparison")
st.dataframe(comparison, use_container_width=True)

st.subheader("Early warning probabilities")
if not ews.empty and country:
    ews = ews[ews["COUNTRY"].str.contains(country, case=False, na=False)]
st.dataframe(ews.sort_values(["Target_Year", "Crisis_Probability"], ascending=[True, False]), use_container_width=True)
```

## Recommended execution order

1. Fix `data/` paths and rerun notebooks 00-02.
2. Rebuild Layer 1 with training-only scaling.
3. Rerun Layer 2a with corrected FE prediction or report FE as coefficient baseline only.
4. Rerun Layer 2b and add the naive baseline.
5. Run Layer 3 LSTM.
6. Replace the GDP-direction classifier with the EWS crisis classifier.
7. Run model comparison.
8. Build the Streamlit app.
9. Update README with final country count, years, metrics, and caveats.

## Thesis caveats to state clearly

- WEO 2024-2026 values are IMF projections, not observed realized outcomes.
- The EWS crisis label is model-defined unless you add an external crisis database.
- Results are predictive and associational, not causal.
- COVID years are treated separately because they are structural shock years.
- Country fixed effects are useful for interpretation, but out-of-sample FE prediction must handle entity effects carefully.
