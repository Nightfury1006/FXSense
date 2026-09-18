# FXSense: Adaptive Multi-Source Currency Exchange Rate Forecasting & Market Intelligence System

> **Academic Capstone Project & Interactive Product Prototype**  
> An advanced currency forecasting platform combining historical exchange-rate time series, external macroeconomic signals (Gold, Crude Oil, S&P 500), statistical baselines (ARIMA), deep-learning architectures (LSTM, BiLSTM), and a validation-weighted adaptive ensemble.

---

## 🌐 Live Interactive Web Demo
Deployable directly via **GitHub Pages** — visitors can click and immediately explore currency forecasts, market regimes, and scenario stress tests without installing any software:
👉 **`https://<your-github-username>.github.io/FXSense`**

---

## 🌟 Key Highlights & Innovations

1. **Multi-Source Market Intelligence**:
   - Integrates currency pairs (`EUR/USD`, `GBP/USD`, `USD/JPY`, `AUD/USD`, `USD/CAD`) with synchronized external drivers:
     - 🪙 **Gold (`XAU/USD`)**: Safe haven & monetary debasement anchor.
     - 🛢 **Crude Oil (`WTI`)**: Energy terms-of-trade and inflationary pressure.
     - 📈 **S&P 500 (`^GSPC`)**: Global equity risk sentiment.
2. **Hybrid Forecasting Suite**:
   - **ARIMA**: Statistical baseline using Augmented Dickey-Fuller (ADF) differencing for stationarity.
   - **Univariate LSTM**: Sequential deep-learning mapping non-linear temporal dependencies.
   - **BiLSTM (Bidirectional LSTM)**: Deep representation evaluating both forward and backward temporal context.
   - **Multivariate Deep Learning**: Merges currency sequences with multi-market return series.
   - **Adaptive Ensemble**: Dynamically weights models based on chronological validation MSE ($w_i \propto 1/\text{MSE}_{\text{val}, i}$).
3. **Market-Regime Awareness**:
   - Identifies changing market volatility and momentum in real-time (*Stable/Low-Vol*, *Trending Bullish*, *Trending Bearish*, *High-Volatility/Shock*).
   - Dynamically calibrates uncertainty bands and safe expected ranges.
4. **Senior-Accessible & Human-Centric Interface**:
   - **No Cliché AI Styling**: Built on a calm, warm ivory stone palette (`#F9F9F6`) with crisp white surfaces and dark charcoal high-contrast typography (WCAG AAA).
   - **🔊 Voice Narration (`Web Speech API`)**: A prominent "Read Out Forecast" button that speaks the market explanation in clear audio.
   - **Font-Size Scaler**: One-click switching between **Normal (A)**, **Large (A+)**, and **Extra Large (A++)** text sizing.
   - **Interactive What-If Scenario Simulator**: Adjust sliders for Gold, Oil, and S&P 500 shifts to test exchange rate elasticity.

---

## 📊 Evaluation & Leakage-Free Validation

- **Chronological Split**: 70% Train / 15% Validation / 15% Test.
- **Zero Lookahead Bias**: Feature scalers fitted strictly on training data; ensemble weights derived exclusively from validation performance; held-out test partition untouched until final evaluation.
- **Metrics Evaluated**:
  - **RMSE** (Root Mean Squared Error)
  - **MAE** (Mean Absolute Error)
  - **MAPE** (Mean Absolute Percentage Error)
  - **Directional Accuracy (%)**

---

## 🚀 Running Locally

### Option 1: Double-Click Launcher (Windows)
Navigate to the project folder and double-click:
```
run.bat
```

### Option 2: Python Command Line
```powershell
python run.py
```
The server will initialize all models and automatically open your default browser to:
👉 **`http://127.0.0.1:5000`**

---

## 📁 Repository Structure

```
FXSense/
├── index.html                     # Standalone dashboard entry (for GitHub Pages)
├── app.py                         # Flask Web Server & REST API backend
├── run.py                         # Local launcher with auto-browser opening
├── run.bat                        # Windows 1-click launch batch script
├── data/
│   └── synthetic_market_data.py   # Multi-source financial series generator
├── models/
│   └── forecasting_engine.py      # ARIMA, LSTM, BiLSTM, Ensemble & Regimes
├── static/
│   ├── css/
│   │   └── style.css              # Accessible warm palette stylesheet
│   └── js/
│       ├── app.js                 # App state, dual-mode API/client engine
│       └── charts.js              # High-contrast Canvas chart renderer
└── templates/
    └── index.html                 # Flask template file
```

---

## 📄 License
Academic Capstone & Open Educational Project.
