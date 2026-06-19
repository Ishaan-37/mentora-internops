// src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom';

import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';

import AdminLayout from './layouts/AdminLayout';
import MentorLayout from './layouts/MentorLayout';
import InternLayout from './layouts/InternLayout';

import AdminDashboard from './pages/admin/AdminDashboard';
import ManageUsers from './pages/admin/ManageUsers';
import ManageBatches from './pages/admin/ManageBatches';

import MentorDashboard from './pages/mentor/MentorDashboard';
import InternDetail from './pages/mentor/InternDetail';
import Directory from './pages/mentor/Directory';
import ReviewSubmission from './pages/mentor/ReviewSubmission';

import InternDashboard from './pages/intern/InternDashboard';
import WorkItems from './pages/intern/WorkItems';
import WorkItemDetail from './pages/intern/WorkItemDetail';
import Timeline from './pages/intern/Timeline';
import Cohort from './pages/intern/Cohort';
import Notifications from './pages/intern/Notifications';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Admin routes */}
      <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<ManageUsers />} />
          <Route path="/admin/batches" element={<ManageBatches />} />
        </Route>
      </Route>

      {/* Mentor routes */}
      <Route element={<ProtectedRoute allowedRoles={['mentor']} />}>
        <Route element={<MentorLayout />}>
          <Route path="/mentor/dashboard" element={<MentorDashboard />} />
          <Route path="/mentor/interns" element={<MentorDashboard />} />
          <Route path="/mentor/interns/:id" element={<InternDetail />} />
          <Route path="/mentor/directory" element={<Directory />} />
          <Route path="/mentor/submissions" element={<ReviewSubmission />} />
        </Route>
      </Route>

      {/* Intern routes */}
      <Route element={<ProtectedRoute allowedRoles={['intern']} />}>
        <Route element={<InternLayout />}>
          <Route path="/intern/dashboard" element={<InternDashboard />} />
          <Route path="/intern/work-items" element={<WorkItems />} />
          <Route path="/intern/work-items/:id" element={<WorkItemDetail />} />
          <Route path="/intern/timeline" element={<Timeline />} />
          <Route path="/intern/cohort" element={<Cohort />} />
          <Route path="/intern/notifications" element={<Notifications />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
