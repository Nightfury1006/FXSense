/**
 * FXSense: Accessible Canvas Chart Engine
 * High-contrast, large-font, dependency-free interactive financial chart.
 * Renders historical exchange rates, moving averages, multi-model forecast lines,
 * and shaded uncertainty / expected range bands.
 */

class FXSenseChart {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.data = null;
    this.options = {
      showMAs: true,
      showModels: false,
      showConfidenceBand: true
    };
    
    // Resize handling
    this.setupHiDPI();
    window.addEventListener('resize', () => {
      this.setupHiDPI();
      this.render();
    });
    
    // Mouse hover tooltip
    this.mouseX = -1;
    this.mouseY = -1;
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left;
      this.mouseY = e.clientY - rect.top;
      this.render();
    });
    
    this.canvas.addEventListener('mouseleave', () => {
      this.mouseX = -1;
      this.mouseY = -1;
      this.render();
    });
  }

  setupHiDPI() {
    if (!this.canvas) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width;
    this.height = Math.max(340, rect.height || 360);
    
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    
    this.ctx.resetTransform();
    this.ctx.scale(dpr, dpr);
  }

  setData(chartData, options = {}) {
    this.data = chartData;
    this.options = { ...this.options, ...options };
    this.render();
  }

  render() {
    if (!this.data || !this.ctx || !this.data.prices || this.data.prices.length === 0) return;
    
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    
    ctx.clearRect(0, 0, w, h);
    
    const padding = { top: 30, right: 65, bottom: 45, left: 65 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;
    
    // Extract series
    const prices = this.data.prices;
    const dates = this.data.dates;
    const forecast = this.data.forecast_point;
    
    let allValues = [...prices];
    if (forecast) {
      allValues.push(forecast.price);
      if (forecast.lower) allValues.push(forecast.lower);
      if (forecast.upper) allValues.push(forecast.upper);
    }
    
    const minVal = Math.min(...allValues) * 0.997;
    const maxVal = Math.max(...allValues) * 1.003;
    const range = maxVal - minVal || 1;
    
    const totalPoints = prices.length + (forecast ? 1 : 0);
    const stepX = chartW / (totalPoints - 1);
    
    const getY = (val) => padding.top + chartH - ((val - minVal) / range) * chartH;
    const getX = (idx) => padding.left + idx * stepX;
    
    // 1. Draw Grid Lines & Y-Axis Labels
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.font = '13px -apple-system, sans-serif';
    ctx.fillStyle = '#64748B';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    
    const gridSteps = 5;
    for (let i = 0; i <= gridSteps; i++) {
      const yVal = minVal + (range / gridSteps) * i;
      const yPos = getY(yVal);
      
      ctx.beginPath();
      ctx.moveTo(padding.left, yPos);
      ctx.lineTo(w - padding.right, yPos);
      ctx.stroke();
      
      ctx.fillText(yVal.toFixed(4), padding.left - 10, yPos);
    }
    
    // 2. Draw X-Axis Dates
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const dateInterval = Math.ceil(totalPoints / 7);
    for (let i = 0; i < prices.length; i += dateInterval) {
      const xPos = getX(i);
      ctx.fillText(dates[i], xPos, h - padding.bottom + 12);
    }
    if (forecast) {
      const xForecast = getX(prices.length);
      ctx.fillStyle = '#1E3A8A';
      ctx.font = 'bold 13px -apple-system, sans-serif';
      ctx.fillText(forecast.date, xForecast, h - padding.bottom + 12);
    }
    
    // 3. Draw Moving Averages (if enabled)
    if (this.options.showMAs && this.data.ma30 && this.data.ma7) {
      // 30-Day MA
      ctx.beginPath();
      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      for (let i = 0; i < this.data.ma30.length; i++) {
        const x = getX(i);
        const y = getY(this.data.ma30[i]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      
      // 7-Day MA
      ctx.beginPath();
      ctx.strokeStyle = '#D97706'; // Warm Amber
      ctx.lineWidth = 1.5;
      for (let i = 0; i < this.data.ma7.length; i++) {
        const x = getX(i);
        const y = getY(this.data.ma7[i]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    
    // 4. Shaded Expected Range Band for Forecast (if enabled)
    if (this.options.showConfidenceBand && forecast && forecast.lower && forecast.upper) {
      const lastX = getX(prices.length - 1);
      const lastY = getY(prices[prices.length - 1]);
      const nextX = getX(prices.length);
      const upperY = getY(forecast.upper);
      const lowerY = getY(forecast.lower);
      
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(nextX, upperY);
      ctx.lineTo(nextX, lowerY);
      ctx.closePath();
      ctx.fillStyle = 'rgba(254, 240, 138, 0.45)'; // Gentle pastel yellow/amber
      ctx.fill();
      
      // Upper / Lower bound lines
      ctx.strokeStyle = '#EAB308';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(nextX, upperY);
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(nextX, lowerY);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Upper & Lower bound text labels
      ctx.fillStyle = '#854D0E';
      ctx.font = 'bold 12px -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`Upper: ${forecast.upper.toFixed(4)}`, nextX + 6, upperY);
      ctx.fillText(`Lower: ${forecast.lower.toFixed(4)}`, nextX + 6, lowerY);
    }
    
    // 5. Draw Historical Price Line
    ctx.beginPath();
    ctx.strokeStyle = '#1E3A8A'; // Royal Navy
    ctx.lineWidth = 2.8;
    for (let i = 0; i < prices.length; i++) {
      const x = getX(i);
      const y = getY(prices[i]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    
    // Connect to forecast point with dashed forecast line
    if (forecast) {
      const lastX = getX(prices.length - 1);
      const lastY = getY(prices[prices.length - 1]);
      const nextX = getX(prices.length);
      const nextY = getY(forecast.price);
      
      ctx.beginPath();
      ctx.strokeStyle = '#15803D'; // Forest Green
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 5]);
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(nextX, nextY);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Forecast Point Node
      ctx.beginPath();
      ctx.arc(nextX, nextY, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#15803D';
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      
      // Forecast price label
      ctx.fillStyle = '#15803D';
      ctx.font = 'bold 14px -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${forecast.price.toFixed(4)}`, nextX + 10, nextY);
    }
    
    // Last Actual Point Node
    const curX = getX(prices.length - 1);
    const curY = getY(prices[prices.length - 1]);
    ctx.beginPath();
    ctx.arc(curX, curY, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#1E3A8A';
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // 6. Interactive Tooltip on Hover
    if (this.mouseX >= padding.left && this.mouseX <= w - padding.right) {
      const hoverIndex = Math.round((this.mouseX - padding.left) / stepX);
      if (hoverIndex >= 0 && hoverIndex < prices.length) {
        const hX = getX(hoverIndex);
        const hY = getY(prices[hoverIndex]);
        const dateStr = dates[hoverIndex];
        const valStr = prices[hoverIndex].toFixed(4);
        
        // Vertical guideline
        ctx.beginPath();
        ctx.strokeStyle = '#94A3B8';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.moveTo(hX, padding.top);
        ctx.lineTo(hX, h - padding.bottom);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Dot
        ctx.beginPath();
        ctx.arc(hX, hY, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#1E3A8A';
        ctx.fill();
        
        // Tooltip box
        const tipText = `${dateStr}: ${valStr}`;
        ctx.font = 'bold 14px -apple-system, sans-serif';
        const tipW = ctx.measureText(tipText).width + 20;
        const tipH = 30;
        let tipX = hX - tipW / 2;
        if (tipX < padding.left) tipX = padding.left;
        if (tipX + tipW > w - padding.right) tipX = w - padding.right - tipW;
        const tipY = Math.max(10, hY - tipH - 12);
        
        ctx.fillStyle = '#1E293B';
        ctx.beginPath();
        ctx.roundRect(tipX, tipY, tipW, tipH, 6);
        ctx.fill();
        
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(tipText, tipX + tipW / 2, tipY + tipH / 2);
      }
    }
  }
}

// Export to window
window.FXSenseChart = FXSenseChart;
