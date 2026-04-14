import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { ErrorBoundaryClass } from "./components/ErrorBoundary";
import { LandingPage } from "./pages/LandingPage";
import { LecturerAuthPage } from "./pages/LecturerAuthPage";
import { LecturerCoursesPage } from "./pages/LecturerCoursesPage";
import { LecturerDashboardPage } from "./pages/LecturerDashboardPage";
import { LecturerRecordsPage } from "./pages/LecturerRecordsPage";
import { StudentAuthPage } from "./pages/StudentAuthPage";
import { StudentScanPage } from "./pages/StudentScanPage";
import { LecturerSummaryPage } from "./pages/LecturerSummaryPage";

const ProtectedRoute = ({ role, children }) => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to={role === "lecturer" ? "/lecturer/auth" : "/student/auth"} replace />;
  }
  if (user.role !== role) {
    return <Navigate to="/" replace />;
  }
  return children;
};

export default function App() {
  return (
    <ErrorBoundaryClass>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/lecturer/auth" element={<LecturerAuthPage />} />
        <Route
          path="/lecturer"
          element={
            <ProtectedRoute role="lecturer">
              <Navigate to="/lecturer/scan" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/lecturer/courses"
          element={
            <ProtectedRoute role="lecturer">
              <LecturerCoursesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/lecturer/scan"
          element={
            <ProtectedRoute role="lecturer">
              <LecturerDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/lecturer/records"
          element={
            <ProtectedRoute role="lecturer">
              <LecturerRecordsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/lecturer/summary"
          element={
            <ProtectedRoute role="lecturer">
              <LecturerSummaryPage />
            </ProtectedRoute>
          }
        />
        <Route path="/student/auth" element={<StudentAuthPage />} />
        <Route
          path="/scan"
          element={
            <ProtectedRoute role="student">
              <StudentScanPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundaryClass>
  );
}
