import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import logo from "./Gemini_Generated_Image_6gg4an6gg4an6gg4-modified.png";

export const Navbar = () => {
  const { isAuthenticated, logout } = useAuth();
  return (
    <nav className="bg-slate-800 text-gray-200 p-4 sticky top-0 z-50 border-b border-slate-700">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="flex items-center space-x-2">
          <img src={logo} alt="Logo" className="h-8 w-8" />
          <span className="text-xl font-bold text-white">Pocket Yatra</span>
        </Link>
        <div className="space-x-6 flex items-center">
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className="font-medium hover:text-blue-600">
                Dashboard
              </Link>
              <Link to="/travel" className="font-medium hover:text-blue-600">
                Travel
              </Link>
              <Link to="/profile" className="font-medium hover:text-blue-600">
                Profile
              </Link>
              <Link to="/chat" className="font-medium hover:text-blue-600">
                Messages
              </Link>
              <button
                onClick={logout}
                className="bg-red-500 text-white hover:bg-red-600 px-4 py-2 rounded-md font-semibold transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="font-medium hover:text-blue-400 transition-colors">Login</Link>
              <Link to="/register" className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-md font-semibold transition-colors">Register</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};
