// File: src/pages/RegisterPage.tsx

import { useState, useEffect } from "react";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { useNavigate, Link } from "react-router-dom";
import { registerUser, loginWithFirebaseGoogle } from "../services/apiService";
import { useAuth } from "../context/AuthContext";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../firebase";

// CHANGED: Made icon color lighter for the dark theme
const MailIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
  </svg>
);

const LockIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

const sampleImages = [
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80",  // mountain landscape
  "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=400&q=80",  // beach sunset
  "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=400&q=80",  // city skyline
  "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=400&q=80",  // forest trail
  "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=400&q=80",  // desert dunes
];

export const RegisterPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % sampleImages.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await registerUser(email, password);
      navigate("/login");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const { login } = useAuth();
  
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();
      const data = await loginWithFirebaseGoogle(idToken);
      login(data.access_token);
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      setError((err as Error).message || "Google signup failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* Left side: stacked images with front image changing */}
      <div className="hidden md:flex w-1/2 bg-slate-900 items-center justify-center relative p-8 overflow-hidden">
          {sampleImages.map((src, index) => {
            const isFront = index === currentIndex;
            const offset = (index - currentIndex + sampleImages.length) % sampleImages.length;
            const zIndex = offset === 1 ? 999 : sampleImages.length - offset;

            const translateX = (offset - 1) * 150; // position: left partial, center full, right partial
            const scale = offset === 1 ? 1 : 0.8; // full scale only for center
            const opacity = offset > 2 ? 0 : offset === 1 ? 1 : 0.3; // full opacity only for center, invisible for further back

            const baseHeight = 320; // base height for images
            const height = baseHeight * scale * 1.5; // adjusted size with scale

            return (
              <img
                key={index}
                src={src}
                alt={`Sample ${index + 1}`}
                className={`absolute rounded-3xl shadow-lg transition-all duration-700 ease-in-out`}
                style={{
                  zIndex,
                  height: `${height}px`,
                  width: `${height * 0.9}px`,
                  transform: `translateX(${translateX}px) scale(${scale})`,
                  opacity,
                  filter: isFront ? "none" : "brightness(0.7)",
                  transitionProperty: "transform, opacity, filter",
                }}
              />
            );
          })}
      </div>

      {/* Right side: register form */}
      <div className="w-full md:w-1/2 flex flex-col justify-center items-center p-8">
        <div className="w-full max-w-md p-8 space-y-6 bg-slate-800 rounded-2xl shadow-lg border border-slate-700">
          <h1 className="text-3xl font-bold text-center text-white" id="register-title">
            Create Your Account
          </h1>

          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-800 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition disabled:opacity-50"
          >
            <svg className="w-5 h-5 mr-3" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
              <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039L38.804 9.196C34.807 5.757 29.824 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
              <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039L38.804 9.196C34.807 5.757 29.824 4 24 4C16.733 4 10.608 8.077 6.306 14.691z" />
              <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
              <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.021 35.841 44 30.338 44 24c0-1.341-.138-2.65-.389-3.917z" />
            </svg>
            Sign up with Google
          </button>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-600"></div>
            <span className="flex-shrink mx-4 text-sm text-slate-400">OR</span>
            <div className="flex-grow border-t border-slate-600"></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" aria-labelledby="register-title">
            {error && <p className="text-red-500 text-sm text-center" id="error-message" role="alert">{error}</p>}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1">
                Email address
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                icon={MailIcon}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                showPasswordToggle
                icon={LockIcon}
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300 mb-1">
                Confirm Password
              </label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                showPasswordToggle
                icon={LockIcon}
              />
            </div>
            <Button type="submit" isLoading={isLoading} variant="primary">
              Create Account
            </Button>
          </form>
          <p className="text-center text-sm text-slate-400">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-blue-400 hover:text-blue-300 hover:underline">
              Log in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};