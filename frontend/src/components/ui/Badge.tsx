// File: src/components/ui/Badge.tsx

import React from "react";

export const Badge = ({ children }: { children: React.ReactNode }) => {
  return (
    <span className="inline-block bg-blue-100 text-blue-800 text-xs font-semibold mr-2 mb-2 px-2.5 py-0.5 rounded-full">
      {children}
    </span>
  );
};