import { ArrowUpRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import logo from "../../images/268a27df-230d-4153-b6fe-7504edfa1dc7.png";

export function LandingNavbar() {
  return (
    <header className="landing-nav">
      <Link to="/" className="landing-brand" aria-label="ToolThread home">
        <span className="landing-brand-mark">
          <img src={logo} alt="ToolThread logo" />
        </span>

        <span className="toolthread-name">ToolThread</span>
      </Link>

      {/* <nav className="landing-nav-links" aria-label="Main navigation">
        <Link to="/discover">Discover</Link>
        <Link to="/roadmap">Roadmaps</Link>
        <Link to="/ai-tools">AI Tools</Link>
      </nav> */}

      <div className="landing-nav-actions">
        <Link to="/onboarding" className="landing-login">
          Log in
        </Link>
        <Link to="/onboarding" className="landing-nav-cta">
          Get Started <ArrowUpRight size={14} />
        </Link>
      </div>
    </header>
  );
}
