import { Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthCallbackPage } from "./pages/AuthCallbackPage";
import { ProfilePage } from "./pages/ProfilePage";
import { TravelPage } from "./pages/TravelPage";
import { TripDetailsPage } from "./pages/TripDetailsPage";
import { DocumentsPage } from "./pages/DocumentsPage";

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/trips/:tripId/documents" element={<ProtectedRoute><DocumentsPage /></ProtectedRoute>} />
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={<ProtectedRoute><ProfilePage /></ProtectedRoute>}
        />
        <Route
          path="/travel"
          element={
            <ProtectedRoute>
              <TravelPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/trips/:tripId"
          element={
            <ProtectedRoute>
              <TripDetailsPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Layout>
  );
}

export default App;

