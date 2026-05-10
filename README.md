# Placement Prep Tracker

A full-stack web application designed to help students manage placement preparation efficiently. The platform allows users to organize companies, track preparation progress, manage interview notes, and monitor placement-related activities in one place.

---

# Features

## Authentication System

* User signup and login
* Secure authentication using JWT
* Protected routes and middleware
* Session-based access control

## Dashboard

* Centralized placement preparation overview
* Quick access to companies, notes, and collections
* Clean premium dark glassmorphism UI
* Responsive layout for desktop, tablet, and mobile

## Company Management

Users can:

* Add companies
* Edit company details
* Delete companies
* Track placement status
* Store company-specific information

## Collections System

Users can:

* Create collections/categories
* Organize preparation material
* Group companies or notes together
* Update and delete collections

## Notes Management

Users can:

* Create preparation notes
* Save interview experiences
* Store important questions and answers
* Edit and delete notes

## Responsive UI

* Mobile-friendly design
* Tablet support
* Desktop optimized layout
* Modern glassmorphism styling

---

# Screenshots & Demo

A visual overview of the Placement Prep Tracker platform.

## Dashboard Overview
![Dashboard](./screenshots/dashboard.png)
*A high-level view of your placement journey, featuring interactive charts, real-time metrics, and quick actions.*

## Company Pipeline
![Company Tracker](./screenshots/company-tracker.png)
*Manage your applications with a powerful filtering system, status tracking, and archived views.*

## Preparation Notes
![Notes & Collections](./screenshots/notes.png)
*Organize your interview experiences and prep material into custom collections with a clean card-based layout.*

## Deep Analytics
![Analytics](./screenshots/analytics.png)
*Visualize your success rate, priority distribution, and application trends over time.*

## Smart Notifications
![Notifications](./screenshots/notifications.png)
*Stay on top of upcoming interviews and reminders with a dedicated notification center.*

## Mobile Experience
![Mobile View](./screenshots/mobile-responsive.png)
*Fully responsive design ensuring your preparation tracker is accessible on any device.*

## 🎥 Live Demo
<!-- Add a link to a walkthrough video or a GIF demo here -->
<!-- ![Demo GIF](./screenshots/demo.gif) -->

> [!TIP]
> **Portfolio Tip**: For a professional presentation, capture screenshots in a clean browser window (using Chrome DevTools Device Mode for mobile) and ensure the data populated in your demo account reflects a realistic placement journey.

---

# Tech Stack

## Frontend

* HTML
* CSS
* JavaScript

## Backend

* Node.js
* Express.js

## Database

* MongoDB
* Mongoose

## Authentication

* JWT (JSON Web Token)
* bcrypt

---

# Project Structure

```bash
placement-prep-tracker/
│
├── backend/            # Express.js API & MongoDB Models
├── frontend/           # Vanilla JS/CSS Dashboard UI
├── screenshots/        # Project UI/UX Documentation
├── .gitignore
└── README.md
```

---

# Installation

## 1. Clone the Repository

```bash
git clone <your-github-repo-link>
cd placement-prep-tracker
```

## 2. Install Backend Dependencies

```bash
cd backend
npm install
```

## 3. Configure Environment Variables

Create a `.env` file inside the backend folder.

Example:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
```

## 4. Start the Backend Server

```bash
npm start
```

or

```bash
node server.js
```

## 5. Run Frontend

Open the frontend HTML files using Live Server in VS Code.

---

# API Routes

## Auth Routes

* `POST /api/auth/register`
* `POST /api/auth/login`

## Company Routes

* `GET /api/company`
* `POST /api/company`
* `PUT /api/company/:id`
* `DELETE /api/company/:id`

## Collection Routes

* `GET /api/collections`
* `POST /api/collections`
* `PUT /api/collections/:id`
* `DELETE /api/collections/:id`

## Notes Routes

* `GET /api/notes`
* `POST /api/notes`
* `PUT /api/notes/:id`
* `DELETE /api/notes/:id`

---

# Future Improvements

Possible future upgrades:

* Interview scheduling system
* Resume upload and analysis
* DSA progress tracker
* Mock interview feature
* AI-powered preparation suggestions
* Placement analytics dashboard
* Notification/reminder system
* Cloud storage integration

---

# Deployment

The project can be deployed using:

* Frontend: Vercel
* Backend: Render
* Database: MongoDB Atlas

---

# Author

Developed by Ritesh.

---

# License

This project is for educational and learning purposes.
