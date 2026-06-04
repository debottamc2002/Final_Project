# Hybrid Macroeconomic Surveillance System
### IMF WEO Panel Dataset · 162 Countries · 1995–2023

A three-layer macroeconomic surveillance framework combining 
econometric panel models, machine learning, and deep learning 
to forecast GDP growth and flag countries at risk of economic crisis.

---

## Three Deliverables
| Deliverable | Type | Output |
|---|---|---|
| Country Instability Index | Unsupervised | Score 0–100 per country-year |
| GDP Growth Forecast | Regression | Predicted GDP growth (%) |
| Early Warning System | Classification | Crisis probability (0–100%) |

---

## Project Structure
## Dataset
- Source: IMF World Economic Outlook (WEO)
- Countries: 177 (after cleaning from 197)
- Years: 1995–2023
- Indicators: 12 macroeconomic variables
- Note: Raw data not included due to size.
  Download from: (https://data.imf.org/en/Data-Explorer?datasetUrn=IMF.RES:WEO(9.0.0))

## Run Order

Each notebook saves a checkpoint CSV to `data/`.
The next notebook loads from that checkpoint.

## Setup
```bash
git clone https://github.com/YOUR_USERNAME/major_project.git
cd major_project
pip install -r requirements.txt
```
Place `final dataset.csv` in the `data/` folder.
Then run notebooks in order.

## Progress
- [x] Data preparation
- [x] Feature engineering
- [x] Layer 1 — Instability Index
- [x] EDA
- [x] Layer 2a — Econometric baseline (FE, RE, FD-OLS)
- [x] Layer 2b — ML models (LR, ElasticNet, SVR, RF, XGBoost)
- [ ] Layer 3 — LSTM
- [ ] Early Warning System
- [ ] Model comparison
- [ ] Deployment

## Key Results (so far)
| Model | CV R² | Test RMSE |
|---|---|---|
| Fixed Effects (two-way) | — | 7.267 |
| Random Forest | 0.264 | TBD |
| XGBoost | 0.160 | TBD |

## Tech Stack
Python · Pandas · Scikit-learn · XGBoost · Statsmodels
Linearmodels · SHAP · TensorFlow · Streamlit