const features = [
  {
    number: "01",
    title: "Discover",
    text: "Find technologies, tools, and frameworks that match what you want to build.",
  },
  {
    number: "02",
    title: "Understand",
    text: "See what each technology does and how it connects to the rest of the ecosystem.",
  },
  {
    number: "03",
    title: "Build Your Roadmap",
    text: "Turn your discoveries into a structured learning and development path.",
  },
];

export function Features() {
  return (
    <section className="landing-section landing-features" id="features">
      <div className="landing-section-intro">
        <p className="landing-eyebrow">A CLEARER WAY FORWARD</p>
        <h2>
          Less noise.
          <br />
          More direction.
        </h2>
      </div>
      <div className="landing-feature-grid">
        {features.map((feature) => (
          <article className="landing-feature-card" key={feature.number}>
            <span className="landing-feature-number">{feature.number}</span>
            <div>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
