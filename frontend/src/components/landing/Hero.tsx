import { ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import DotField from "@/components/DotField";

export function Hero() {
  return (
    <section className="landing-hero">
      <div className="landing-hero-dots" aria-hidden="true">
        <DotField
          dotRadius={1.5}
          dotSpacing={15}
          bulgeStrength={67}
          glowRadius={140}
          sparkle
          waveAmplitude={0}
          cursorRadius={500}
          cursorForce={0.1}
          bulgeOnly
          gradientFrom="#ffff"
          gradientTo="#ffff"
          glowColor="#000000"
        />
      </div>
      <div className="landing-hero-content">
        <p className="landing-eyebrow">YOUR PATH. YOUR TOOLS.</p>
        <h1>Discover the tools that fit your path.</h1>
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
