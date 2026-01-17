import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Auth Pages
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';

// Admin Pages
import AdminStatistics from './pages/admin/AdminStatistics';
import CourseManagement from './pages/admin/CourseManagement';
import CourseAllocation from './pages/admin/CourseAllocation';
import ClassroomManagement from './pages/admin/ClassroomManagement';
import TimetableManagement from './pages/admin/TimetableManagement';
import UserManagement from './pages/admin/UserManagement';

// Student Pages
import CourseRegistration from './pages/student/CourseRegistration';
import MyCourses from './pages/student/MyCourses';
import StudentTimetable from './pages/student/StudentTimetable';

// Teacher Pages
import TeacherTimetable from './pages/teacher/TeacherTimetable';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <div className="App">
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              
              {/* Protected Routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Dashboard />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              {/* Admin Routes */}
              <Route
                path="/admin/statistics"
                element={
                    <ProtectedRoute allowedRoles={['admin']}>
                    <Layout>
                      <AdminStatistics />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/courses"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Layout>
                      <CourseManagement />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/allocations"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Layout>
                      <CourseAllocation />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/classrooms"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Layout>
                      <ClassroomManagement />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/timetable"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Layout>
                      <TimetableManagement />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Layout>
                      <UserManagement />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              {/* Student Routes */}
              <Route
                path="/student/registration"
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <Layout>
                      <CourseRegistration />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/courses"
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <Layout>
                      <MyCourses />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/timetable"
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <Layout>
                      <StudentTimetable />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              {/* Teacher Routes */}
              <Route
                path="/teacher/timetable"
                element={
                  <ProtectedRoute allowedRoles={['teacher']}>
                    <Layout>
                      <TeacherTimetable />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              {/* Default redirect */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
