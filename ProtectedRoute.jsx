import React from "react";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const authenticated =
    localStorage.getItem(
      "reviveai_authenticated"
    ) === "true";

  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}