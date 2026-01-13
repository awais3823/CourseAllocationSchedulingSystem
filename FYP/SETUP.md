# Setup Instructions

## Quick Start Guide

Follow these steps to get the Course Allocation and Scheduling System up and running.

## Prerequisites

1. **Node.js** (v14 or higher) - [Download](https://nodejs.org/)
2. **MongoDB** (v4.4 or higher) - [Download](https://www.mongodb.com/try/download/community)
3. **npm** (comes with Node.js)

## Step 1: Install MongoDB

1. Download and install MongoDB from the official website
2. Start MongoDB service:
   - **Windows**: MongoDB should start automatically as a service
   - **Mac/Linux**: Run `mongod` in terminal

## Step 2: Backend Setup

1. Open terminal and navigate to the backend folder:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file in the `backend` folder:
```env
MONGODB_URI=mongodb://localhost:27017/courseSchedulingDB
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production_min_32_chars
PORT=5000
NODE_ENV=development
```

4. (Optional) Seed the database with sample data:
```bash
npm run seed
```

5. Start the backend server:
```bash
npm start
```

The backend will run on `http://localhost:5000`

## Step 3: Frontend Setup

1. Open a **new terminal** window and navigate to the frontend folder:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file in the `frontend` folder:
```env
REACT_APP_API_URL=http://localhost:5000/api
```

4. Start the frontend development server:
```bash
npm start
```

The frontend will automatically open in your browser at `http://localhost:3000`

## Step 4: Login

After seeding the database, use these credentials:

### Admin Account
- **Email**: `admin@university.edu`
- **Password**: `admin123`

### Teacher Account
- **Email**: `teacher1@university.edu`
- **Password**: `teacher123`

### Student Account
- **Email**: `student1@university.edu`
- **Password**: `student123`

## Troubleshooting

### MongoDB Connection Error
- Make sure MongoDB is running
- Check if the connection string in `.env` is correct
- Try: `mongodb://127.0.0.1:27017/courseSchedulingDB`

### Port Already in Use
- Backend: Change `PORT` in `backend/.env`
- Frontend: React will ask to use a different port automatically

### Module Not Found
- Delete `node_modules` folder
- Delete `package-lock.json`
- Run `npm install` again

### CORS Errors
- Make sure backend is running on port 5000
- Check `REACT_APP_API_URL` in frontend `.env`

## Development Commands

### Backend
```bash
npm start          # Start server
npm run dev        # Start with nodemon (auto-reload)
npm test           # Run tests
npm run seed       # Seed database
```

### Frontend
```bash
npm start          # Start development server
npm test           # Run tests
npm run build      # Build for production
```

## Production Deployment

### Backend
1. Set `NODE_ENV=production` in `.env`
2. Use a process manager like PM2:
```bash
npm install -g pm2
pm2 start server.js
```

### Frontend
1. Build the production version:
```bash
npm run build
```
2. Serve the `build` folder using a web server (nginx, Apache, etc.)

## Next Steps

1. **Customize**: Update seed data in `backend/scripts/seedData.js`
2. **Configure**: Adjust time slots and days in timetable generator
3. **Secure**: Change JWT_SECRET to a strong random string
4. **Deploy**: Follow production deployment steps above

## Support

For issues or questions, refer to the main README.md file.













