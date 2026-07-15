import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import ProtectedRoute from "./components/ProtectedRoute";
import AutoFlowShell from "./autoflow/AutoFlowShell";
import AuthPage from "./autoflow/AuthPage";
import {
  ApprovalsPage,
  AuditPage,
  AssistantPage,
  AutomationsPage,
  DashboardPage,
  DocumentsPage,
  EvidenceStudioPage,
  ExecutiveReportPage,
  InsightsPage,
  SecurityPage,
  SettingsPage,
  TrashPage,
} from "./autoflow/WorkspaceViews";

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ className: "flow-toast" }} />
      <Routes>
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/register" element={<AuthPage mode="register" />} />
        <Route
          element={
            <ProtectedRoute>
              <AutoFlowShell />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/evidence/:id" element={<EvidenceStudioPage />} />
          <Route path="/report/:id" element={<ExecutiveReportPage />} />
          <Route path="/automations" element={<AutomationsPage />} />
          <Route path="/approvals" element={<ApprovalsPage />} />
          <Route path="/assistant" element={<AssistantPage />} />
          <Route path="/insights" element={<InsightsPage />} />
          <Route path="/audit" element={<AuditPage />} />
          <Route path="/security" element={<SecurityPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/trash" element={<TrashPage />} />
        </Route>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
