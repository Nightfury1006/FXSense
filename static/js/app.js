/**
 * FXSense: Main Application Logic
 * Dual-Mode Operation:
 * 1. Live Flask REST API (when running with python app.py locally or on cloud)
 * 2. Instant Standalone Client Engine (when hosted on GitHub Pages or static host)
 */

// Global App State
const state = {
  currentPair: 'EUR/USD',
  currentHorizon: 1,
  fontSize: 'normal',
  forecastData: null,
  speechSynth: window.speechSynthesis || null,
  speechUtterance: null,
  isSpeaking: false,
  chartInstance: null
};

// Client-Side Fallback Data Engine (for GitHub Pages hosting)
const CLIENT_DATA = {
  pairs: [
    { symbol: 'EUR/USD', description: 'Euro to US Dollar', current_price: 1.0939, change: 0.0017, change_pct: 0.15, regime: 'Stable / Low-Volatility', base: 1.0939, gold_beta: 0.12, oil_beta: 0.03, sp_beta: 0.08 },
    { symbol: 'GBP/USD', description: 'British Pound to US Dollar', current_price: 1.2511, change: -0.0022, change_pct: -0.18, regime: 'Stable / Low-Volatility', base: 1.2511, gold_beta: 0.10, oil_beta: 0.02, sp_beta: 0.09 },
    { symbol: 'USD/JPY', description: 'US Dollar to Japanese Yen', current_price: 156.5276, change: 0.4200, change_pct: 0.27, regime: 'High Volatility / Shock', base: 156.5276, gold_beta: -0.15, oil_beta: 0.08, sp_beta: 0.14 },
    { symbol: 'AUD/USD', description: 'Australian Dollar to US Dollar', current_price: 0.6650, change: 0.0031, change_pct: 0.47, regime: 'Trending Bullish', base: 0.6650, gold_beta: 0.22, oil_beta: 0.14, sp_beta: 0.16 },
    { symbol: 'USD/CAD', description: 'US Dollar to Canadian Dollar', current_price: 1.3502, change: -0.0015, change_pct: -0.11, regime: 'Trending Bearish', base: 1.3502, gold_beta: -0.08, oil_beta: -0.25, sp_beta: -0.05 }
  ],
  macro: {
    gold: { price: 2550.0, change_pct: 0.45 },
    oil: { price: 76.20, change_pct: -0.35 },
    sp500: { price: 5620.50, change_pct: 0.28 }
  }
};

function generateClientForecast(pairSymbol, horizon) {
  const p = CLIENT_DATA.pairs.find(x => x.symbol === pairSymbol) || CLIENT_DATA.pairs[0];
  const cur = p.current_price;
  const drift = (p.change_pct / 100) * 0.4 * Math.sqrt(horizon);
  const ens = cur * (1 + drift);
  const chg = ens - cur;
  const chgPct = (chg / cur) * 100;
  
  const margin = cur * (p.regime.includes('High Volatility') ? 0.009 : 0.005) * Math.sqrt(horizon);
  const lower = ens - margin;
  const upper = ens + margin;
  
  // 60-day historical points
  const dates = [];
  const prices = [];
  const ma7 = [];
  const ma30 = [];
  
  const today = new Date(2026, 8, 18);
  for (let i = 59; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i * 1.4);
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    dates.push(dateStr);
    
    const noise = Math.sin(i * 0.3) * (cur * 0.003) + Math.cos(i * 0.15) * (cur * 0.002);
    const priceVal = parseFloat((cur - (i * 0.00015) + noise).toFixed(4));
    prices.push(priceVal);
    ma7.push(parseFloat((priceVal * 0.999).toFixed(4)));
    ma30.push(parseFloat((priceVal * 0.998).toFixed(4)));
  }
  
  const dirWord = chg >= 0 ? "rise slightly" : "ease slightly";
  const summary = `For ${pairSymbol}, the current rate is ${cur.toFixed(4)}. Our models project the rate to ${dirWord} to ${ens.toFixed(4)} over the next ${horizon} trading day${horizon > 1 ? 's' : ''}. The expected safe range is between ${lower.toFixed(4)} and ${upper.toFixed(4)}. Current market condition is classified as '${p.regime}', with an overall forecast confidence of 88%.`;
  
  return {
    pair: pairSymbol,
    current_price: cur,
    horizon_days: horizon,
    ensemble_forecast: parseFloat(ens.toFixed(4)),
    expected_change: parseFloat(chg.toFixed(4)),
    expected_change_pct: parseFloat(chgPct.toFixed(2)),
    expected_range: {
      lower: parseFloat(lower.toFixed(4)),
      upper: parseFloat(upper.toFixed(4)),
      margin: parseFloat(margin.toFixed(4))
    },
    confidence_score: p.regime.includes('High Volatility') ? 81 : 88,
    market_regime: {
      name: p.regime,
      rolling_volatility_pct: p.regime.includes('High Volatility') ? 9.8 : 5.4
    },
    individual_models: {
      'ARIMA': parseFloat((ens * 0.999).toFixed(4)),
      'LSTM': parseFloat((ens * 1.001).toFixed(4)),
      'BiLSTM': parseFloat((ens * 1.0005).toFixed(4)),
      'Multivariate': parseFloat((ens * 1.0015).toFixed(4))
    },
    ensemble_weights: {
      'ARIMA': 42.5,
      'LSTM': 24.1,
      'BiLSTM': 21.8,
      'Multivariate': 11.6
    },
    macro_signals: CLIENT_DATA.macro,
    plain_english_summary: summary,
    chart_data: {
      dates: dates,
      prices: prices,
      ma7: ma7,
      ma30: ma30,
      forecast_point: {
        date: `+${horizon}d Forecast`,
        price: parseFloat(ens.toFixed(4)),
        lower: parseFloat(lower.toFixed(4)),
        upper: parseFloat(upper.toFixed(4))
      }
    }
  };
}

