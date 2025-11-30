import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "../layouts";
import {
  Welcome,
  Login,
  Dashboard,
  Judge,
  Leaderboard,
  UserProfile,
  JudgeProfile,
  Models,
  QuestionPool,
  Results,
} from "../pages";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  requiredRole?: "user" | "judge";
}> = ({ children, requiredRole }) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return (
      <Navigate to={user.role === "user" ? "/dashboard" : "/judge"} replace />
    );
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
          <Route path="/leaderboard" element={<Leaderboard />} />
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  );
};
