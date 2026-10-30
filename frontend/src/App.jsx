
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import CitizenDashboard from "./pages/CitizenDashboard";
import AreaAdminDashboard from "./pages/AreaAdminDashboard";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import CitizenProfile from "./pages/CitizenProfile";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public pages */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Citizen dashboard */}
        <Route
          path="/citizen-dashboard"
          element={<CitizenDashboard />}
        />

        {/* Redirect the alternate citizen dashboard URL */}
        <Route
          path="/citizen/dashboard"
          element={
            <Navigate to="/citizen-dashboard" replace />
          }
        />

        {/* Citizen profile */}
        <Route
          path="/citizen/profile"
          element={<CitizenProfile />}
        />

        {/* Area admin dashboard */}
        <Route
          path="/area-admin-dashboard"
          element={<AreaAdminDashboard />}
        />

        {/* Super admin dashboard */}
        <Route
          path="/super-admin-dashboard"
          element={<SuperAdminDashboard />}
        />

        {/* Redirect the old admin URL */}
        <Route
          path="/admin-dashboard"
          element={
            <Navigate to="/area-admin-dashboard" replace />
          }
        />

        {/* Redirect unknown URLs to the home page */}
        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