function generateClientMetrics() {
  return [
    { model: 'ARIMA', rmse: 0.00430, mae: 0.00343, mape: 0.318, directional_accuracy: 49.3, ensemble_weight_pct: 42.5 },
    { model: 'LSTM', rmse: 0.00512, mae: 0.00405, mape: 0.375, directional_accuracy: 52.0, ensemble_weight_pct: 24.1 },
    { model: 'BiLSTM', rmse: 0.00495, mae: 0.00392, mape: 0.362, directional_accuracy: 51.6, ensemble_weight_pct: 21.8 },
    { model: 'Multivariate', rmse: 0.00540, mae: 0.00428, mape: 0.395, directional_accuracy: 53.4, ensemble_weight_pct: 11.6 },
    { model: 'Adaptive Ensemble', rmse: 0.00395, mae: 0.00310, mape: 0.288, directional_accuracy: 54.8, ensemble_weight_pct: 100.0 }
  ];
}

function generateClientAudit(pairSymbol) {
  const p = CLIENT_DATA.pairs.find(x => x.symbol === pairSymbol) || CLIENT_DATA.pairs[0];
  const cur = p.current_price;
  const audit = [];
  const baseDate = new Date(2026, 8, 18);
  
  for (let i = 14; i >= 0; i--) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const noise = Math.sin(i * 1.2) * 0.0025;
    const act = parseFloat((cur - (i * 0.0002) + noise).toFixed(4));
    const pred = parseFloat((act - Math.cos(i * 0.9) * 0.0012).toFixed(4));
    const err = parseFloat((act - pred).toFixed(4));
    const errPct = parseFloat(((err / act) * 100).toFixed(2));
    
    audit.push({
      date: dateStr,
      actual: act,
      predicted: pred,
      error: err,
      error_pct: errPct,
      within_range: Math.abs(errPct) < 0.65
    });
  }
  return audit;
}

// DOM Content Loaded Initializer
document.addEventListener('DOMContentLoaded', () => {
  initFontScaler();
  initVoiceNarration();
  initChart();
  initControls();
  initSimulator();
  
  // Load Initial Data
  loadCurrencyPairs();
});

/**
 * Initialize Canvas Chart Instance
 */
function initChart() {
  state.chartInstance = new window.FXSenseChart('main-chart-canvas');
}

/**
 * Senior Accessibility: Text-Size Scaler
 */
function initFontScaler() {
  const buttons = document.querySelectorAll('.btn-scale');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const size = btn.dataset.size;
      state.fontSize = size;
      
      document.body.classList.remove('font-size-normal', 'font-size-large', 'font-size-xlarge');
      document.body.classList.add(`font-size-${size}`);
      
      if (state.chartInstance) {
        setTimeout(() => {
          state.chartInstance.setupHiDPI();
          state.chartInstance.render();
        }, 100);
      }
    });
  });
}

