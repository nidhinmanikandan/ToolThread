import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { RoadmapNodeType } from "@/types/roadmap";

import "./RoadmapNode.css";

export default function RoadmapNode({ data }: NodeProps<RoadmapNodeType>) {
  return (
    <div
      className="node-wrapper"
      style={
        {
          "--glow": data.glow || "rgba(86,156,255,.25)",
        } as React.CSSProperties
      }
    >
      <div className="roadmap-node">
        <Handle type="target" position={Position.Left} className="handle" />

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

        <Handle type="source" position={Position.Right} className="handle" />
      </div>
    </div>
  );
}
