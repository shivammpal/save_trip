// File: src/pages/HomePage.tsx (Updated for testing)

import { Globe } from "../components/Globe";

export const HomePage = () => {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'ring-blue-500' }}>
      <div className="container mx-auto px-4 py-16">
        <div className="flex items-center justify-end h-96">
          <div className="w-[700px] h-[640px] ring-blue-500">
            <Globe pinCoords={null} />
          </div>
        </div>
      </div>
    </div>
  );
};