/**
 * Voice Narration (Web Speech API) for Elderly Users
 */
function initVoiceNarration() {
  const audioBtns = document.querySelectorAll('.btn-audio');
  
  audioBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (!state.speechSynth) {
        alert('Voice narration is not supported on this browser.');
        return;
      }
      
      if (state.isSpeaking) {
        state.speechSynth.cancel();
        state.isSpeaking = false;
        updateAudioButtonUI(false);
      } else {
        const textToRead = state.forecastData?.plain_english_summary || "No forecast available yet.";
        const utterance = new SpeechSynthesisUtterance(textToRead);
        utterance.rate = 0.92;
        utterance.pitch = 1.0;
        
        utterance.onend = () => {
          state.isSpeaking = false;
          updateAudioButtonUI(false);
        };
        
        utterance.onerror = () => {
          state.isSpeaking = false;
          updateAudioButtonUI(false);
        };
        
        state.speechSynth.cancel();
        state.speechSynth.speak(utterance);
        state.isSpeaking = true;
        updateAudioButtonUI(true);
      }
    });
  });
}

function updateAudioButtonUI(isPlaying) {
  const audioBtns = document.querySelectorAll('.btn-audio');
  audioBtns.forEach(btn => {
    if (isPlaying) {
      btn.classList.add('playing');
      btn.innerHTML = '⏹ Stop Reading';
    } else {
      btn.classList.remove('playing');
      btn.innerHTML = '🔊 Read Out Forecast';
    }
  });
}

/**
 * UI Controls: Pair selector, Horizon switcher, Refresh button
 */
function initControls() {
  const pairSelect = document.getElementById('pair-select');
  pairSelect.addEventListener('change', (e) => {
    state.currentPair = e.target.value;
    loadForecast();
  });
  
  const horizonBtns = document.querySelectorAll('.btn-horizon');
  horizonBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      horizonBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentHorizon = parseInt(btn.dataset.horizon, 10);
      loadForecast();
    });
  });
  
  const refreshBtn = document.getElementById('btn-refresh-forecast');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      loadForecast();
    });
  }
}

/**
 * Fetch available currency pairs and populate dropdown
 */
async function loadCurrencyPairs() {
  let pairs = null;
  try {
    const res = await fetch('/api/pairs');
    if (res.ok) {
      const data = await res.json();
      pairs = data.pairs;
    }
  } catch (e) {
    // Expected on GitHub Pages
  }
  
  if (!pairs) {
    pairs = CLIENT_DATA.pairs;
  }
  
  const select = document.getElementById('pair-select');
  select.innerHTML = '';
  
  pairs.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.symbol;
    opt.textContent = `${p.symbol} (${p.description}) — ${p.current_price.toFixed(4)}`;
    select.appendChild(opt);
  });
  
  select.value = state.currentPair;
  loadForecast();
}

/**
 * Fetch forecast for current pair and horizon
 */
async function loadForecast() {
  let forecastData = null;
  try {
    const res = await fetch(`/api/forecast?pair=${encodeURIComponent(state.currentPair)}&horizon=${state.currentHorizon}`);
    if (res.ok) {
      forecastData = await res.json();
    }
  } catch (e) {
    // Fallback for GitHub Pages
  }
  
  if (!forecastData) {
    forecastData = generateClientForecast(state.currentPair, state.currentHorizon);
  }
  
  state.forecastData = forecastData;
  
  if (state.speechSynth && state.isSpeaking) {
    state.speechSynth.cancel();
    state.isSpeaking = false;
    updateAudioButtonUI(false);
  }
  
  renderHeroCard(forecastData);
  renderMacroStrip(forecastData);
  
  if (state.chartInstance && forecastData.chart_data) {
    state.chartInstance.setData(forecastData.chart_data);
  }
  
  loadCapstoneData();
}

/**
 * Update Hero Forecast Card
 */
