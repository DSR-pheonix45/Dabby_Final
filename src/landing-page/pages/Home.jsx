import { useTheme } from "../../context/ThemeContext";
import { useEffect, useState } from "react";
import Hero from "../components/Hero";
import {
  HowItWorks,
  WhatDabbyUnderstands,
  PrivacySecuritySection,
  ReportingAnalyticsSection,
} from "../components/LandingSections";
import WhyChoose from "../components/WhyChoose";
import Testimonial from "../components/Testimonial";
import FAQ from "../components/FAQ";
import FinalCTA from "../components/FinalCTA";

export default function Home() {
  const { theme } = useTheme();
  const [bgSize, setBgSize] = useState("100% auto");

  useEffect(() => {
    const updateBgSize = () => {
      const width = window.innerWidth;
      if (width < 640) setBgSize("300% auto");
      else if (width < 1024) setBgSize("180% auto");
      else setBgSize("100% auto");
    };
    updateBgSize();
    window.addEventListener("resize", updateBgSize);
    return () => window.removeEventListener("resize", updateBgSize);
  }, []);

  return (
    <div
      className={`min-h-screen relative ${theme === "dark" ? "bg-[#0a0a0a]" : "bg-[#f0f0f0]"}`}
      style={{
        backgroundImage: `url('/${theme === "dark" ? "bg-pattern.png" : "Basic Set (3).png"}')`,
        backgroundSize: bgSize,
        backgroundPosition: "top center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="relative z-10">
        <main>
          {/* 1. Hero Section */}
          <Hero />

          {/* 2. How Dabby Works */}
          <HowItWorks />

          {/* 3. What Dabby Understands */}
          <WhatDabbyUnderstands />

          {/* 4. Why Dabby */}
          <WhyChoose />

          {/* 5. Privacy and Security */}
          <PrivacySecuritySection />

          {/* 6. Reporting and Analytics */}
          <ReportingAnalyticsSection />

          {/* 7. Testimonials */}
          <Testimonial />

          {/* 8. FAQ */}
          <FAQ />

          {/* 9. Final CTA */}
          <FinalCTA />
        </main>
      </div>
    </div>
  );
}


