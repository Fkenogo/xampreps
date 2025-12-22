import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import StudentDashboard from "./pages/dashboards/StudentDashboard";
import ParentDashboard from "./pages/dashboards/ParentDashboard";
import SchoolDashboard from "./pages/dashboards/SchoolDashboard";
import AdminDashboard from "./pages/dashboards/AdminDashboard";
import ExamsPage from "./pages/ExamsPage";
import ExamTakingPage from "./pages/ExamTakingPage";
import ExamResultsPage from "./pages/ExamResultsPage";
import SettingsPage from "./pages/SettingsPage";
import HistoryPage from "./pages/HistoryPage";
import AchievementsPage from "./pages/AchievementsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/past-papers" element={<ExamsPage type="Past Paper" />} />
            <Route path="/practice-papers" element={<ExamsPage type="Practice Paper" />} />
            
            {/* Protected Routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/dashboard/student" element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/dashboard/parent" element={
              <ProtectedRoute allowedRoles={['parent']}>
                <ParentDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/dashboard/school" element={
              <ProtectedRoute allowedRoles={['school']}>
                <SchoolDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/dashboard/admin" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } />

            {/* Exam Routes */}
            <Route path="/exams" element={
              <ProtectedRoute>
                <ExamsPage />
              </ProtectedRoute>
            } />
            
            <Route path="/exam/:examId" element={
              <ProtectedRoute>
                <ExamTakingPage />
              </ProtectedRoute>
            } />

            <Route path="/exam/:examId/results/:attemptId" element={
              <ProtectedRoute>
                <ExamResultsPage />
              </ProtectedRoute>
            } />

            {/* User Pages */}
            <Route path="/settings" element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            } />

            <Route path="/history" element={
              <ProtectedRoute>
                <HistoryPage />
              </ProtectedRoute>
            } />

            <Route path="/achievements" element={
              <ProtectedRoute>
                <AchievementsPage />
              </ProtectedRoute>
            } />
            
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