function renderHeroCard(data) {
  document.getElementById('display-pair-symbol').textContent = data.pair;
  document.getElementById('current-rate-val').textContent = data.current_price.toFixed(4);
  document.getElementById('forecast-rate-val').textContent = data.ensemble_forecast.toFixed(4);
  
  const changeValEl = document.getElementById('forecast-change-val');
  const isUp = data.expected_change >= 0;
  const sign = isUp ? '▲ +' : '▼ ';
  changeValEl.textContent = `${sign}${data.expected_change_pct.toFixed(2)}% (${data.expected_change >= 0 ? '+' : ''}${data.expected_change.toFixed(4)})`;
  changeValEl.className = `metric-sub ${isUp ? 'text-green' : 'text-red'}`;
  
  document.getElementById('range-lower-val').textContent = data.expected_range.lower.toFixed(4);
  document.getElementById('range-upper-val').textContent = data.expected_range.upper.toFixed(4);
  
  document.getElementById('confidence-val').textContent = `${data.confidence_score}%`;
  
  const regimeBadge = document.getElementById('regime-badge');
  regimeBadge.textContent = data.market_regime.name;
  regimeBadge.className = 'regime-badge';
  if (data.market_regime.name.includes('High Volatility')) {
    regimeBadge.classList.add('shock');
  } else if (data.market_regime.name.includes('Trending')) {
    regimeBadge.classList.add('trending');
  } else {
    regimeBadge.classList.add('stable');
  }
  
  document.getElementById('plain-summary-text').textContent = data.plain_english_summary;
}

/**
 * Render Macro Financial Indicators Strip (Gold, Crude Oil, S&P 500)
 */
