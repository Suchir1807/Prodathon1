"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import {
  Activity,
  ArrowUp,
  LoaderCircle,
  LocateFixed,
  Network,
  Radio,
  Shield,
  Sparkles,
  Terminal,
  Zap,
} from "lucide-react";
import type { ForceGraphMethods, NodeObject } from "react-force-graph-3d";
import * as THREE from "three";

const ForceGraph3D = dynamic(() => import("react-force-graph-3d"), {
  ssr: false,
});

type DeveloperNode = {
  id: string;
  name: string;
  skill: string;
  area: string;
  available: boolean;
  x: number;
  y: number;
  z: number;
};

type DeveloperLink = {
  source: string;
  target: string;
  value: number;
};

type DeveloperGraph = {
  nodes: DeveloperNode[];
  links: DeveloperLink[];
};

type MatchmakerResponse = {
  skills: string[];
  requireGreenGrid: boolean;
  searchIntent: string;
};

const DEVELOPER_NAMES = [
  "Aarav Mehta", "Ananya Rao", "Ishaan Kapoor", "Diya Nair", "Vihaan Shah",
  "Mira Iyer", "Arjun Menon", "Tara Kulkarni", "Reyansh Das", "Nisha Reddy",
  "Kabir Sethi", "Sana Thomas", "Advik Joshi", "Myra Pillai", "Rohan Bhat",
  "Kiara Dutta", "Dev Malhotra", "Aditi Krishnan", "Neil Fernandes", "Ira Chawla",
  "Kian Bose", "Zoya Shetty", "Aryan Khanna", "Rhea Mukherjee", "Veer Anand",
  "Meera Subramaniam", "Samar Gill", "Navya Srinivasan", "Ayaan Roy", "Leela Varma",
  "Dhruv Sinha", "Avni Desai", "Ritvik Jain", "Sia Mathew", "Om Prakash",
  "Tanishka Rao", "Yash Bansal", "Saanvi Ghosh", "Parth Ahuja", "Esha Nambiar",
  "Kartik Rao", "Amaira Sen", "Nikhil Pai", "Mahi Chopra", "Siddharth Rao",
  "Ishita Paul", "Rudra Naik", "Aarohi Das", "Kush Agarwal", "Veda Krish",
];

const DEVELOPER_SKILLS = [
  "Next.js", "React", "TypeScript", "Node.js", "Python",
  "Three.js", "AI / ML", "Rust", "Product Design", "WebGL",
];

const BENGALURU_AREAS = [
  "Indiranagar", "Koramangala", "HSR Layout", "Whitefield", "Jayanagar",
  "Malleshwaram", "MG Road", "Bellandur", "Electronic City", "Hebbal",
];

const COMMAND_PLACEHOLDER = "Find a developer by skill, location, or experience";

const DEVELOPERS: DeveloperGraph = (() => {
  const nodes = DEVELOPER_NAMES.map((name, index) => {
    const angle = index * 2.399963;
    const radius = 48 + ((index * 17) % 46);
    const height = ((index * 29) % 54) - 27;

    return {
      id: `BLR-${String(index + 1).padStart(3, "0")}`,
      name,
      skill: DEVELOPER_SKILLS[index % DEVELOPER_SKILLS.length],
      area: BENGALURU_AREAS[index % BENGALURU_AREAS.length],
      available: index < 35,
      x: Math.cos(angle) * radius,
      y: height,
      z: Math.sin(angle) * radius,
    };
  });

  const links: DeveloperLink[] = [];
  const connectedPairs = new Set<string>();

  nodes.forEach((node, index) => {
    const connectionCount = 2 + Math.floor(Math.random() * 2);
    const targets = new Set<number>();

    while (targets.size < connectionCount) {
      const targetIndex = Math.floor(Math.random() * nodes.length);
      if (targetIndex === index) continue;

      const pairKey = [index, targetIndex].sort((a, b) => a - b).join(":");
      if (connectedPairs.has(pairKey)) continue;

      connectedPairs.add(pairKey);
      targets.add(targetIndex);
    }

    targets.forEach((targetIndex) => {
      links.push({ source: node.id, target: nodes[targetIndex].id, value: 1 });
    });
  });

  return { nodes, links };
})();

