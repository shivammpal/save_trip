// File: src/components/ui/Layout.tsx

import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

export const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    // CHANGED: Explicitly set the background to match the login page.
    <div className="flex flex-col min-h-screen bg-slate-900 font-sans">
      <Navbar />
      <main className="container mx-auto p-4 flex-grow">
        {children}
      </main>
      <Footer />
    </div>
  );
};