"""
FXSense: Synthetic Market Data Generator
Generates realistic, chronologically synchronized multi-year daily financial time series
(2021-2026) for major currency pairs and external macro indicators (Gold, Crude Oil, S&P 500).
Uses mean-reverting stochastic processes calibrated to realistic historical FX and commodity levels.
"""

import numpy as np
import pandas as pd
from datetime import datetime

PAIRS_CONFIG = {
    'EUR/USD': {
        'base_price': 1.0850,
        'mean_anchor': 1.0820,
        'reversion_speed': 0.015,
        'daily_vol': 0.0035,
        'gold_corr': 0.45,
        'oil_corr': 0.20,
        'sp500_corr': 0.35,
        'description': 'Euro to US Dollar'
    },
    'GBP/USD': {
        'base_price': 1.2750,
        'mean_anchor': 1.2720,
        'reversion_speed': 0.015,
        'daily_vol': 0.0042,
        'gold_corr': 0.40,
        'oil_corr': 0.15,
        'sp500_corr': 0.38,
        'description': 'British Pound to US Dollar'
    },
    'USD/JPY': {
        'base_price': 152.50,
        'mean_anchor': 151.80,
        'reversion_speed': 0.012,
        'daily_vol': 0.0048,
        'gold_corr': -0.35,
        'oil_corr': 0.25,
        'sp500_corr': 0.42,
        'description': 'US Dollar to Japanese Yen'
    },
    'AUD/USD': {
        'base_price': 0.6620,
        'mean_anchor': 0.6650,
        'reversion_speed': 0.016,
        'daily_vol': 0.0050,
        'gold_corr': 0.62,
        'oil_corr': 0.45,
        'sp500_corr': 0.50,
        'description': 'Australian Dollar to US Dollar'
    },
    'USD/CAD': {
        'base_price': 1.3620,
        'mean_anchor': 1.3650,
        'reversion_speed': 0.014,
        'daily_vol': 0.0038,
        'gold_corr': -0.30,
        'oil_corr': -0.65,
        'sp500_corr': -0.22,
        'description': 'US Dollar to Canadian Dollar'
    }
}

MACRO_CONFIG = {
    'GOLD': {
        'start_price': 1850.0,
        'mean_anchor': 2550.0,
        'reversion_speed': 0.008,
        'daily_vol': 0.0070,
        'name': 'Gold (XAU/USD - $/oz)'
    },
    'OIL': {
        'start_price': 65.0,
        'mean_anchor': 76.0,
        'reversion_speed': 0.012,
        'daily_vol': 0.0140,
        'name': 'Crude Oil (WTI - $/barrel)'
    },
    'SP500': {
        'start_price': 3800.0,
        'mean_anchor': 5600.0,
        'reversion_speed': 0.008,
        'daily_vol': 0.0075,
        'name': 'S&P 500 Index (^GSPC)'
    }
}

