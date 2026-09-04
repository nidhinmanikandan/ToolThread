import { ArrowRight, Search, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function ProductShowcase() {
  return (
    <section className="landing-section landing-showcase" id="workspace">
      <div className="landing-app-window" aria-label="ToolThread workspace preview">
        <div className="landing-window-bar">
          <div className="landing-window-controls">
            <span />
            <span />
            <span />
          </div>
          <span className="landing-window-title">ToolThread / Discover</span>
          <Sparkles size={14} className="landing-window-icon" />
        </div>
        <div className="landing-preview-body">
          <aside className="landing-preview-sidebar">
            <div className="landing-preview-logo">
              <Sparkles size={13} /> ToolThread
            </div>
            <div className="landing-preview-nav active">
              <span className="preview-square" /> Discover Tools
            </div>
            <div className="landing-preview-nav">
              <span className="preview-square" /> My Roadmaps
            </div>
            <div className="landing-preview-nav">
              <span className="preview-square" /> Trends
            </div>
          </aside>
          <div className="landing-preview-content">
            <div className="landing-preview-heading">
              <span>DISCOVER TOOLS</span>
              <h3>Find what fits your work.</h3>
            </div>
            <div className="landing-preview-search">
              <Search size={13} /> Search technologies...
            </div>
            <div className="landing-preview-grid">
              <PreviewCard name="React" type="Frontend" accent="R" />
              <PreviewCard name="OpenAI" type="AI tools" accent="O" />
              <PreviewCard name="Figma" type="Design" accent="F" />
            </div>
          </div>
        </div>
      </div>
      <div className="landing-showcase-copy">
        <p className="landing-eyebrow">THE WORKSPACE</p>
        <h2>
          Explore. Understand.
          <br />
          Build your path.
        </h2>
        <p>
          Discover technologies, see how they connect, and turn your discoveries into a clear
          learning path.
        </p>
        <Link to="/discover" className="landing-text-link">
          Explore the workspace <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  );
}

function PreviewCard({ name, type, accent }: { name: string; type: string; accent: string }) {
  return (
    <div className="landing-preview-card">
      <div className="landing-preview-card-icon">{accent}</div>
      <div>
        <strong>{name}</strong>
        <span>{type}</span>
      </div>
      <ArrowRight size={13} />
    </div>
  );
}
