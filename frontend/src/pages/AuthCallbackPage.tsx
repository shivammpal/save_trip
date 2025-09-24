// File: src/pages/AuthCallbackPage.tsx

import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export const AuthCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    // Get the token from the URL query parameters
    const token = searchParams.get("token");

    if (token) {
      // If a token exists, save it using our context and redirect
      login(token);
      navigate("/dashboard");
    } else {
      // If no token, something went wrong, send back to login
      navigate("/login");
    }
  }, [searchParams, login, navigate]);

  return (
    <div className="flex justify-center items-center h-screen">
      <p>Authenticating...</p>
    </div>
  );
};
