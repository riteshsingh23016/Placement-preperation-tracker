# Placement Prep Tracker

A full-stack web application designed to help students prepare systematically for placements by tracking coding progress, aptitude preparation, interview practice, and overall placement readiness.

---

## Features

### User Authentication

* Secure login and signup system
* User-specific dashboard and progress tracking
* Protected routes and session handling

### Dashboard

* Overview of preparation progress
* Track completed and pending tasks
* Monitor overall placement readiness

### Coding Practice Tracker

* Add coding problems solved
* Track topics and difficulty levels
* Monitor daily consistency and progress

### Aptitude Preparation

* Track aptitude topics completed
* Maintain preparation history
* Monitor strengths and weak areas

### Interview Preparation

* Add interview questions and notes
* Save HR and technical interview preparation material
* Track mock interview progress

### Task Management

* Create daily and weekly preparation goals
* Mark tasks as completed
* Organize preparation workflow effectively

### Progress Analytics

* Visual representation of preparation progress
* Track consistency and improvement over time
* Analyze performance in different categories

---

## Tech Stack

### Frontend

* React.js
* HTML5
* CSS3
* JavaScript

### Backend

* Node.js
* Express.js

### Database

* MongoDB

### Other Tools

* Git & GitHub
* REST APIs
* JWT Authentication

---

## Project Structure

```bash
placement-prep-tracker/
│
├── frontend/
│   ├── public/
│   ├── src/
│   ├── package.json
│
├── backend/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   ├── server.js
│   ├── package.json
│
├── README.md
```

---

## Installation and Setup

### Clone the Repository

```bash
git clone https://github.com/ritesh-singh01/placement-prep-tracker.git
```

### Move into the Project Folder

```bash
cd placement-prep-tracker
```

---

## Backend Setup

```bash
cd backend
npm install
```

### Start Backend Server

```bash
npm start
```

---

## Frontend Setup

Open a new terminal:

```bash
cd frontend
npm install
npm start
```

---

## Environment Variables

Create a `.env` file inside the backend folder and add:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
```

---

## Future Improvements

* Resume analyzer integration
* AI-based preparation suggestions
* Company-wise preparation roadmap
* Leaderboards and rankings
* Mock test platform
* Real-time notifications
* Interview scheduling system

---

## Learning Outcomes

This project demonstrates:

* Full-stack web development
* REST API creation
* Authentication and authorization
* Database management
* Frontend and backend integration
* CRUD operations
* Deployment workflow using GitHub

---

## Author

**Ritesh Singh**

GitHub: [https://github.com/ritesh-singh01](https://github.com/ritesh-singh01)

---

## License

This project is created for educational and portfolio purposes.
