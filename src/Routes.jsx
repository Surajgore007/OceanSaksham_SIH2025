import React from "react";
import { BrowserRouter, Routes as RouterRoutes, Route, Navigate } from "react-router-dom";
import ScrollToTop from "components/ScrollToTop";
import ErrorBoundary from "components/ErrorBoundary";
import NotFound from "pages/NotFound";
import MainDashboard from './pages/main-dashboard';
import LoginPage from './pages/login';
import OfficialConsole from './pages/official-console';
import ReportSubmission from './pages/reportsubmission';
import ConsoleAlerts from './pages/console-alerts';
import Register from './pages/register';

/**
 * Application Routes
 *
 * Role-based routing rules:
 *   /main-dashboard       -> citizen
 *   /report-submission    -> citizen, official
 *   /official-console     -> official
 *   /console-alerts       → official only
 *
 * Role access is enforced by AuthenticationGuard inside each page.
 * Missing secondary routes (/my-reports, /settings, /help, /profile,
 * /forgot-password) redirect gracefully instead of hard-404'ing.
 */
const Routes = () => {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <ScrollToTop />
        <RouterRoutes>
          {/* Auth pages */}
          <Route path="/" element={<LoginPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<Register />} />

          {/* Forgot password — redirect to login until feature is built */}
          <Route path="/forgot-password" element={<Navigate to="/login" replace />} />

          {/* Core app routes */}
          <Route path="/main-dashboard" element={<MainDashboard />} />
          <Route path="/report-submission" element={<ReportSubmission />} />
          <Route path="/official-console" element={<OfficialConsole />} />
          <Route path="/console-alerts" element={<ConsoleAlerts />} />

          {/* Secondary routes — redirect to main dashboard until pages are built.
              These are linked from Header / BottomTabNavigation; 404'ing them
              would cause a broken UX. */}
          <Route path="/my-reports" element={<Navigate to="/main-dashboard" replace />} />
          <Route path="/settings" element={<Navigate to="/main-dashboard" replace />} />
          <Route path="/help" element={<Navigate to="/main-dashboard" replace />} />
          <Route path="/profile" element={<Navigate to="/main-dashboard" replace />} />

          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
        </RouterRoutes>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default Routes;