def generate_multi_source_data(start_date='2021-01-01', end_date='2026-09-18', seed=42):
    """
    Generates synchronized daily market data for all assets.
    """
    np.random.seed(seed)
    
    dates = pd.date_range(start=start_date, end=end_date, freq='B')
    n_days = len(dates)
    
    # Generate Macro Drivers first
    macro_dfs = {}
    macro_returns = {}
    
    for key, config in MACRO_CONFIG.items():
        prices = np.zeros(n_days)
        returns = np.zeros(n_days)
        prices[0] = config['start_price']
        speed = config['reversion_speed']
        anchor = config['mean_anchor']
        vol = config['daily_vol']
        
        for t in range(1, n_days):
            drift = speed * (np.log(anchor) - np.log(prices[t-1]))
            noise = np.random.normal(0, vol)
            r = drift + noise
            returns[t] = r
            prices[t] = prices[t-1] * np.exp(r)
            
        macro_returns[key] = returns
        highs = prices * (1 + np.abs(np.random.normal(0, vol * 0.4, n_days)))
        lows = prices * (1 - np.abs(np.random.normal(0, vol * 0.4, n_days)))
        opens = np.roll(prices, 1)
        opens[0] = config['start_price']
        
        macro_dfs[key] = pd.DataFrame({
            'date': dates,
            f'{key.lower()}_close': prices,
            f'{key.lower()}_open': opens,
            f'{key.lower()}_high': highs,
            f'{key.lower()}_low': lows,
            f'{key.lower()}_return': returns
        })
        
    macro_combined = macro_dfs['GOLD']
    for key in ['OIL', 'SP500']:
        macro_combined = pd.merge(macro_combined, macro_dfs[key], on='date')
        
    pair_datasets = {}
    
    for pair, config in PAIRS_CONFIG.items():
        base = config['base_price']
        mean_p = config['mean_anchor']
        speed = config['reversion_speed']
        p_vol = config['daily_vol']
        
        close_prices = np.zeros(n_days)
        currency_returns = np.zeros(n_days)
        close_prices[0] = base
        
        for t in range(1, n_days):
            # Mean-reverting drift: speed * (mean_anchor - current)
            reversion = speed * (np.log(mean_p) - np.log(close_prices[t-1]))
            idiosyncratic = np.random.normal(0, p_vol)
            
            # Correlated macro component
            macro_effect = (
                config['gold_corr'] * macro_returns['GOLD'][t] * 0.25 +
                config['oil_corr'] * macro_returns['OIL'][t] * 0.20 +
                config['sp500_corr'] * macro_returns['SP500'][t] * 0.20
            )
            
            # Regime shock on 2% of days
            shock = 0.0
            if np.random.rand() < 0.02:
                shock = np.random.normal(0, p_vol * 2.5)
                
            r_t = reversion + idiosyncratic + macro_effect + shock
            currency_returns[t] = r_t
            close_prices[t] = close_prices[t-1] * np.exp(r_t)
            
        high_prices = close_prices * (1 + np.abs(np.random.normal(0, p_vol * 0.45, n_days)))
        low_prices = close_prices * (1 - np.abs(np.random.normal(0, p_vol * 0.45, n_days)))
        open_prices = np.roll(close_prices, 1)
        open_prices[0] = base
        
        df_pair = pd.DataFrame({
            'date': dates,
            'pair': pair,
            'open': open_prices,
            'high': high_prices,
            'low': low_prices,
            'close': close_prices,
            'return': currency_returns,
            'day_of_week': dates.dayofweek,
            'month': dates.month,
            'year': dates.year
        })
        
        df_pair = pd.merge(df_pair, macro_combined, on='date')
        
        # Technical indicators
        df_pair['ma_7'] = df_pair['close'].rolling(window=7, min_periods=1).mean()
        df_pair['ma_30'] = df_pair['close'].rolling(window=30, min_periods=1).mean()
        df_pair['volatility_20d'] = df_pair['return'].rolling(window=20, min_periods=1).std() * np.sqrt(252)
        df_pair['momentum_10d'] = (df_pair['close'] - df_pair['close'].shift(10).fillna(df_pair['close'].iloc[0])) / df_pair['close'].shift(10).fillna(df_pair['close'].iloc[0])
        
        df_pair['gold_ma_7'] = df_pair['gold_close'].rolling(window=7, min_periods=1).mean()
        df_pair['oil_ma_7'] = df_pair['oil_close'].rolling(window=7, min_periods=1).mean()
        df_pair['sp500_ma_7'] = df_pair['sp500_close'].rolling(window=7, min_periods=1).mean()
        
        vol_75 = df_pair['volatility_20d'].quantile(0.75)
        
        def assign_regime(row):
            if row['volatility_20d'] >= vol_75:
                return 'High Volatility / Shock'
            elif row['momentum_10d'] > 0.008:
                return 'Trending Bullish'
            elif row['momentum_10d'] < -0.008:
                return 'Trending Bearish'
            else:
                return 'Stable / Low-Volatility'
                
        df_pair['market_regime'] = df_pair.apply(assign_regime, axis=1)
        
        pair_datasets[pair] = df_pair
        
    return pair_datasets

if __name__ == '__main__':
    data = generate_multi_source_data()
    for pair, df in data.items():
        print(f"{pair} -> Latest: {df['close'].iloc[-1]:.4f}, Regime: {df['market_regime'].iloc[-1]}")
    print(f"Gold: ${data['EUR/USD']['gold_close'].iloc[-1]:.2f}, Oil: ${data['EUR/USD']['oil_close'].iloc[-1]:.2f}, S&P500: {data['EUR/USD']['sp500_close'].iloc[-1]:.2f}")
