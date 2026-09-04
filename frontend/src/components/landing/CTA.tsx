import { ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import DotField from "@/components/DotField";

export function CTA() {
  return (
    <section className="landing-cta">
      <div className="landing-cta-dots" aria-hidden="true">
        <DotField
          dotRadius={1}
          dotSpacing={17}
          gradientFrom="rgba(255,255,255,0.22)"
          gradientTo="rgba(255,255,255,0.04)"
          glowColor="#080808"
        />
      </div>
      <div className="landing-cta-content">
        <p className="landing-eyebrow">START WITH CURIOSITY</p>
        <h2>
          Your next technology
          <br />
          starts here.
        </h2>
        <p>Discover what to learn next and build a path that makes sense for you.</p>
        <Link to="/ai-tools" className="landing-button landing-button-primary">
          Start Exploring <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  );
}
