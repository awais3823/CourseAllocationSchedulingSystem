import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Landing
import LandingPage from './pages/LandingPage';

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
import ExamDatesheetManagement from './pages/admin/ExamDatesheetManagement';
import OverloadApprovals from './pages/admin/OverloadApprovals';
import MarksEntry from './pages/admin/MarksEntry';

// Student Pages
import CourseRegistration from './pages/student/CourseRegistration';
import MyCourses from './pages/student/MyCourses';
import StudentTimetable from './pages/student/StudentTimetable';
import StudentExamDatesheet from './pages/student/StudentExamDatesheet';
import StudentResults from './pages/student/StudentResults';
import StudentAttendance from './pages/student/StudentAttendance';

// Teacher Pages
import TeacherTimetable from './pages/teacher/TeacherTimetable';
import TeacherExamDatesheet from './pages/teacher/TeacherExamDatesheet';
import TeacherAttendance from './pages/teacher/TeacherAttendance';
import TeacherAttendanceView from './pages/teacher/TeacherAttendanceView';
import TeacherAllocatedCourses from './pages/teacher/TeacherAllocatedCourses';

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
              <Route
                path="/admin/exam-datesheets"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Layout>
                      <ExamDatesheetManagement />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/overload-approvals"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Layout>
                      <OverloadApprovals />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/marks"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Layout>
                      <MarksEntry />
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
              <Route
                path="/student/exam-datesheet"
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <Layout>
                      <StudentExamDatesheet />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/results"
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <Layout>
                      <StudentResults />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/attendance"
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <Layout>
                      <StudentAttendance />
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
              <Route
                path="/teacher/exam-datesheet"
                element={
                  <ProtectedRoute allowedRoles={['teacher']}>
                    <Layout>
                      <TeacherExamDatesheet />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teacher/attendance"
                element={
                  <ProtectedRoute allowedRoles={['teacher']}>
                    <Layout>
                      <TeacherAttendance />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teacher/attendance-view"
                element={
                  <ProtectedRoute allowedRoles={['teacher']}>
                    <Layout>
                      <TeacherAttendanceView />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teacher/allocated-courses"
                element={
                  <ProtectedRoute allowedRoles={['teacher']}>
                    <Layout>
                      <TeacherAllocatedCourses />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              {/* Landing + fallback */}
              <Route path="/" element={<LandingPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
