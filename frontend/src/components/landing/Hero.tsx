import { ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import DotField from "@/components/DotField";

export function Hero() {
  return (
    <section className="landing-hero">
      <div className="landing-hero-dots" aria-hidden="true">
        <DotField
          dotRadius={1}
          dotSpacing={16}
          cursorRadius={420}
          bulgeStrength={52}
          gradientFrom="rgba(255,255,255,0.3)"
          gradientTo="rgba(255,255,255,0.08)"
          glowColor="#080808"
        />
      </div>
      <div className="landing-hero-content">
        <p className="landing-eyebrow">YOUR PATH. YOUR TOOLS.</p>
        <h1>
          Discover the tools
          
          that fit your path.
        </h1>
        <p className="landing-hero-copy">
          Explore technologies, understand how they connect, and build a roadmap that fits what you
          want to create.
        </p>
        <div className="landing-actions">
          <Link to="/ai-tools" className="landing-button landing-button-primary">
            Explore Tools <ArrowRight size={16} />
          </Link>
          <Link to="/roadmap" className="landing-button landing-button-secondary">
            View Roadmaps
          </Link>
        </div>
      </div>
      <div className="landing-hero-scroll" aria-hidden="true">
        <span /> Scroll to explore
      </div>
    </section>
  );
}