export function DashboardView() {
  const shouldReduceMotion = useReducedMotion();
  const graphRef = useRef<ForceGraphMethods | undefined>(undefined);
  const graphContainerRef = useRef<HTMLDivElement>(null);
  const nodeVisualsRef = useRef(
    new Map<
      string,
      {
        node: DeveloperNode;
        coreMaterial: THREE.MeshBasicMaterial;
      }
    >(),
  );
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [command, setCommand] = useState("");
  const [commandResult, setCommandResult] = useState<{
    query: string;
    searchIntent: string;
    matches: DeveloperNode[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [commandError, setCommandError] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<DeveloperNode | null>(null);
  const availableCount = DEVELOPERS.nodes.filter((node) => node.available).length;

  const graphData = useMemo(() => DEVELOPERS, []);
  const matchedNodeIds = useMemo(
    () => new Set(commandResult?.matches.map((node) => node.id) ?? []),
    [commandResult],
  );

  useEffect(() => {
    const element = graphContainerRef.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      setDimensions({
        width: Math.round(entry.contentRect.width),
        height: Math.round(entry.contentRect.height),
      });
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    for (const { node, coreMaterial } of nodeVisualsRef.current.values()) {
      const isMatch = matchedNodeIds.has(node.id);
      const color = node.available ? "#10b981" : "#333333";

      coreMaterial.color.set(color);
      coreMaterial.opacity = commandResult && !isMatch ? 0.65 : 1;
      coreMaterial.transparent = true;
    }
  }, [commandResult, matchedNodeIds]);

  useEffect(() => {
    if (!commandResult?.matches.length) return;

    const center = commandResult.matches.reduce(
      (point, node) => ({
        x: point.x + node.x / commandResult.matches.length,
        y: point.y + node.y / commandResult.matches.length,
        z: point.z + node.z / commandResult.matches.length,
      }),
      { x: 0, y: 0, z: 0 },
    );
    graphRef.current?.cameraPosition(
      { x: center.x, y: center.y, z: center.z + 180 },
      center,
      1600,
    );

    const controls = graphRef.current?.controls();
    if (controls && "autoRotate" in controls && "autoRotateSpeed" in controls) {
      controls.autoRotate = !shouldReduceMotion;
      controls.autoRotateSpeed = 0.16;
    }
  }, [commandResult, shouldReduceMotion]);

  const createNodeObject = useCallback((graphNode: NodeObject) => {
    const node = graphNode as DeveloperNode;
    const group = new THREE.Group();
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(node.available ? 3.2 : 2.6, 14, 14),
      new THREE.MeshBasicMaterial({
        color: node.available ? 0x10b981 : 0x333333,
        transparent: true,
        opacity: 1,
      }),
    );
    group.add(core);

    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(node.available ? 5.2 : 4.2, 14, 14),
      new THREE.MeshBasicMaterial({
        color: node.available ? 0x10b981 : 0x333333,
        transparent: true,
        opacity: node.available ? 0.14 : 0.08,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    group.add(glow);

    nodeVisualsRef.current.set(node.id, {
      node,
      coreMaterial: core.material,
    });
    return group;
  }, []);

  const enableAutoRotation = useCallback(() => {
    const controls = graphRef.current?.controls();
    if (!controls || !("autoRotate" in controls) || !("autoRotateSpeed" in controls)) return;
    controls.autoRotate = !shouldReduceMotion;
    controls.autoRotateSpeed = 0.22;
  }, [shouldReduceMotion]);

  const selectNode = useCallback((node: DeveloperNode) => {
    setHoveredNode(node);
    const { x = 0, y = 0, z = 0 } = node;
    graphRef.current?.cameraPosition(
      { x: x * 1.8, y: y * 1.8, z: z * 1.8 },
      { x, y, z },
      900,
    );
  }, []);

  async function submitCommand(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = command.trim();
    if (!query || isLoading) return;

    setIsLoading(true);
    setCommandError(null);
    setCommandResult(null);
    try {
      const response = await fetch("/api/ai/matchmaker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        const message =
          payload &&
          typeof payload === "object" &&
          "error" in payload &&
          typeof payload.error === "string"
            ? payload.error
            : "AI matching failed. Please try again.";
        throw new Error(message);
      }

      if (
        !payload ||
        typeof payload !== "object" ||
        !("skills" in payload) ||
        !Array.isArray(payload.skills) ||
        !payload.skills.every((skill) => typeof skill === "string") ||
        !("requireGreenGrid" in payload) ||
        typeof payload.requireGreenGrid !== "boolean" ||
        !("searchIntent" in payload) ||
        typeof payload.searchIntent !== "string"
      ) {
        throw new Error("AI matching returned an unexpected response format.");
      }

      const result = payload as MatchmakerResponse;
      const normalizedSkills = result.skills.map((skill) =>
        skill.toLowerCase().replace(/[^a-z0-9]/g, ""),
      );
      const matches = DEVELOPERS.nodes.filter((node) => {
        const normalizedNodeSkill = node.skill.toLowerCase().replace(/[^a-z0-9]/g, "");
        const matchesSkill =
          normalizedSkills.length === 0 ||
          normalizedSkills.some(
            (skill) => normalizedNodeSkill.includes(skill) || skill.includes(normalizedNodeSkill),
          );
        return matchesSkill && (!result.requireGreenGrid || node.available);
      });

      setCommandResult({ query, searchIntent: result.searchIntent, matches });
      setCommand("");
    } catch (error) {
      setCommandError(
        error instanceof Error ? error.message : "AI matching failed. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section
      aria-label="Neural Nexus developer network"
      className="relative isolate h-[calc(100dvh-3.5rem)] min-h-[520px] overflow-hidden bg-[#020617] text-white"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-900/20 via-[#020617]/80 to-[#020617]"
      />
      <div
        aria-hidden="true"
        className="tactical-grid-mask pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#10b9810a_1px,transparent_1px),linear-gradient(to_bottom,#10b9810a_1px,transparent_1px)] bg-[size:40px_40px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 aspect-square w-[min(86vw,76rem)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-emerald-500/10 animate-[spin_60s_linear_infinite]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 aspect-square w-[min(66vw,58rem)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-500/10"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 aspect-square w-[min(44vw,38rem)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-500/10"
      />
      <div
        ref={graphContainerRef}
        className="absolute inset-0"
        aria-label="Interactive three-dimensional graph of 50 simulated Bengaluru developers"
      >
        {dimensions.width > 0 && dimensions.height > 0 ? (
          <ForceGraph3D
            ref={graphRef}
            graphData={graphData}
            width={dimensions.width}
            height={dimensions.height}
            backgroundColor="rgba(2, 6, 23, 0)"
            showNavInfo={false}
            nodeRelSize={4}
            nodeThreeObject={createNodeObject}
            nodeThreeObjectExtend={false}
            nodeLabel={(node) =>
              `<div style="padding:8px 10px;background:rgba(9,9,11,.96);border:1px solid rgba(255,255,255,.1);border-radius:8px;color:#fafafa;font:12px ui-sans-serif,system-ui,sans-serif"><strong>${node.name}</strong><br/><span style="color:#a1a1aa">${node.skill} · ${node.area}</span><br/><span style="color:${node.available ? "#6ee7b7" : "#a1a1aa"}">${node.available ? "Available" : "Busy"}</span></div>`
            }
            nodeColor={(node) => (node.available ? "#10b981" : "#333333")}
            linkColor={() => "rgba(255, 255, 255, 0.15)"}
            linkOpacity={0.35}
            linkWidth={1}
            cooldownTicks={120}
            warmupTicks={50}
            onEngineStop={enableAutoRotation}
            onNodeHover={(node) => setHoveredNode(node as DeveloperNode | null)}
            onNodeClick={(node) => selectNode(node as DeveloperNode)}
            enableNodeDrag
            enableNavigationControls
          />
        ) : null}
      </div>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_48%,rgba(2,6,23,0.38)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#020617]/75 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#020617]/90 via-[#020617]/45 to-transparent" />

      <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-4 px-4 pt-4 sm:px-7 sm:pt-6">
        <MetricReadout
          icon={<Radio className="size-3.5" />}
          label="Active beacons"
          value="04"
          detail="Local uplinks"
        />

        <div className="absolute left-1/2 top-5 hidden -translate-x-1/2 text-center sm:block">
          <div className="flex items-center justify-center gap-2 text-xs font-medium tracking-wide text-zinc-200">
            <Network className="size-3.5 text-zinc-400" />
            Neural Nexus
          </div>
          <p className="mt-1.5 text-[11px] text-zinc-500">
            Bengaluru developer mesh · {DEVELOPERS.nodes.length} nodes
          </p>
        </div>

        <div className="ml-auto flex flex-col items-end gap-2">
          <MetricReadout
            icon={<Zap className="size-3.5" />}
            label="Network carbon offset"
            value="1.2 kg"
            detail="Today · estimated"
            align="right"
          />
          <MetricReadout
            icon={<Activity className="size-3.5" />}
            label="Bengaluru grid"
            value="Optimal"
            detail={`${availableCount} developers available`}
            align="right"
          />
        </div>
      </header>

      <div className="pointer-events-none absolute bottom-32 left-4 z-10 hidden sm:block sm:left-7">
        {hoveredNode ? (
          <div className="max-w-[260px] rounded-lg border border-white/5 bg-black/40 px-3 py-2 backdrop-blur-2xl">
            <p className="text-xs font-medium text-white">{hoveredNode.name}</p>
            <p className="mt-1 text-[11px] text-zinc-400">
              {hoveredNode.skill} <span className="text-zinc-600">·</span> {hoveredNode.area}
            </p>
            <p className={hoveredNode.available ? "mt-1 text-[11px] text-emerald-300" : "mt-1 text-[11px] text-zinc-500"}>
              {hoveredNode.available ? "Available" : "Busy"}
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-[11px] text-zinc-500">
            Drag to orbit <span className="text-zinc-700">·</span> Select a node to inspect
          </div>
        )}
      </div>

      <form
        onSubmit={submitCommand}
        className="absolute bottom-5 left-1/2 z-20 w-[calc(100%-2rem)] max-w-4xl -translate-x-1/2 sm:bottom-7"
      >
        <div className="relative rounded-2xl border border-emerald-500/20 bg-slate-950/40 shadow-[0_0_24px_rgba(16,185,129,0.06)] backdrop-blur-xl transition-all duration-300 hover:border-emerald-400/40">
          <div className="flex items-center gap-3 px-3 py-3 sm:gap-4 sm:px-5 sm:py-4">
            <div className="hidden size-9 shrink-0 place-items-center rounded-lg border border-white/5 bg-white/[0.03] text-zinc-300 sm:grid">
              <Sparkles className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <label htmlFor="nexus-command" className="mb-1 flex items-center gap-1.5 text-[11px] text-zinc-500">
                <Terminal className="size-3" />
                Ask for a collaborator
              </label>
              <input
                id="nexus-command"
                value={command}
                onChange={(event) => setCommand(event.target.value)}
                placeholder={COMMAND_PLACEHOLDER}
                autoComplete="off"
                disabled={isLoading}
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-600 sm:text-base"
              />
            </div>
            <button
              type="submit"
              disabled={!command.trim() || isLoading}
              aria-label="Run command"
              className="grid size-9 shrink-0 place-items-center rounded-lg border border-white/10 bg-zinc-100 text-zinc-900 transition-all duration-300 hover:border-white/20 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 sm:size-10"
            >
              {isLoading ? <LoaderCircle className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
            </button>
          </div>
          <div className="flex min-h-8 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-white/5 px-4 py-2 text-[10px] text-zinc-500 sm:px-5">
            <span className="flex items-center gap-1.5">
              <Shield className="size-3 text-zinc-500" />
              {isLoading ? (
                <span className="text-zinc-300">Finding collaborators…</span>
              ) : commandError ? (
                <span role="alert" className="text-rose-300">
                  {commandError}
                </span>
              ) : commandResult ? (
                `${commandResult.matches.length} result${commandResult.matches.length === 1 ? "" : "s"} · ${commandResult.searchIntent}`
              ) : (
                "Describe the skills or experience you need"
              )}
            </span>
            <span className="flex items-center gap-1.5">
              <LocateFixed className="size-3 text-zinc-500" />
              {availableCount} of 50 available
            </span>
          </div>
        </div>

        {commandResult ? (
          <div className="mx-auto mt-2 flex w-fit max-w-full flex-wrap justify-center gap-2 rounded-full border border-white/5 bg-black/60 px-3 py-1.5 text-[11px] text-zinc-300 backdrop-blur-2xl">
            {commandResult.matches.length ? (
              <>
                {commandResult.matches.slice(0, 3).map((node) => (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => selectNode(node)}
                    className="transition-colors duration-300 hover:text-white"
                  >
                    {node.name} <span className="text-slate-600">·</span> {node.skill}
                  </button>
                ))}
                {commandResult.matches.length > 3 ? (
                  <span className="text-slate-500">+{commandResult.matches.length - 3} more</span>
                ) : null}
              </>
            ) : (
              <span>No developers matched this search.</span>
            )}
          </div>
        ) : null}
      </form>

      <div className="pointer-events-none absolute bottom-32 right-4 z-10 hidden items-center gap-3 text-[11px] text-zinc-500 sm:flex sm:right-7">
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-emerald-300" />
          Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-zinc-500" />
          Busy
        </span>
        <span className="text-slate-700">·</span>
        <span>Drag / zoom to navigate</span>
      </div>
    </section>
  );
}

function MetricReadout({
  icon,
  label,
  value,
  detail,
  align = "left",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  align?: "left" | "right";
}) {
  return (
    <div className={`min-w-[136px] border border-emerald-500/20 bg-slate-950/40 px-3 py-2 text-zinc-400 backdrop-blur-xl sm:min-w-[172px] sm:px-4 ${align === "right" ? "border-r text-right" : ""}`}>
      <p className={`flex items-center gap-1.5 text-[10px] text-zinc-500 ${align === "right" ? "justify-end" : ""}`}>
        {align === "left" ? icon : null}
        {label}
        {align === "right" ? icon : null}
      </p>
      <p className="mt-1 text-sm font-medium text-zinc-100 sm:text-base">
        {value}
      </p>
      <p className="mt-0.5 text-[10px] text-zinc-500">{detail}</p>
    </div>
  );
}
