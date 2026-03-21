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
    // 👇 The key change — make image cover whole screen behind navbar and footer
    <div className="fixed inset-0 w-full h-full overflow-hidden z-0">
      {/* Background Crossfade */}
      <div
        className={`absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat transition-all duration-[2000ms] ease-in-out`}
        style={{
          backgroundImage: `url(${images[currentImageIndex]})`,
          opacity: fade ? 1 : 0,
          transform: fade ? "scale(1.07)" : "scale(1)",
        }}
      />

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70"></div>

      {/* Centered Content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-4">
        <h1 className="text-5xl md:text-7xl font-light text-white mb-6 drop-shadow-[0_4px_10px_rgba(0,0,0,0.6)]">
          {title}
          <span className="animate-pulse">|</span>
        </h1>
        <p className="text-xl md:text-3xl text-slate-200 font-light drop-shadow-[0_4px_10px_rgba(0,0,0,0.6)]">
          {subtitle}
          <span className="animate-pulse">|</span>
        </p>
      </div>
    </div>
  );
};
