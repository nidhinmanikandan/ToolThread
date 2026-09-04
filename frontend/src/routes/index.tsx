import { createFileRoute } from "@tanstack/react-router";
import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { Hero } from "@/components/landing/Hero";
import { ProductShowcase } from "@/components/landing/ProductShowcase";
import { Features } from "@/components/landing/Features";
import { CTA } from "@/components/landing/CTA";
import "@/components/landing/landing.css";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ToolThread | Find your next technology" },
      {
        name: "description",
        content:
          "Discover technologies, understand how they connect, and build a roadmap that fits your path.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="landing-page">
      <LandingNavbar />
      <main>
        <Hero />
        <ProductShowcase />
        <Features />
        <CTA />
      </main>
      <footer className="landing-footer">
        <div className="landing-footer-links" aria-label="Footer navigation">
          <a href="#about">About</a>
          <a href="#workspace">Product</a>
          <a href="#team">Team</a>
          <a href="mailto:hello@toolthread.com">Contact</a>
        </div>
        <div className="landing-footer-brand" aria-label="ToolThread">
          TOOLTHREAD
        </div>
      </footer>
    </div>
  );
}