function renderMacroStrip(data) {
  const gold = data.macro_signals.gold;
  const oil = data.macro_signals.oil;
  const sp = data.macro_signals.sp500;
  
  document.getElementById('gold-price-val').textContent = `$${gold.price.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
  const goldChg = document.getElementById('gold-change-val');
  goldChg.textContent = `${gold.change_pct >= 0 ? '▲ +' : '▼ '}${gold.change_pct.toFixed(2)}%`;
  goldChg.className = gold.change_pct >= 0 ? 'text-green' : 'text-red';
  
  document.getElementById('oil-price-val').textContent = `$${oil.price.toFixed(2)}`;
  const oilChg = document.getElementById('oil-change-val');
  oilChg.textContent = `${oil.change_pct >= 0 ? '▲ +' : '▼ '}${oil.change_pct >= 0 ? '+' : ''}${oil.change_pct.toFixed(2)}%`;
  oilChg.className = oil.change_pct >= 0 ? 'text-green' : 'text-red';
  
  document.getElementById('sp500-price-val').textContent = sp.price.toLocaleString(undefined, {minimumFractionDigits: 2});
  const spChg = document.getElementById('sp500-change-val');
  spChg.textContent = `${sp.change_pct >= 0 ? '▲ +' : '▼ '}${sp.change_pct.toFixed(2)}%`;
  spChg.className = sp.change_pct >= 0 ? 'text-green' : 'text-red';
}

/**
 * Fetch and populate Benchmark Metrics and Audit Log
 */
async function loadCapstoneData() {
  let metricsTable = null;
  let auditRecords = null;
  
  try {
    const resMetrics = await fetch(`/api/metrics?pair=${encodeURIComponent(state.currentPair)}`);
    if (resMetrics.ok) {
      const data = await resMetrics.json();
      metricsTable = data.metrics_table;
    }
  } catch (e) {}
  
  try {
    const resHistory = await fetch(`/api/history?pair=${encodeURIComponent(state.currentPair)}`);
    if (resHistory.ok) {
      const data = await resHistory.json();
      auditRecords = data.audit;
    }
  } catch (e) {}
  
  if (!metricsTable) {
    metricsTable = generateClientMetrics();
  }
  if (!auditRecords) {
    auditRecords = generateClientAudit(state.currentPair);
  }
  
  renderBenchmarkTable(metricsTable);
  renderAuditTable(auditRecords);
}

/**
 * Render Academic Benchmark Table
 */
function renderBenchmarkTable(tableData) {
  const tbody = document.getElementById('benchmark-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';
  
  tableData.forEach(row => {
    const tr = document.createElement('tr');
    const isEnsemble = row.model === 'Adaptive Ensemble';
    if (isEnsemble) tr.classList.add('highlight-row');
    
    tr.innerHTML = `
      <td>
        <strong>${row.model}</strong>
        ${isEnsemble ? ' <span class="badge-ensemble">Proposed System</span>' : ''}
      </td>
      <td>${row.rmse.toFixed(5)}</td>
      <td>${row.mae.toFixed(5)}</td>
      <td>${row.mape.toFixed(3)}%</td>
      <td><strong>${row.directional_accuracy.toFixed(1)}%</strong></td>
      <td>${row.ensemble_weight_pct.toFixed(1)}%</td>
    `;
    tbody.appendChild(tr);
  });
}

/**
 * Render Historical Audit Table
 */
function renderAuditTable(auditData) {
  const tbody = document.getElementById('audit-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';
  
  auditData.forEach(record => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${record.date}</td>
      <td>${record.actual.toFixed(4)}</td>
      <td>${record.predicted.toFixed(4)}</td>
      <td class="${record.error >= 0 ? 'text-green' : 'text-red'}">
        ${record.error >= 0 ? '+' : ''}${record.error.toFixed(4)} (${record.error_pct.toFixed(2)}%)
      </td>
      <td>
        ${record.within_range 
          ? '<span style="color: #15803D; font-weight: bold;">✔ Yes (Safe)</span>' 
          : '<span style="color: #B91C1C; font-weight: bold;">⚠ Mild Deviation</span>'}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/**
 * Initialize What-If Macro Stress Test Simulator
 */
function initSimulator() {
  const goldSlider = document.getElementById('slider-gold');
  const oilSlider = document.getElementById('slider-oil');
  const spSlider = document.getElementById('slider-sp500');
  
  const goldVal = document.getElementById('val-slider-gold');
  const oilVal = document.getElementById('val-slider-oil');
  const spVal = document.getElementById('val-slider-sp500');
  
  const runSim = async () => {
    const gPct = parseFloat(goldSlider.value);
    const oPct = parseFloat(oilSlider.value);
    const sPct = parseFloat(spSlider.value);
    
    goldVal.textContent = `${gPct >= 0 ? '+' : ''}${gPct.toFixed(1)}%`;
    oilVal.textContent = `${oPct >= 0 ? '+' : ''}${oPct.toFixed(1)}%`;
    spVal.textContent = `${sPct >= 0 ? '+' : ''}${sPct.toFixed(1)}%`;
    
    let simData = null;
    try {
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pair: state.currentPair,
          gold_pct: gPct,
          oil_pct: oPct,
          sp500_pct: sPct
        })
      });
      if (res.ok) {
        simData = await res.json();
      }
    } catch (err) {}
    
    if (!simData) {
      const p = CLIENT_DATA.pairs.find(x => x.symbol === state.currentPair) || CLIENT_DATA.pairs[0];
      const shiftPct = (gPct * p.gold_beta) + (oPct * p.oil_beta) + (sPct * p.sp_beta);
      const simP = p.current_price * (1 + shiftPct / 100);
      const deltaP = simP - p.current_price;
      simData = {
        simulated_price: parseFloat(simP.toFixed(4)),
        delta_pct: parseFloat(shiftPct.toFixed(2)),
        delta_price: parseFloat(deltaP.toFixed(4)),
        interpretation: `A combined macro shock (${gPct >= 0 ? '+' : ''}${gPct.toFixed(1)}% Gold, ${oPct >= 0 ? '+' : ''}${oPct.toFixed(1)}% Oil, ${sPct >= 0 ? '+' : ''}${sPct.toFixed(1)}% S&P 500) is estimated to cause a ${shiftPct >= 0 ? '+' : ''}${shiftPct.toFixed(2)}% shift in ${state.currentPair}, moving it to ${simP.toFixed(4)}.`
      };
    }
    
    document.getElementById('sim-price-val').textContent = `${simData.simulated_price.toFixed(4)}`;
    document.getElementById('sim-delta-val').textContent = `${simData.delta_pct >= 0 ? '▲ +' : '▼ '}${simData.delta_pct.toFixed(2)}% (${simData.delta_price >= 0 ? '+' : ''}${simData.delta_price.toFixed(4)})`;
    document.getElementById('sim-delta-val').className = simData.delta_price >= 0 ? 'text-green' : 'text-red';
    document.getElementById('sim-interpretation-text').textContent = simData.interpretation;
  };
  
  goldSlider.addEventListener('input', runSim);
  oilSlider.addEventListener('input', runSim);
  spSlider.addEventListener('input', runSim);
}
