import { useState, useEffect } from "react";

const images = [
  "https://images.pexels.com/photos/4993240/pexels-photo-4993240.jpeg",
  "https://images.pexels.com/photos/4824425/pexels-photo-4824425.jpeg",
  "https://images.pexels.com/photos/6960385/pexels-photo-6960385.jpeg",
  "https://images.pexels.com/photos/12161833/pexels-photo-12161833.jpeg",
  "https://images.pexels.com/photos/3932687/pexels-photo-3932687.jpeg",
];

export const HomePage = () => {
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [fade, setFade] = useState(true);

  // Typing animation
  useEffect(() => {
    const fullTitle = "Welcome to Pocket Yatra";
    const fullSubtitle = "Your Budget Trip Planner";

    let i = 0;
    const typeTitle = setInterval(() => {
      setTitle(fullTitle.slice(0, i + 1));
      i++;
      if (i === fullTitle.length) clearInterval(typeTitle);
    }, 100);

    const subtitleTimeout = setTimeout(() => {
      let j = 0;
      const typeSubtitle = setInterval(() => {
        setSubtitle(fullSubtitle.slice(0, j + 1));
        j++;
        if (j === fullSubtitle.length) clearInterval(typeSubtitle);
      }, 100);
    }, 2200);

    return () => {
      clearInterval(typeTitle);
      clearTimeout(subtitleTimeout);
    };
  }, []);

  // Smooth background crossfade
  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setCurrentImageIndex((prev) => (prev + 1) % images.length);
        setFade(true);
      }, 1000);
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full min-h-screen bg-gray-900 overflow-x-hidden font-sans">
      {/* 1. HERO SECTION */}
      <section className="relative w-full h-screen flex flex-col items-center justify-center overflow-hidden">
        {/* Background Crossfade */}
        <div
          className={`absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat transition-all duration-[2000ms] ease-in-out z-0`}
          style={{
            backgroundImage: `url(${images[currentImageIndex]})`,
            opacity: fade ? 1 : 0,
            transform: fade ? "scale(1.05)" : "scale(1)",
          }}
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-gray-900 z-0"></div>

        {/* Centered Hero Content */}
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-4 mt-16">
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-100 to-gray-300 mb-6 drop-shadow-2xl">
            {title}
            <span className="animate-pulse text-white">|</span>
          </h1>
          <p className="text-xl md:text-3xl text-blue-200 font-light drop-shadow-lg max-w-2xl">
            {subtitle}
            <span className="animate-pulse text-white">|</span>
          </p>
          <div className="mt-12 animate-bounce flex flex-col items-center opacity-80 decoration-white">
            <span className="text-sm text-gray-300 mb-2 font-medium tracking-widest uppercase">Explore More</span>
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
          </div>
        </div>
      </section>

      {/* 2. FEATURES SECTION: "Why Choose Pocket Yatra" */}
      <section className="relative z-20 w-full py-24 px-6 lg:px-20 bg-gray-900">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Discover the Magic</h2>
          <p className="text-lg text-gray-400 mb-16 max-w-2xl mx-auto">
            Our AI-driven platform crafts your perfect getaway with smart budgeting and collaborative tools.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Feature 1 */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 hover:-translate-y-3 hover:bg-white/10 transition-all duration-300 shadow-[0_8px_30px_rgb(0,0,0,0.12)] cursor-pointer group">
              <div className="text-5xl mb-6 group-hover:scale-110 transition-transform duration-300">🤖</div>
              <h3 className="text-xl font-semibold text-white mb-3">AI Itineraries</h3>
              <p className="text-gray-400 text-sm leading-relaxed">Let our intelligent AI design a perfect, balanced day-by-day plan instantly.</p>
            </div>
            {/* Feature 2 */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 hover:-translate-y-3 hover:bg-white/10 transition-all duration-300 shadow-[0_8px_30px_rgb(0,0,0,0.12)] cursor-pointer group">
              <div className="text-5xl mb-6 group-hover:scale-110 transition-transform duration-300">💸</div>
              <h3 className="text-xl font-semibold text-white mb-3">Smart Budgeting</h3>
              <p className="text-gray-400 text-sm leading-relaxed">Automatically track all expenses. Real-time cost estimations to keep your wallet happy.</p>
            </div>
            {/* Feature 3 */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 hover:-translate-y-3 hover:bg-white/10 transition-all duration-300 shadow-[0_8px_30px_rgb(0,0,0,0.12)] cursor-pointer group">
              <div className="text-5xl mb-6 group-hover:scale-110 transition-transform duration-300">🤝</div>
              <h3 className="text-xl font-semibold text-white mb-3">Collaborative</h3>
              <p className="text-gray-400 text-sm leading-relaxed">Invite friends via email and collaboratively edit the itinerary in real time.</p>
            </div>
            {/* Feature 4 */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 hover:-translate-y-3 hover:bg-white/10 transition-all duration-300 shadow-[0_8px_30px_rgb(0,0,0,0.12)] cursor-pointer group">
              <div className="text-5xl mb-6 group-hover:scale-110 transition-transform duration-300">🎒</div>
              <h3 className="text-xl font-semibold text-white mb-3">AI Packing Lists</h3>
              <p className="text-gray-400 text-sm leading-relaxed">Never forget a toothbrush with AI-generated checklists tailored to your destination.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. HOW IT WORKS SECTION */}
      <section className="relative z-20 w-full py-24 px-6 lg:px-20 bg-gray-950 border-y border-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-500 mb-4">
              How Pocket Yatra Works
            </h2>
            <p className="text-lg text-gray-400">Your dream vacation is just three steps away.</p>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-center gap-12 relative">
            {/* Connecting line for desktop */}
            <div className="hidden md:block absolute top-1/2 left-20 right-20 h-0.5 bg-gradient-to-r from-teal-500/20 via-blue-500/50 to-purple-500/20 -z-10 transform -translate-y-1/2"></div>
            
            {/* Step 1 */}
            <div className="flex flex-col items-center text-center relative max-w-xs group">
              <div className="w-20 h-20 rounded-full bg-gray-900 border-2 border-teal-500 flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(20,184,166,0.3)] group-hover:shadow-[0_0_30px_rgba(20,184,166,0.6)] transition-all duration-500 mb-6 relative z-10">
                🌍
              </div>
              <h3 className="text-xl font-bold text-white mb-2">1. Choose a Destination</h3>
              <p className="text-gray-400 text-sm">Tell us where you want to go and your budget restrictions.</p>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center text-center relative max-w-xs group mt-8 md:mt-0">
              <div className="w-20 h-20 rounded-full bg-gray-900 border-2 border-blue-500 flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(59,130,246,0.3)] group-hover:shadow-[0_0_30px_rgba(59,130,246,0.6)] transition-all duration-500 mb-6 relative z-10">
                ✨
              </div>
              <h3 className="text-xl font-bold text-white mb-2">2. Let AI Plan It</h3>
              <p className="text-gray-400 text-sm">Our AI engine automatically constructs a balanced day-by-day itinerary.</p>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center text-center relative max-w-xs group mt-8 md:mt-0">
              <div className="w-20 h-20 rounded-full bg-gray-900 border-2 border-purple-500 flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(168,85,247,0.3)] group-hover:shadow-[0_0_30px_rgba(168,85,247,0.6)] transition-all duration-500 mb-6 relative z-10">
                ✈️
              </div>
              <h3 className="text-xl font-bold text-white mb-2">3. Travel & Enjoy</h3>
              <p className="text-gray-400 text-sm">Mark locations as visited and track your real expenses on the go.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. CTA SECTION */}
      <section className="relative z-20 w-full py-32 px-6 lg:px-20 overflow-hidden">
        {/* Animated Background Gradients */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-gray-900 to-blue-900 z-0"></div>
        <div className="absolute -top-[50%] -left-[50%] w-[200%] h-[200%] bg-gradient-to-tr from-transparent via-blue-600/10 to-transparent animate-[spin_15s_linear_infinite] z-0 pointer-events-none blur-3xl"></div>

        <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center text-center">
          <h2 className="text-4xl md:text-6xl font-extrabold text-white mb-6">
            Ready to Explore the World?
          </h2>
          <p className="text-xl text-blue-200 mb-10 max-w-2xl">
            Join thousands of travelers who are optimizing their adventures with Pocket Yatra.
          </p>
          <a
            href="/login"
            className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white transition-all duration-200 bg-blue-600 font-sans rounded-full overflow-hidden hover:scale-105"
          >
            <span className="absolute inset-0 w-full h-full -mt-1 rounded-lg opacity-30 bg-gradient-to-b from-transparent via-transparent to-black"></span>
            <span className="relative flex items-center gap-2">
              Start Planning Now
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path></svg>
            </span>
          </a>
        </div>
      </section>
    </div>
  );
};
