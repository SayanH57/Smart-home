\# 🏠 Smart Home Dashboard (Flask Web App)

A full-stack smart home dashboard built with \*\*Python (Flask)\*\* and
\*\*HTML/CSS/JS\*\*, featuring login authentication, device control, and
energy data visualization.

---

\## 🚀 Features

\- 🔐 User Login system (with SQLite backend) - 🌐 Real-time interactive
dashboard

\- 💡 Device control switches

\- 📊 Live data visualization (JavaScript-powered)

\- 💾 Lightweight and local (uses \`smart_home.db\`) - 🎨 Clean UI with
dark-themed dashboard

---

\## 📁 Project Structure \`\`\`

smart-home-dashboard/ ├── app.py

├── requirements.txt ├── smart_home.db

├── templates/

\# Flask backend server

> \# Python dependencies
>
> \# SQLite database (auto-created)

│ ├── dashboard.html

│ └── login.html

> \# Main dashboard template

\# Login page template

└── static/

> ├── styles.css ├── dashboard.js └── sw.js

\`\`\`

---

> \# Custom CSS styles
>
> \# JavaScript functionality

\# Service worker (optional)

\## 🔧 Installation & Run

1\. \*\*Clone this repo:\*\*

\`\`\`bash

git clone https://github.com/SayanH57/Smart-home-dashboard.git cd
Smart-home-dashboard

2\. Create virtual environment and install dependencies:

python -m venv venv

source venv/bin/activate \# On Windows: venv\Scripts\activate pip
install -r requirements.txt

3\. Run the Flask app:

python app.py

4\. Open your browser:

http://127.0.0.1:5000

---

🔐 Default Login

\> If you are using the existing smart_home.db, default credentials may
be preloaded:

Username: admin

Password: admin

---

📌 Future Enhancements

Firebase or MQTT real-time sensor data

ESP32 integration for real device control

Admin panel for adding devices

Responsive PWA version for mobile control

—

󰳕 Author

Sayan Halder

Email: ssroyal888@gmail.com GitHub: @SayanH57

---

📄 License

This project is licensed under the MIT License.

—
