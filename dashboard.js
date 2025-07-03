// Smart Home Dashboard JavaScript

class SmartHomeDashboard {
    constructor() {
        this.socket = io();
        this.chart = null;
        this.isRealData = true;
        this.chartTimeRange = 24; // hours
        this.currentData = {};
        this.historicalData = [];
        this.devices = [];
        this.suggestions = [];
        
        this.init();
    }

    init() {
        this.setupSocketListeners();
        this.setupEventListeners();
        this.setupChart();
        this.loadInitialData();
        this.startDataUpdates();
    }

    setupSocketListeners() {
        this.socket.on('sensor_data', (data) => {
            if (this.isRealData) {
                this.updateCurrentData(data);
                this.updateChartRealTime(data);
                this.flashDataUpdate();
            }
        });

        this.socket.on('new_suggestions', (suggestions) => {
            this.addNewSuggestions(suggestions);
        });
    }

    setupEventListeners() {
        // Data toggle button
        document.getElementById('dataToggle').addEventListener('click', () => {
            this.toggleDataSource();
        });

        // Chart time range buttons
        document.getElementById('chart-24h').addEventListener('click', () => {
            this.changeChartTimeRange(24);
        });
        document.getElementById('chart-7d').addEventListener('click', () => {
            this.changeChartTimeRange(168); // 7 days * 24 hours
        });
        document.getElementById('chart-30d').addEventListener('click', () => {
            this.changeChartTimeRange(720); // 30 days * 24 hours
        });
    }

