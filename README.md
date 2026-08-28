# 🚨 Alert Life — Health Emergency Response System

> A full-stack web application connecting citizens, volunteers, hospitals, and doctors during medical emergencies.

---

## 📁 Project Structure

```
alertlink/
├── frontend/          # React.js + Vite frontend
└── backend/           # Node.js + Express + MongoDB backend
```

---

## 🖥️ Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at: **http://localhost:5173**

### Tech Stack
- **React 18** with React Router v6
- **Vite** build tool
- **Chart.js** + react-chartjs-2 for analytics
- **React-Leaflet** for live maps
- **React Hot Toast** for notifications
- **Axios** for API calls
- **CSS Custom Properties** — premium dark glassmorphism design

---

## ⚙️ Backend Setup

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment
Edit `.env` file:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/alertlife
JWT_SECRET=your_secret_key_here
JWT_EXPIRE=30d
CLIENT_URL=http://localhost:5173
```

### 3. Start MongoDB
Make sure MongoDB is running locally or provide an Atlas connection string.

### 4. Run Server
```bash
# Development (with nodemon)
npm run dev

# Production
npm start
```

Backend runs at: **http://localhost:5000**

### Tech Stack
- **Node.js** + **Express.js**
- **MongoDB** + **Mongoose**
- **JWT** authentication
- **bcryptjs** password hashing

---

## 👥 User Roles & Demo

| Role       | Email                      | Password     |
|------------|---------------------------|--------------|
| Admin      | admin@alertlife.com        | password123  |
| Citizen    | citizen@alertlife.com      | password123  |
| Volunteer  | volunteer@alertlife.com    | password123  |
| Hospital   | hospital@alertlife.com     | password123  |
| Doctor     | doctor@alertlife.com       | password123  |

---

## 🔗 API Endpoints

| Method | Endpoint                          | Access              |
|--------|----------------------------------|---------------------|
| POST   | /api/auth/register               | Public              |
| POST   | /api/auth/login                  | Public              |
| GET    | /api/auth/me                     | Protected           |
| POST   | /api/emergencies                 | Citizen/Volunteer   |
| GET    | /api/emergencies                 | Protected           |
| PUT    | /api/emergencies/:id/accept      | Volunteer           |
| POST   | /api/ambulance                   | Protected           |
| PUT    | /api/ambulance/:id/assign        | Hospital/Admin      |
| POST   | /api/doctors/consultation        | Volunteer/Citizen   |
| GET    | /api/education                   | Public              |
| GET    | /api/events                      | Public              |
| POST   | /api/events/:id/register         | Protected           |
| GET    | /api/notifications               | Protected           |
| GET    | /api/reports/dashboard           | Admin               |
| GET    | /api/volunteers                  | Admin/Hospital      |
| PUT    | /api/volunteers/:id/verify       | Admin               |

---

## 🧩 Modules

| Module | Description |
|--------|-------------|
| 🚨 SOS Emergency | GPS-based SOS trigger with volunteer dispatch |
| 🗺️ Emergency Map | Live tracking with Leaflet/OpenStreetMap |
| 🚑 Ambulance | Hospital ambulance request & dispatch |
| 👨‍⚕️ Consultation | Audio/Video doctor consultation |
| 📚 Education | CPR training, first aid articles & videos |
| 📅 Events | Health webinars, workshops & registration |
| 🔔 Notifications | Real-time alerts for all user roles |
| 📈 Reports | Analytics dashboards with Chart.js |

---

## 🗄️ MongoDB Collections

- `users` — All user accounts with roles
- `citizens` — Citizen health profiles
- `volunteers` — Volunteer skills & availability
- `hospitals` — Hospital & ambulance fleet
- `doctors` — Doctor specializations
- `emergencyrequests` — SOS incidents
- `volunteerassignments` — Volunteer-emergency linking
- `ambulancerequests` — Ambulance dispatch records
- `doctorconsultations` — Consultation history
- `educationalcontents` — CPR/health content
- `awarenessevents` — Webinars & workshops
- `notifications` — User alert messages

---

## ✨ Features

- ✅ Role-based authentication (5 roles)
- ✅ Haversine formula volunteer matching
- ✅ Real-time GPS location capture
- ✅ Live map with volunteer/ambulance tracking
- ✅ Audio/video consultation UI
- ✅ Chart.js analytics dashboard
- ✅ CPR education content viewer
- ✅ Event registration with capacity tracking
- ✅ In-app notification system
- ✅ Premium dark glassmorphism UI

---

## 📞 Support

Alert Life — Built with ❤️ for community emergency response.
