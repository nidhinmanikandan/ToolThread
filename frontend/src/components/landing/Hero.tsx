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
      <div className="landing-floating-tools" aria-hidden="true">
        <span className="landing-floating-tool" data-tool="chatgpt">
          <svg viewBox="0 0 24 24" fill="none">
            <path
              d="M12 4.2c1.4-1.1 3.5-.8 4.5.7.5.7.7 1.6.5 2.4 1.8.3 3 2 2.7 3.8-.1.8-.6 1.5-1.2 2 1 1.5.6 3.6-.9 4.6-.7.5-1.6.7-2.4.5-.3 1.8-2 3-3.8 2.7-.8-.1-1.5-.6-2-1.2-1.5 1-3.6.6-4.6-.9-.5-.7-.7-1.6-.5-2.4-1.8-.3-3-2-2.7-3.8.1-.8.6-1.5 1.2-2-1-1.5-.6-3.6.9-4.6.7-.5 1.6-.7 2.4-.5.3-1.8 2-3 3.8-2.7.8.1 1.5.6 2 1.2Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path
              d="m8 8.2 8 7.6M16 8.2l-8 7.6M12 4.2v15.6"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <span className="landing-floating-tool" data-tool="figma">
          <svg viewBox="0 0 24 24">
            <path d="M12 12a4 4 0 1 1 4-4h-4v4Z" fill="#f24e1e" />
            <path d="M12 4h4a4 4 0 1 1 0 8h-4V4Z" fill="#ff7262" />
            <path d="M12 12h4a4 4 0 1 1-4 4v-4Z" fill="#1abcfe" />
            <path d="M8 12h4v4a4 4 0 1 1-4-4Z" fill="#0acf83" />
            <path d="M8 4h4v8H8a4 4 0 1 1 0-8Z" fill="#a259ff" />
          </svg>
        </span>
        <span className="landing-floating-tool" data-tool="notion">
          <span className="landing-floating-tool-letter">N</span>
        </span>
        <span className="landing-floating-tool" data-tool="vscode">
          <svg viewBox="0 0 24 24">
            <path
              d="m17.5 3.5 4 1.6v13.8l-4 1.6L7.2 12 4 14.7l-2-1.5v-2.4l2-1.5 3.2 2.7L17.5 3.5ZM16 7.7 9.6 12l6.4 4.3V7.7Z"
              fill="currentColor"
            />
          </svg>
        </span>
        <span className="landing-floating-tool" data-tool="gemini">
          <svg viewBox="0 0 24 24">
            <path
              d="M12 1.8c1.2 5.5 4.7 9 10.2 10.2-5.5 1.2-9 4.7-10.2 10.2C10.8 16.7 7.3 13.2 1.8 12 7.3 10.8 10.8 7.3 12 1.8Z"
              fill="currentColor"
            />
          </svg>
        </span>
        <span className="landing-floating-tool" data-tool="framer">
          <span className="landing-floating-tool-letter">F</span>
        </span>
        <span className="landing-floating-tool" data-tool="photoshop">
          <span className="landing-floating-tool-letter">Ps</span>
        </span>
        <span className="landing-floating-tool" data-tool="cursor">
          <span className="landing-floating-tool-letter">C</span>
        </span>
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
