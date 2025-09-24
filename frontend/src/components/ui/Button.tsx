// File: src/components/ui/Button.tsx

import React from "react";

// Extend the standard button props to add our own, like isLoading
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  variant?: "primary" | "secondary";
}

export const Button = ({
  children,
  isLoading,
  variant = "primary",
  ...props
}: ButtonProps) => {
  // ADDED: Base classes now include more refined focus rings and transitions
  const baseClasses =
    "w-full font-bold py-3 px-4 rounded-lg transition-all duration-300 ease-in-out focus:outline-none focus:ring-4 focus:ring-opacity-50 disabled:opacity-60 disabled:cursor-not-allowed transform hover:-translate-y-0.5 active:scale-95";

  // CHANGED: Updated variant classes for a more modern look
  const variantClasses = {
    primary:
      "bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 focus:ring-blue-300 shadow-md hover:shadow-lg",
    secondary:
      "bg-gray-100 text-gray-800 hover:bg-gray-200 focus:ring-gray-300 border border-gray-300",
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <div className="flex items-center justify-center">
          <svg
            className="animate-spin -ml-1 mr-3 h-5 w-5 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          Loading...
        </div>
      ) : (
        children
      )}
    </button>
  );
};