from flask import Flask, render_template, request, jsonify, redirect, url_for, session
from flask_socketio import SocketIO, emit
import sqlite3
import random
import time
import threading
from datetime import datetime, timedelta
import json
import hashlib

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-here'
socketio = SocketIO(app, cors_allowed_origins="*")

# Database initialization
def init_db():
    conn = sqlite3.connect('smart_home.db')
    c = conn.cursor()
    
    # Users table
    c.execute('''CREATE TABLE IF NOT EXISTS users
                 (id INTEGER PRIMARY KEY, username TEXT UNIQUE, password TEXT)''')
    
    # Environmental data table
    c.execute('''CREATE TABLE IF NOT EXISTS env_data
                 (id INTEGER PRIMARY KEY, timestamp TEXT, temperature REAL, 
                  humidity REAL, air_quality INTEGER, energy_usage REAL,
                  water_usage REAL, light_level REAL)''')
    
    # Device status table
    c.execute('''CREATE TABLE IF NOT EXISTS devices
                 (id INTEGER PRIMARY KEY, name TEXT, type TEXT, status TEXT, 
                  energy_consumption REAL)''')
    
    # Smart suggestions table
    c.execute('''CREATE TABLE IF NOT EXISTS suggestions
                 (id INTEGER PRIMARY KEY, timestamp TEXT, message TEXT, 
                  category TEXT, priority INTEGER)''')
    
    # Initialize default user (admin/admin)
    c.execute("INSERT OR IGNORE INTO users (username, password) VALUES (?, ?)",
              ('admin', hashlib.md5('admin'.encode()).hexdigest()))
    
    # Initialize default devices
    devices = [
        ('Living Room Light', 'light', 'on', 15.5),
        ('Air Conditioner', 'hvac', 'on', 850.0),
        ('Smart Thermostat', 'thermostat', 'on', 25.0),
        ('Kitchen Appliances', 'appliance', 'on', 120.0),
        ('Water Heater', 'water', 'on', 400.0),
        ('Security System', 'security', 'on', 35.0)
    ]
    
    for device in devices:
        c.execute("INSERT OR IGNORE INTO devices (name, type, status, energy_consumption) VALUES (?, ?, ?, ?)", device)
    
    conn.commit()
    conn.close()

# Generate simulated sensor data
def generate_sensor_data():
    base_temp = 22 + random.uniform(-3, 3)
    base_humidity = 45 + random.uniform(-10, 15)
    base_air_quality = 85 + random.uniform(-20, 15)
    base_energy = 1200 + random.uniform(-200, 400)
    base_water = 150 + random.uniform(-30, 50)
    base_light = 60 + random.uniform(-20, 40)
    
    return {
        'temperature': round(base_temp, 1),
        'humidity': round(base_humidity, 1),
        'air_quality': max(0, min(100, int(base_air_quality))),
        'energy_usage': round(base_energy, 1),
        'water_usage': round(base_water, 1),
        'light_level': round(base_light, 1),
        'timestamp': datetime.now().isoformat()
    }

# Smart suggestions generator
def generate_suggestions(data):
    suggestions = []
    
    if data['temperature'] > 26:
        suggestions.append({
            'message': 'Temperature is high. Consider adjusting thermostat to save energy.',
            'category': 'energy',
            'priority': 2
        })
    
    if data['humidity'] > 60:
        suggestions.append({
            'message': 'High humidity detected. Turn on dehumidifier for comfort.',
            'category': 'comfort',
            'priority': 1
        })
    
    if data['air_quality'] < 70:
        suggestions.append({
            'message': 'Air quality is poor. Consider opening windows or using air purifier.',
            'category': 'health',
            'priority': 3
        })
    
    if data['energy_usage'] > 1400:
        suggestions.append({
            'message': 'High energy usage detected. Check if unnecessary devices are running.',
            'category': 'energy',
            'priority': 2
        })
    
    return suggestions