    setupChart() {
        const ctx = document.getElementById('environmentChart').getContext('2d');
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Temperature (°C)',
                        data: [],
                        borderColor: '#F59E0B',
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        tension: 0.4,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Humidity (%)',
                        data: [],
                        borderColor: '#3B82F6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        tension: 0.4,
                        yAxisID: 'y1'
                    },
                    {
                        label: 'Air Quality',
                        data: [],
                        borderColor: '#10B981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        tension: 0.4,
                        yAxisID: 'y2'
                    },
                    {
                        label: 'Energy (kWh)',
                        data: [],
                        borderColor: '#EF4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        tension: 0.4,
                        yAxisID: 'y3'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                    }
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Time'
                        }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Temperature (°C)'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: false,
                        position: 'right',
                        grid: {
                            drawOnChartArea: false,
                        },
                    },
                    y2: {
                        type: 'linear',
                        display: false,
                        position: 'right',
                    },
                    y3: {
                        type: 'linear',
                        display: false,
                        position: 'right',
                    }
                },
                animation: {
                    duration: 750,
                    easing: 'easeInOutQuart'
                }
            }
        });
    }

    async loadInitialData() {
        this.showLoading(true);
        
        try {
            // Load current data
            const currentResponse = await fetch('/api/current_data');
            if (currentResponse.ok) {
                this.currentData = await currentResponse.json();
                this.updateCurrentData(this.currentData);
            }

            // Load historical data
            await this.loadHistoricalData();

            // Load devices
            const devicesResponse = await fetch('/api/devices');
            if (devicesResponse.ok) {
                this.devices = await devicesResponse.json();
                this.renderDeviceControls();
            }

            // Load suggestions
            const suggestionsResponse = await fetch('/api/suggestions');
            if (suggestionsResponse.ok) {
                this.suggestions = await suggestionsResponse.json();
                this.renderSuggestions();
            }

        } catch (error) {
            console.error('Error loading initial data:', error);
        } finally {
            this.showLoading(false);
        }
    }

    async loadHistoricalData() {
        try {
            const response = await fetch(`/api/historical_data?hours=${this.chartTimeRange}`);
            if (response.ok) {
                this.historicalData = await response.json();
                this.updateChart();
            }
        } catch (error) {
            console.error('Error loading historical data:', error);
        }
    }

    updateCurrentData(data) {
        this.currentData = data;
        
        // Update temperature
        document.getElementById('temp-value').textContent = `${data.temperature}°C`;
        this.updateStatusIndicator('temp-status', data.temperature, 
            {min: 18, max: 26}, ['Too cold', 'Normal range', 'Too warm']);

        // Update humidity
        document.getElementById('humidity-value').textContent = `${data.humidity}%`;
        this.updateStatusIndicator('humidity-status', data.humidity, 
            {min: 40, max: 60}, ['Too dry', 'Optimal level', 'Too humid']);

        // Update air quality
        document.getElementById('air-quality-value').textContent = data.air_quality;
        this.updateStatusIndicator('air-quality-status', data.air_quality, 
            {min: 70, max: 100}, ['Poor quality', 'Good quality', 'Excellent']);

        // Update energy usage
        document.getElementById('energy-value').textContent = `${data.energy_usage} kWh`;
        this.updateStatusIndicator('energy-status', data.energy_usage, 
            {min: 0, max: 1200}, ['Low usage', 'Moderate usage', 'High usage']);

        // Update water usage
        document.getElementById('water-value').textContent = `${data.water_usage} L`;
        const waterPercentage = Math.min((data.water_usage / 200) * 100, 100);
        document.getElementById('water-bar').style.width = `${waterPercentage}%`;

        // Update light level
        document.getElementById('light-value').textContent = `${data.light_level} lux`;
        const lightPercentage = Math.min((data.light_level / 100) * 100, 100);
        document.getElementById('light-bar').style.width = `${lightPercentage}%`;

        // Calculate and update efficiency score
        const efficiencyScore = this.calculateEfficiencyScore(data);
        document.getElementById('efficiency-score').textContent = `${efficiencyScore}/100`;
        document.getElementById('efficiency-bar').style.width = `${efficiencyScore}%`;
    }

    updateStatusIndicator(elementId, value, range, messages) {
        const element = document.getElementById(elementId);
        const indicator = element.querySelector('span');
        const text = element.querySelector('span:last-child');

        let status, message;
        if (value < range.min) {
            status = 'warning';
            message = messages[0];
        } else if (value <= range.max) {
            status = 'good';
            message = messages[1];
        } else {
            status = 'warning';
            message = messages[2];
        }

        // Update indicator color
        indicator.className = `flex w-3 h-3 rounded-full mr-2 ${
            status === 'good' ? 'bg-green-400' : 
            status === 'warning' ? 'bg-yellow-400' : 'bg-red-400'
        }`;
        
        text.textContent = message;
    }

    calculateEfficiencyScore(data) {
        let score = 100;
        
        // Temperature efficiency (optimal 20-24°C)
        if (data.temperature < 20 || data.temperature > 24) {
            score -= Math.abs(data.temperature - 22) * 5;
        }
        
        // Energy usage efficiency (lower is better)
        if (data.energy_usage > 1200) {
            score -= (data.energy_usage - 1200) / 20;
        }
        
        // Air quality efficiency
        if (data.air_quality < 80) {
            score -= (80 - data.air_quality) / 2;
        }
        
        // Water usage efficiency
        if (data.water_usage > 180) {
            score -= (data.water_usage - 180) / 5;
        }
        
        return Math.max(0, Math.min(100, Math.round(score)));
    }

    updateChart() {
        if (!this.chart || this.historicalData.length === 0) return;

        const labels = this.historicalData.map(item => {
            const date = new Date(item.timestamp);
            return date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
        });

        this.chart.data.labels = labels;
        this.chart.data.datasets[0].data = this.historicalData.map(item => item.temperature);
        this.chart.data.datasets[1].data = this.historicalData.map(item => item.humidity);
        this.chart.data.datasets[2].data = this.historicalData.map(item => item.air_quality);
        this.chart.data.datasets[3].data = this.historicalData.map(item => item.energy_usage);

        this.chart.update('none');
    }

    updateChartRealTime(data) {
        if (!this.chart) return;

        const time = new Date(data.timestamp).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
        
        // Add new data point
        this.chart.data.labels.push(time);
        this.chart.data.datasets[0].data.push(data.temperature);
        this.chart.data.datasets[1].data.push(data.humidity);
        this.chart.data.datasets[2].data.push(data.air_quality);
        this.chart.data.datasets[3].data.push(data.energy_usage);

        // Keep only last 20 data points for real-time view
        if (this.chart.data.labels.length > 20) {
            this.chart.data.labels.shift();
            this.chart.data.datasets.forEach(dataset => dataset.data.shift());
        }

        this.chart.update('active');
    }

    async renderDeviceControls() {
        const container = document.getElementById('device-controls');
        container.innerHTML = '';

        this.devices.forEach(device => {
            const deviceElement = document.createElement('div');
            deviceElement.className = 'flex items-center justify-between p-3 bg-gray-50 rounded-lg';
            
            deviceElement.innerHTML = `
                <div class="flex items-center space-x-3">
                    <div class="status-dot ${device.status === 'on' ? 'online' : 'offline'}"></div>
                    <div>
                        <p class="font-medium text-gray-800">${device.name}</p>
                        <p class="text-sm text-gray-600">${device.energy_consumption} W</p>
                    </div>
                </div>
                <label class="toggle-switch">
                    <input type="checkbox" ${device.status === 'on' ? 'checked' : ''} 
                           onchange="dashboard.toggleDevice(${device.id})">
                    <span class="toggle-slider"></span>
                </label>
            `;
            
            container.appendChild(deviceElement);
        });
    }

    async toggleDevice(deviceId) {
        try {
            const response = await fetch(`/api/device/${deviceId}/toggle`, {
                method: 'POST'
            });
            
            if (response.ok) {
                const result = await response.json();
                
                // Update local device status
                const device = this.devices.find(d => d.id === deviceId);
                if (device) {
                    device.status = result.status;
                    this.renderDeviceControls();
                }
            }
        } catch (error) {
            console.error('Error toggling device:', error);
        }
    }

    renderSuggestions() {
        const container = document.getElementById('suggestions-container');
        const badge = document.getElementById('suggestion-badge');
        
        container.innerHTML = '';
        badge.textContent = this.suggestions.length;

        if (this.suggestions.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center py-4">No new suggestions</p>';
            return;
        }

        this.suggestions.forEach(suggestion => {
            const suggestionElement = document.createElement('div');
            const priorityClass = suggestion.priority === 3 ? 'suggestion-high' : 
                                suggestion.priority === 2 ? 'suggestion-medium' : 'suggestion-low';
            
            suggestionElement.className = `p-3 rounded-lg ${priorityClass}`;
            suggestionElement.innerHTML = `
                <div class="flex items-start space-x-3">
                    <div class="text-lg">
                        ${suggestion.category === 'energy' ? '⚡' : 
                          suggestion.category === 'health' ? '🌿' : 
                          suggestion.category === 'comfort' ? '🏠' : '💡'}
                    </div>
                    <div class="flex-1">
                        <p class="text-sm font-medium text-gray-800">${suggestion.message}</p>
                        <p class="text-xs text-gray-600 mt-1">
                            ${new Date(suggestion.timestamp).toLocaleTimeString()}
                        </p>
                    </div>
                </div>
            `;
            
            container.appendChild(suggestionElement);
        });
    }

    addNewSuggestions(newSuggestions) {
        this.suggestions = [...newSuggestions, ...this.suggestions].slice(0, 10);
        this.renderSuggestions();
    }

    changeChartTimeRange(hours) {
        this.chartTimeRange = hours;
        
        // Update button states
        document.querySelectorAll('[id^="chart-"]').forEach(btn => {
            btn.className = 'px-3 py-1 bg-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-400 transition-colors';
        });
        
        const activeButton = document.getElementById(`chart-${hours === 24 ? '24h' : hours === 168 ? '7d' : '30d'}`);
        activeButton.className = 'px-3 py-1 bg-eco-green text-white rounded-lg text-sm hover:bg-green-600 transition-colors';
        
        this.loadHistoricalData();
    }

    toggleDataSource() {
        this.isRealData = !this.isRealData;
        const button = document.getElementById('dataToggle');
        
        if (this.isRealData) {
            button.textContent = '📊 Real Data';
            button.className = 'bg-eco-blue text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors';
        } else {
            button.textContent = '🔄 Simulated Data';
            button.className = 'bg-eco-orange text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors';
            this.startSimulatedData();
        }
    }

    startSimulatedData() {
        if (this.isRealData) return;
        
        setInterval(() => {
            if (!this.isRealData) {
                const simulatedData = this.generateSimulatedData();
                this.updateCurrentData(simulatedData);
                this.updateChartRealTime(simulatedData);
            }
        }, 3000);
    }

    generateSimulatedData() {
        const now = new Date();
        return {
            temperature: 20 + Math.random() * 8,
            humidity: 40 + Math.random() * 30,
            air_quality: 60 + Math.random() * 40,
            energy_usage: 800 + Math.random() * 600,
            water_usage: 100 + Math.random() * 100,
            light_level: 30 + Math.random() * 70,
            timestamp: now.toISOString()
        };
    }

    flashDataUpdate() {
        document.querySelectorAll('[id$="-value"]').forEach(element => {
            element.classList.add('data-update-flash');
            setTimeout(() => {
                element.classList.remove('data-update-flash');
            }, 500);
        });
    }

    startDataUpdates() {
        // Refresh data every 30 seconds
        setInterval(() => {
            this.loadInitialData();
        }, 30000);
    }

    showLoading(show) {
        const overlay = document.getElementById('loading-overlay');
        overlay.classList.toggle('hidden', !show);
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new SmartHomeDashboard();
});

// Service worker for offline functionality (optional)
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/static/sw.js')
        .then(registration => console.log('SW registered'))
        .catch(error => console.log('SW registration failed'));
}