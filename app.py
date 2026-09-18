"""
FXSense: Web Server & REST API
Adaptive Multi-Source Currency Exchange Rate Forecasting and Market Intelligence System
Capstone Project Prototype
"""

import os
from flask import Flask, render_template, jsonify, request
from data.synthetic_market_data import generate_multi_source_data, PAIRS_CONFIG, MACRO_CONFIG
from models.forecasting_engine import FXSensePipeline

app = Flask(__name__, template_folder='templates', static_folder='static')

# Global storage for market data and trained pipelines
MARKET_DATA = {}
PIPELINES = {}

def initialize_system():
    """Generates historical data and initializes pipelines for all currency pairs."""
    global MARKET_DATA, PIPELINES
    print("FXSense: Initializing market data and pre-training forecasting pipelines...")
    MARKET_DATA = generate_multi_source_data()
    for pair_name, df in MARKET_DATA.items():
        print(f"Training pipeline for {pair_name}...")
        pipeline = FXSensePipeline(df, pair_name)
        pipeline.run_training_and_validation()
        PIPELINES[pair_name] = pipeline
    print("FXSense: Initialization complete! All models trained and ready.")

# Initialize on import/start
initialize_system()

@app.route('/')
def index():
    """Serves the main FXSense dashboard."""
    return render_template('index.html')

@app.route('/api/pairs', methods=['GET'])
def get_pairs():
    """Returns list of available currency pairs and their live summary."""
    pairs_list = []
    for pair_name, config in PAIRS_CONFIG.items():
        pipeline = PIPELINES.get(pair_name)
        last_idx = len(pipeline.df) - 1
        curr_price = float(pipeline.df['close'].iloc[last_idx])
        prev_price = float(pipeline.df['close'].iloc[last_idx - 1])
        change = curr_price - prev_price
        change_pct = (change / prev_price) * 100.0
        regime = pipeline.df['market_regime'].iloc[last_idx]
        
        pairs_list.append({
            'symbol': pair_name,
            'description': config['description'],
            'current_price': round(curr_price, 4),
            'change': round(change, 4),
            'change_pct': round(change_pct, 2),
            'regime': regime
        })
    return jsonify({'pairs': pairs_list})

@app.route('/api/forecast', methods=['GET'])
def get_forecast():
    """Returns the comprehensive forecast for a given currency pair and horizon."""
    pair = request.args.get('pair', 'EUR/USD')
    horizon = int(request.args.get('horizon', 1))
    
    if pair not in PIPELINES:
        return jsonify({'error': f'Currency pair {pair} not found'}), 404
        
    pipeline = PIPELINES[pair]
    forecast_data = pipeline.generate_next_forecast(horizon=horizon)
    return jsonify(forecast_data)

@app.route('/api/metrics', methods=['GET'])
def get_metrics():
    """Returns model benchmark metrics for academic capstone review."""
    pair = request.args.get('pair', 'EUR/USD')
    if pair not in PIPELINES:
        return jsonify({'error': f'Currency pair {pair} not found'}), 404
        
    pipeline = PIPELINES[pair]
    metrics_table = pipeline.get_academic_metrics_table()
    
    # Chronological Split Details
    split_info = {
        'total_observations': pipeline.n,
        'train_samples': len(pipeline.train_df),
        'train_pct': 70,
        'validation_samples': len(pipeline.val_df),
        'validation_pct': 15,
        'test_samples': len(pipeline.test_df),
        'test_pct': 15,
        'leakage_prevention': [
            'Chronological ordering preserved; zero random shuffling.',
            'Feature scalers fitted strictly on training partition.',
            'Sliding window features use strictly backward-looking observations.',
            'Adaptive ensemble weights derived from validation set only.',
            'Holdout test set untouched until final model benchmark evaluation.'
        ]
    }
    
    return jsonify({
        'pair': pair,
        'metrics_table': metrics_table,
        'split_info': split_info
    })

@app.route('/api/simulate', methods=['POST'])
def simulate_scenario():
    """Calculates what-if macro stress test impact on currency exchange rate."""
    data = request.get_json() or {}
    pair = data.get('pair', 'EUR/USD')
    gold_pct = float(data.get('gold_pct', 0.0))
    oil_pct = float(data.get('oil_pct', 0.0))
    sp500_pct = float(data.get('sp500_pct', 0.0))
    
    if pair not in PIPELINES:
        return jsonify({'error': f'Currency pair {pair} not found'}), 404
        
    pipeline = PIPELINES[pair]
    result = pipeline.simulate_stress_test(gold_pct, oil_pct, sp500_pct)
    return jsonify(result)

@app.route('/api/history', methods=['GET'])
def get_history():
    """Returns chronological past predictions vs realized actuals."""
    pair = request.args.get('pair', 'EUR/USD')
    if pair not in PIPELINES:
        return jsonify({'error': f'Currency pair {pair} not found'}), 404
        
    pipeline = PIPELINES[pair]
    audit_records = pipeline.get_past_prediction_audit(count=15)
    return jsonify({'pair': pair, 'audit': audit_records})

@app.route('/api/proposal-summary', methods=['GET'])
def get_proposal_summary():
    """Returns the capstone proposal highlights for Project Lead Review."""
    return jsonify({
        'title': 'FXSense: Adaptive Multi-Source Currency Exchange Rate Forecasting',
        'sub_title': 'Capstone Project Proposal • For Project Lead Review',
        'key_innovations': [
            'Multi-source financial integration (Gold, Crude Oil, S&P 500)',
            'Hybrid forecasting comparing ARIMA statistical baseline with LSTM and BiLSTM',
            'Chronology-safe, leakage-free validation methodology',
            'Validation-weighted adaptive ensemble forecasting',
            'Market-regime awareness (Low-volatility, Trending, and High-Volatility Shock)',
            'Uncertainty intervals and confidence scoring',
            'Senior-accessible, clear interface with audio narration'
        ],
        'primary_metrics': ['RMSE', 'MAE', 'MAPE', 'Directional Accuracy (%)'],
        'models_evaluated': ['ARIMA', 'LSTM', 'BiLSTM', 'Multivariate Deep Learning', 'Adaptive Ensemble']
    })

if __name__ == '__main__':
    # Run locally on port 5000
    print("Starting FXSense server on http://127.0.0.1:5000")
    app.run(host='127.0.0.1', port=5000, debug=False)