# Background thread for data simulation
def background_data_thread():
    while True:
        data = generate_sensor_data()
        
        # Store in database
        conn = sqlite3.connect('smart_home.db')
        c = conn.cursor()
        c.execute('''INSERT INTO env_data 
                     (timestamp, temperature, humidity, air_quality, energy_usage, water_usage, light_level)
                     VALUES (?, ?, ?, ?, ?, ?, ?)''',
                  (data['timestamp'], data['temperature'], data['humidity'], 
                   data['air_quality'], data['energy_usage'], data['water_usage'], data['light_level']))
        
        # Generate and store suggestions
        suggestions = generate_suggestions(data)
        for suggestion in suggestions:
            c.execute('''INSERT INTO suggestions (timestamp, message, category, priority)
                         VALUES (?, ?, ?, ?)''',
                      (data['timestamp'], suggestion['message'], 
                       suggestion['category'], suggestion['priority']))
        
        conn.commit()
        conn.close()
        
        # Emit data to connected clients
        socketio.emit('sensor_data', data)
        if suggestions:
            socketio.emit('new_suggestions', suggestions)
        
        time.sleep(5)  # Update every 5 seconds

@app.route('/')
def index():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    return render_template('dashboard.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = hashlib.md5(request.form['password'].encode()).hexdigest()
        
        conn = sqlite3.connect('smart_home.db')
        c = conn.cursor()
        c.execute("SELECT id FROM users WHERE username=? AND password=?", (username, password))
        user = c.fetchone()
        conn.close()
        
        if user:
            session['user_id'] = user[0]
            session['username'] = username
            return redirect(url_for('index'))
        else:
            return render_template('login.html', error='Invalid credentials')
    
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.pop('user_id', None)
    session.pop('username', None)
    return redirect(url_for('login'))

@app.route('/api/current_data')
def get_current_data():
    conn = sqlite3.connect('smart_home.db')
    c = conn.cursor()
    c.execute('''SELECT * FROM env_data ORDER BY timestamp DESC LIMIT 1''')
    data = c.fetchone()
    conn.close()
    
    if data:
        return jsonify({
            'temperature': data[2],
            'humidity': data[3],
            'air_quality': data[4],
            'energy_usage': data[5],
            'water_usage': data[6],
            'light_level': data[7],
            'timestamp': data[1]
        })
    return jsonify({})

@app.route('/api/historical_data')
def get_historical_data():
    hours = request.args.get('hours', 24, type=int)
    conn = sqlite3.connect('smart_home.db')
    c = conn.cursor()
    c.execute('''SELECT * FROM env_data 
                 WHERE datetime(timestamp) > datetime('now', '-{} hours')
                 ORDER BY timestamp'''.format(hours))
    data = c.fetchall()
    conn.close()
    
    result = []
    for row in data:
        result.append({
            'timestamp': row[1],
            'temperature': row[2],
            'humidity': row[3],
            'air_quality': row[4],
            'energy_usage': row[5],
            'water_usage': row[6],
            'light_level': row[7]
        })
    
    return jsonify(result)

@app.route('/api/devices')
def get_devices():
    conn = sqlite3.connect('smart_home.db')
    c = conn.cursor()
    c.execute("SELECT * FROM devices")
    devices = c.fetchall()
    conn.close()
    
    result = []
    for device in devices:
        result.append({
            'id': device[0],
            'name': device[1],
            'type': device[2],
            'status': device[3],
            'energy_consumption': device[4]
        })
    
    return jsonify(result)

@app.route('/api/device/<int:device_id>/toggle', methods=['POST'])
def toggle_device(device_id):
    conn = sqlite3.connect('smart_home.db')
    c = conn.cursor()
    c.execute("SELECT status FROM devices WHERE id=?", (device_id,))
    current_status = c.fetchone()[0]
    
    new_status = 'off' if current_status == 'on' else 'on'
    c.execute("UPDATE devices SET status=? WHERE id=?", (new_status, device_id))
    conn.commit()
    conn.close()
    
    return jsonify({'status': new_status})

@app.route('/api/suggestions')
def get_suggestions():
    conn = sqlite3.connect('smart_home.db')
    c = conn.cursor()
    c.execute('''SELECT * FROM suggestions 
                 WHERE datetime(timestamp) > datetime('now', '-1 hour')
                 ORDER BY priority DESC, timestamp DESC LIMIT 10''')
    suggestions = c.fetchall()
    conn.close()
    
    result = []
    for suggestion in suggestions:
        result.append({
            'id': suggestion[0],
            'timestamp': suggestion[1],
            'message': suggestion[2],
            'category': suggestion[3],
            'priority': suggestion[4]
        })
    
    return jsonify(result)

if __name__ == '__main__':
    init_db()
    
    # Start background data generation thread
    data_thread = threading.Thread(target=background_data_thread)
    data_thread.daemon = True
    data_thread.start()
    
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)