# 🎟️ CSCI 571 – Homework 3: Ticketmaster Search App

**Author:** Linzi Tu  
**USC ID:** 7539517448  

**Deployed URL:** [https://myfirstpython-0615.uw.r.appspot.com/search](https://myfirstpython-0615.uw.r.appspot.com/search)  
**Source Code:** [GitHub Repository](https://github.com/linzitu/ticketmaster_search_app)
**Github URL:** [https://linzitu.github.io/fewj8g8u3.html](https://linzitu.github.io/fewj8g8u3.html)
---

## 🧩 Overview

This project implements a **responsive web application** that allows users to search for live events using the **Ticketmaster API**, view detailed event information, mark favorites stored in **MongoDB Atlas**, and share events on **Facebook** and **Twitter**.  
It was built using **Angular (Frontend)**, **Node.js + Express (Backend)**, and deployed on **Google Cloud App Engine**.

---

## 🚀 Features

### 🔍 Search Page
- Keyword autocomplete via Ticketmaster Suggest API  
- Auto-detect location (using ipinfo.io) or manual address input (Geocoding API)  
- Category and distance filters  
- Responsive grid of event cards with images and basic info  
- Validation for missing fields or invalid input  

### 📄 Event Details Page
- “Back to Search” preserves previous state and scroll position  
- Tabs: **Info | Artists/Teams | Venue**  
- Ticket status (color-coded) and seat map display  
- Buy Tickets link (Ticketmaster official page)  
- Share on Facebook / Twitter in new tab  

### 💖 Favorites Page
- Add or remove favorites with toast notifications (Sonner library)  
- Undo support for recent deletions  
- Favorites persisted in MongoDB Atlas  
- Events sorted by added time and remain after page reload  

### 🧠 Backend APIs
- Proxy server for Ticketmaster API (calls done server-side to protect API key)  
- Endpoints for search, suggest, event details, and favorites CRUD  
- Uses `express` and `mongoose` libraries  

## 💻 Local Setup & Run Instructions

### 1️⃣ Clone the repository
```bash
git clone https://github.com/linzitu/ticketmaster_search_app.git
cd ticketmaster_search_app-main
```

### 2️⃣ Backend Setup
```bash
cd backend
npm install
```
Create a `.env` file inside `backend/` containing your API keys:
```git add .
TICKETMASTER_API_KEY=your_key
SPOTIFY_CLIENT_ID=your_id
SPOTIFY_CLIENT_SECRET=your_secret
MONGODB_URI=your_mongodb_connection_string
```
Then run locally:
```bash
node src/server.js
```

### 3️⃣ Frontend Setup
```bash
cd ../frontend
npm install
npm start
```
Frontend will run at `http://localhost:4200` and call backend via proxy.

---

## ☁️ Deployment to Google Cloud App Engine

1. Build the Angular app:
   ```bash
   cd frontend
   ng build --configuration production
   ```
2. Copy the built files to `backend/public` (or `dist`) folder.  
3. Deploy the Node.js app:
   ```bash
   cd ../backend
   gcloud app deploy
   ```
4. Access the app at: `https://<your-project-id>.uw.r.appspot.com/search`

---

## 🧠 APIs Used

| API | Purpose |
|-----|----------|
| Ticketmaster Discovery API | Search events, suggest keywords, event details |
| Google Geocoding API | Convert address to latitude/longitude |
| ipinfo.io API | Detect user location via IP |
| Spotify Web API | Fetch artist details and albums |
| Facebook Share API | Create social post |
| Twitter Intent API | Create tweet |

---

## 💾 Database Design

- **Database:** MongoDB Atlas  
- **Collection:** `favorites`  
- **Document Structure:**
  ```json
  {
    "eventId": "Z7r9jZ1Ad0p0e",
    "name": "Coldplay Live Tour",
    "date": "2025-11-15",
    "venue": "SoFi Stadium",
    "category": "Music",
    "image": "https://...",
    "addedAt": "2025-11-11T08:30:00Z"
  }
  ```

---

## 🧪 Testing Checklist (For Grading)

✅ Frontend & backend both deployed on Google Cloud  
✅ Working AJAX calls to Ticketmaster via backend  
✅ Responsive layout for mobile and desktop  
✅ Favorites persist after reload  
✅ Undo works in toast notification  
✅ Links to cloud deployment and JSON endpoint included in GitHub Page

---

## 📄 References

- [Ticketmaster Developer Docs](https://developer.ticketmaster.com/)
- [Google Maps Geocoding API](https://developers.google.com/maps/documentation/geocoding/start)
- [Spotify Web API](https://developer.spotify.com/documentation/web-api/)
- [MongoDB Atlas Guide](https://www.mongodb.com/docs/atlas/)
- [Sonner Toast Library](https://sonner.emilkowal.ski/)

---

## 📬 Contact

**Name:** Linzi Tu  
**Email:** linzitu@usc.edu  
