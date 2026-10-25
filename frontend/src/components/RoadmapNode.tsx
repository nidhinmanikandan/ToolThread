import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { RoadmapNodeType } from "@/types/roadmap";

import "./RoadmapNode.css";

export default function RoadmapNode({ data }: NodeProps<RoadmapNodeType>) {
  const kind = data.kind ?? "learning";
  const isEndpoint = kind !== "learning";

  return (
    <div className={`node-wrapper${isEndpoint ? " node-wrapper--endpoint" : ""}`}>
      <div
        className={`roadmap-node${isEndpoint ? " roadmap-node--endpoint" : ""}${
          kind === "start" ? " roadmap-node--start" : ""
        }`}
      >
        {kind !== "start" && <Handle type="target" position={Position.Left} className="handle" />}

        {kind === "start" ? (
          <div className="endpoint-content roadmap-start-content">
            <div className="roadmap-start-brand">
              <div className="roadmap-start-logo">
                {data.logoSrc ? (
                  <img src={data.logoSrc} alt={`${data.title} logo`} />
                ) : (
                  <span>{data.title.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <h3>{data.title}</h3>
            </div>
          </div>
        ) : kind === "end" ? (
          <div className="endpoint-content roadmap-end-content">
            <span className="endpoint-eyebrow">ROADMAP COMPLETE</span>
            <h3>{data.title}</h3>
            <p>{data.description}</p>
            {data.ctaUrl ? (
              <a
                className="roadmap-cta nodrag nopan"
                href={data.ctaUrl}
                target="_blank"
                rel="noreferrer"
              >
                {data.ctaLabel}
              </a>
            ) : (
              <span className="roadmap-cta">{data.ctaLabel}</span>
            )}
          </div>
        ) : (
          <>
            <div className="header">
              <div className="header-content">
                <h3>{data.title}</h3>
                <p>
                  {data.description}
                  {data.why}
                </p>
              </div>
            </div>

            <div className="steps">
              {data.steps.map((step, index) => (
                <div className="step" key={index}>
                  <span className={`dot ${index === data.steps.length - 1 ? "green" : "blue"}`} />

                  {step}
                </div>
              ))}
            </div>
          </>
        )}

        {kind !== "end" && <Handle type="source" position={Position.Right} className="handle" />}
      </div>
    </div>
  );
}
