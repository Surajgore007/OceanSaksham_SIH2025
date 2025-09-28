import React from "react";
import { BrowserRouter, Routes as RouterRoutes, Route } from "react-router-dom";
import ScrollToTop from "components/ScrollToTop";
import ErrorBoundary from "components/ErrorBoundary";
import NotFound from "pages/NotFound";
import MainDashboard from './pages/main-dashboard';
import LoginPage from './pages/login';
import OfficialConsole from './pages/official-console';
import ReportSubmission from './pages/reportsubmission';
import ConsoleAlerts from './pages/console-alerts';
import Register from './pages/register';

const Routes = () => {
  return (
    <BrowserRouter>
      <ErrorBoundary>
      <ScrollToTop />
      <RouterRoutes>
        {/* Define your route here */}
        <Route path="/" element={<LoginPage />} />
        <Route path="/main-dashboard" element={<MainDashboard />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/official-console" element={<OfficialConsole />} />
        <Route path="/report-submission" element={<ReportSubmission />} />
        <Route path="/console-alerts" element={<ConsoleAlerts />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<NotFound />} />
      </RouterRoutes>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default Routes;
