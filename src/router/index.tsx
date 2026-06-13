import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "../layouts";
import {
  Welcome,
  Login,
  Dashboard,
  Judge,
  Leaderboard,
  Guidelines,
  UserProfile,
  JudgeProfile,
  Judges,
  Models,
  QuestionPool,
  Results,
} from "../pages";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  requiredRole?: "user" | "judge";
  requiresHead?: boolean;
}> = ({ children, requiredRole, requiresHead }) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If role is required, check if user has that role
  // Otherwise allow access regardless of role
  if (requiredRole && user.role !== requiredRole) {
    // Redirect to appropriate page based on current role
    return (
      <Navigate to={user.role === "user" ? "/dashboard" : "/judge"} replace />
    );
  }

  if (requiresHead && !user.isHead) {
    return <Navigate to={user.role === "user" ? "/dashboard" : "/judge"} replace />;
  }

  return <>{children}</>;
};

export const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Login />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/leaderboard/:experimentId" element={<Leaderboard />} />
          <Route path="/guidelines" element={<Guidelines />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute requiredRole="user">
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/judge"
            element={
              <ProtectedRoute requiredRole="judge">
                <Judge />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <UserProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/judge-profile"
            element={
              <ProtectedRoute requiredRole="judge">
                <JudgeProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/models"
            element={
              <ProtectedRoute requiredRole="user">
                <Models />
              </ProtectedRoute>
            }
          />
          <Route
            path="/questions"
            element={
              <ProtectedRoute requiredRole="user">
                <QuestionPool />
              </ProtectedRoute>
            }
          />
          <Route
            path="/results"
            element={
              <ProtectedRoute requiredRole="user">
                <Results />
              </ProtectedRoute>
            }
          />
          <Route
            path="/judges"
            element={
              <ProtectedRoute requiresHead>
                <Judges />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  );
};
