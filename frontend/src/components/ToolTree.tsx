import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Controls,
  MiniMap,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type NodeTypes,
  Position,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";

import RoadmapNode from "./RoadmapNode";

import type { ToolRoadmap, RoadmapItem, RoadmapNodeData } from "@/types/roadmap";

type Props = {
  roadmap: ToolRoadmap["roadmap"];
};

const NODE_WIDTH = 320;
const NODE_HEIGHT = 160;
const HORIZONTAL_GAP = 220;
const VERTICAL_GAP = 180;

const CANVAS_PADDING_X = 80;
const CANVAS_PADDING_Y = 60;

type RoadmapNodeItem = Node<RoadmapNodeData, "roadmap">;

type LayoutedNode = RoadmapNodeItem & {
  position: {
    x: number;
    y: number;
  };
  sourcePosition?: Position;
  targetPosition?: Position;
};

const nodeTypes: NodeTypes = {
  roadmap: RoadmapNode,
};

function computeDepths(roadmap: RoadmapItem[]) {
  const itemMap = new Map(roadmap.map((item) => [item.id, item]));
  const depthCache = new Map<string, number>();
  const visiting = new Set<string>();

  function resolveDepth(id: string): number {
    if (depthCache.has(id)) {
      return depthCache.get(id)!;
    }
    if (visiting.has(id)) {
      return 0;
    }
    visiting.add(id);
    const item = itemMap.get(id);
    if (!item) {
      visiting.delete(id);
      return 0;
    }
    const parents = item.parents ?? [];
    const depth =
      parents.length === 0 ? 0 : Math.max(...parents.map((parentId) => resolveDepth(parentId))) + 1;
    visiting.delete(id);
    depthCache.set(id, depth);
    return depth;
  }

  roadmap.forEach((item) => resolveDepth(item.id));
  return depthCache;
}

function buildLayoutPositions(roadmap: RoadmapItem[]) {
  const depths = computeDepths(roadmap);
  const layers = new Map<number, RoadmapItem[]>();

  roadmap.forEach((item) => {
    const depth = depths.get(item.id) ?? 0;
    const layer = layers.get(depth) ?? [];
    layer.push(item);
    layers.set(depth, layer);
  });

  const maxLayerSize = Math.max(...Array.from(layers.values(), (layer) => layer.length), 1);

  const totalHeight = maxLayerSize * NODE_HEIGHT + (maxLayerSize - 1) * VERTICAL_GAP;

  const positions = new Map<string, { x: number; y: number }>();

  Array.from(layers.entries())
    .sort(([a], [b]) => a - b)
    .forEach(([depth, layer]) => {
      const layerHeight = layer.length * NODE_HEIGHT + (layer.length - 1) * VERTICAL_GAP;

      const startY = (totalHeight - layerHeight) / 2;
      layer.forEach((item, index) => {
        positions.set(item.id, {
          x: CANVAS_PADDING_X + depth * (NODE_WIDTH + HORIZONTAL_GAP),
          y: CANVAS_PADDING_Y + startY + index * (NODE_HEIGHT + VERTICAL_GAP),
        });
      });
    });

  return positions;
}

function getLayoutedNodes(nodes: RoadmapNodeItem[], roadmap: RoadmapItem[]): LayoutedNode[] {
  const positions = buildLayoutPositions(roadmap);

  return nodes.map((node) => ({
    ...node,
    position: positions.get(node.id) ?? { x: 0, y: 0 },
    targetPosition: Position.Left,
    sourcePosition: Position.Right,
  }));
}

export default function ToolTree({ roadmap }: Props) {
  if (!roadmap || roadmap.length === 0) {
    return <div className="flex h-full items-center justify-center">Generating roadmap...</div>;
  }
  const nodes = useMemo<RoadmapNodeItem[]>(() => {
    return roadmap.map((item) => ({
      id: item.id,
      type: "roadmap",
      data: {
        title: item.title,
        description: item.description,
        why: item.why,
        glow: item.glow,
        steps: item.steps ?? [],
      },
      position: { x: 0, y: 0 },
      targetPosition: Position.Left,
      sourcePosition: Position.Right,
    }));
  }, [roadmap]);

  const edges = useMemo<Edge[]>(() => {
    const depths = computeDepths(roadmap);

    return roadmap.flatMap((item) => {
      const parents = item.parents ?? [];
      const targetDepth = depths.get(item.id) ?? 0;

      return parents
        .filter((parentId) => (depths.get(parentId) ?? 0) === targetDepth - 1)
        .map((parentId) => ({
          id: `${parentId}-${item.id}`,
          source: parentId,
          target: item.id,
          type: "smoothstep",
          animated: false,
          style: {
            stroke: "#8A8A8A",
            strokeWidth: 2.5,
            strokeLinecap: "round",
          },
        }));
    });
  }, [roadmap]);

  const [layoutedNodes, setLayoutedNodes] = useState<LayoutedNode[]>([]);
  const [layoutedEdges, setLayoutedEdges] = useState<Edge[]>([]);

  useEffect(() => {
    setLayoutedNodes(getLayoutedNodes(nodes, roadmap));
    setLayoutedEdges(edges);
  }, [nodes, edges, roadmap]);

  const onNodesChange = useCallback((changes: NodeChange<RoadmapNodeItem>[]) => {
    setLayoutedNodes((nds) => applyNodeChanges(changes, nds) as LayoutedNode[]);
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setLayoutedEdges((eds) => applyEdgeChanges(changes, eds));
  }, []);

  const onConnect = useCallback(
    (connection: Connection) => {
      const depths = computeDepths(roadmap);
      const sourceDepth = depths.get(connection.source) ?? 0;
      const targetDepth = depths.get(connection.target) ?? 0;

      if (targetDepth !== sourceDepth + 1) {
        return;
      }

      setLayoutedEdges((eds) => addEdge({ ...connection, type: "smoothstep" }, eds));
    },
    [roadmap],
  );

  return (
    <div className="absolute inset-0 overflow-visible">
      <ReactFlow
        className="absolute inset-0 overflow-visible"
        style={{ width: "100%", height: "100%", overflow: "visible" }}
        nodes={layoutedNodes}
        edges={layoutedEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        defaultViewport={{ x: 0, y: 50, zoom: 0.6 }}
        minZoom={0.5}
        maxZoom={2}
        nodesDraggable
        nodesConnectable
        panOnDrag
        zoomOnScroll
        zoomOnPinch
        zoomOnDoubleClick
        preventScrolling={false}
        panOnScroll={false}
        translateExtent={[
          [-10000, -10000],
          [10000, 10000],
        ]}
        nodeExtent={[
          [-10000, -10000],
          [10000, 10000],
        ]}
      >
        {/* Background grid/dot guides removed */}

        <Controls
          className="roadmap-zoom-controls"
          position="bottom-left"
          showFitView={false}
          showInteractive={false}
          style={{ zIndex: 999, bottom: 100, left: 230 }}
        />

        <MiniMap
          pannable
          zoomable
          position="bottom-left"
          zoomStep={0.8}
          maskColor="rgba(0,0,0,.18)"
          bgColor="#181818"
          style={{ zIndex: 999, pointerEvents: "auto", bottom: 100 }}
        />
      </ReactFlow>
    </div>
  );
}
