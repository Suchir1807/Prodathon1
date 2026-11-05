"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import {
  Activity,
  ArrowUp,
  Crosshair,
  LoaderCircle,
  LocateFixed,
  Radio,
  ScanLine,
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

const PLACEHOLDER = "Initialize Gemini... Type 'Find a Next.js dev on a green grid'...";

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

  const links = nodes.flatMap((node, index) => [
    { source: node.id, target: nodes[(index + 1) % nodes.length].id, value: 1 },
    { source: node.id, target: nodes[(index + 7) % nodes.length].id, value: 1 },
  ]);

  return { nodes, links };
})();

export function DashboardView() {
  const shouldReduceMotion = useReducedMotion();
  const graphRef = useRef<ForceGraphMethods | undefined>(undefined);
  const graphContainerRef = useRef<HTMLDivElement>(null);
  const rotatingRingsRef = useRef<THREE.Object3D[]>([]);
  const nodeVisualsRef = useRef(
    new Map<
      string,
      {
        node: DeveloperNode;
        coreMaterial: THREE.MeshBasicMaterial;
        haloMaterial?: THREE.MeshBasicMaterial;
      }
    >(),
  );
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [placeholder, setPlaceholder] = useState("");
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
    if (shouldReduceMotion) return;

    let frame = 0;
    const rotateRings = () => {
      for (const ring of rotatingRingsRef.current) {
        ring.rotation.z += 0.006;
        ring.rotation.x += 0.0015;
      }
      frame = window.requestAnimationFrame(rotateRings);
    };

    frame = window.requestAnimationFrame(rotateRings);
    return () => {
      window.cancelAnimationFrame(frame);
      rotatingRingsRef.current = [];
    };
  }, [shouldReduceMotion]);

  useEffect(() => {
    for (const { node, coreMaterial, haloMaterial } of nodeVisualsRef.current.values()) {
      const isMatch = matchedNodeIds.has(node.id);
      const color = commandResult
        ? isMatch
          ? "#10b981"
          : "#1f2937"
        : node.available
          ? "#10b981"
          : "#52636a";

      coreMaterial.color.set(color);
      coreMaterial.opacity =
        commandResult && !isMatch ? 0.8 : node.available || isMatch ? 1 : 0.56;
      coreMaterial.transparent = commandResult ? !isMatch : !node.available;
      if (haloMaterial) {
        haloMaterial.opacity =
          commandResult ? (isMatch ? 0.72 : 0.04) : node.available ? 0.62 : 0;
      }
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

  useEffect(() => {
    let character = 0;
    let timeout: number;
    let interval: number;

    const typePlaceholder = () => {
      setPlaceholder(PLACEHOLDER.slice(0, character + 1));
      character += 1;
      if (character < PLACEHOLDER.length) {
        timeout = window.setTimeout(typePlaceholder, 32);
      } else {
        timeout = window.setTimeout(() => {
          setPlaceholder("");
          character = 0;
          interval = window.setTimeout(typePlaceholder, 550);
        }, 1700);
      }
    };

    timeout = window.setTimeout(typePlaceholder, 450);
    return () => {
      window.clearTimeout(timeout);
      window.clearTimeout(interval);
    };
  }, []);

  const createNodeObject = useCallback((graphNode: NodeObject) => {
    const node = graphNode as DeveloperNode;
    const group = new THREE.Group();
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(node.available ? 2.8 : 2.2, 14, 14),
      new THREE.MeshBasicMaterial({
        color: node.available ? 0x10b981 : 0x52636a,
        transparent: !node.available,
        opacity: node.available ? 1 : 0.56,
      }),
    );
    group.add(core);

    let haloMaterial: THREE.MeshBasicMaterial | undefined;
    if (node.available) {
      haloMaterial = new THREE.MeshBasicMaterial({
        color: 0x34f5bd,
        transparent: true,
        opacity: 0.62,
      });
      const halo = new THREE.Mesh(
        new THREE.TorusGeometry(4.2, 0.22, 6, 28),
        haloMaterial,
      );
      halo.rotation.x = Math.PI / 2.5;
      group.add(halo);
      rotatingRingsRef.current.push(halo);
    }

    nodeVisualsRef.current.set(node.id, {
      node,
      coreMaterial: core.material,
      haloMaterial,
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
      className="relative isolate h-[calc(100dvh-3.5rem)] min-h-[520px] overflow-hidden bg-[#030807] text-white"
    >
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
            backgroundColor="#030807"
            showNavInfo={false}
            nodeRelSize={4}
            nodeThreeObject={createNodeObject}
            nodeThreeObjectExtend={false}
            nodeLabel={(node) =>
              `<div style="padding:8px 10px;background:rgba(3,8,7,.94);border:1px solid rgba(16,185,129,.45);border-radius:8px;color:#e5fff4;font:12px ui-monospace,monospace"><strong>${node.name}</strong><br/>${node.skill} · ${node.area}<br/><span style="color:${node.available ? "#34f5bd" : "#849096"}">${node.available ? "AVAILABLE · LOW-CARBON GRID" : "BUSY · HIGH-CARBON GRID"}</span></div>`
            }
            nodeColor={(node) =>
              commandResult
                ? matchedNodeIds.has(node.id as string)
                  ? "#10b981"
                  : "#1f2937"
                : node.available
                  ? "#10b981"
                  : "#52636a"
            }
            linkColor={() => "rgba(16,185,129,0.22)"}
            linkOpacity={0.25}
            linkWidth={0.35}
            linkDirectionalParticles={1}
            linkDirectionalParticleWidth={1.2}
            linkDirectionalParticleSpeed={0.002}
            linkDirectionalParticleColor={() => "#34f5bd"}
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

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_28%,rgba(3,8,7,0.25)_72%,rgba(3,8,7,0.75)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#030807]/90 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#030807]/95 via-[#030807]/55 to-transparent" />

      <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-4 px-4 pt-4 sm:px-7 sm:pt-6">
        <MetricReadout
          icon={<Radio className="size-3.5" />}
          label="Active beacons"
          value="04"
          detail="Local uplinks"
          accent="emerald"
        />

        <div className="absolute left-1/2 top-5 hidden -translate-x-1/2 text-center sm:block">
          <div className="flex items-center justify-center gap-2 text-[10px] font-medium tracking-[0.32em] text-emerald-100/70 uppercase">
            <ScanLine className="size-3.5 text-emerald-400" />
            Neural Nexus
          </div>
          <p className="mt-1.5 font-mono text-[9px] tracking-[0.18em] text-slate-500 uppercase">
            Bengaluru developer mesh · {DEVELOPERS.nodes.length} nodes
          </p>
        </div>

        <div className="ml-auto flex flex-col items-end gap-2">
          <MetricReadout
            icon={<Zap className="size-3.5" />}
            label="Network carbon offset"
            value="1.2 kg"
            detail="Today · estimated"
            accent="cyan"
            align="right"
          />
          <MetricReadout
            icon={<Activity className="size-3.5" />}
            label="Bengaluru grid"
            value="Optimal"
            detail={`${availableCount} developers available`}
            accent="emerald"
            align="right"
          />
        </div>
      </header>

      <div className="pointer-events-none absolute bottom-32 left-4 z-10 hidden sm:block sm:left-7">
        {hoveredNode ? (
          <div className="max-w-[260px] border-l border-emerald-400/50 bg-black/35 py-1 pl-3 font-mono backdrop-blur-md">
            <p className="text-[10px] font-semibold tracking-wider text-white uppercase">{hoveredNode.name}</p>
            <p className="mt-1 text-[9px] text-slate-400">
              {hoveredNode.skill} <span className="text-slate-600">/</span> {hoveredNode.area}
            </p>
            <p className={hoveredNode.available ? "mt-1 text-[9px] text-emerald-300" : "mt-1 text-[9px] text-slate-500"}>
              {hoveredNode.available ? "AVAILABLE · OPTIMAL GRID" : "BUSY · DIMMED"}
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2 font-mono text-[9px] tracking-wider text-slate-500 uppercase">
            <Crosshair className="size-3 text-emerald-400/70" />
            Drag to orbit <span className="text-slate-700">·</span> Select a node to inspect
          </div>
        )}
      </div>

      <form
        onSubmit={submitCommand}
        className="absolute bottom-5 left-1/2 z-20 w-[calc(100%-2rem)] max-w-4xl -translate-x-1/2 sm:bottom-7"
      >
        <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-emerald-400/40 via-cyan-400/30 to-emerald-400/40 opacity-70 blur-sm" />
        <div className="relative rounded-2xl border border-white/10 bg-[#07100f]/85 shadow-[0_0_45px_rgba(16,185,129,0.12),inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur-xl">
          <div className="flex items-center gap-3 px-3 py-3 sm:gap-4 sm:px-5 sm:py-4">
            <div className="hidden size-9 shrink-0 place-items-center rounded-lg border border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-300 sm:grid">
              <Sparkles className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <label htmlFor="nexus-command" className="mb-1 flex items-center gap-1.5 font-mono text-[9px] tracking-[0.16em] text-emerald-300/75 uppercase">
                <Terminal className="size-3" />
                Gemini command interface
                <span className="relative ml-1 flex size-1.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
                </span>
              </label>
              <input
                id="nexus-command"
                value={command}
                onChange={(event) => setCommand(event.target.value)}
                placeholder={placeholder}
                autoComplete="off"
                disabled={isLoading}
                className="w-full bg-transparent font-mono text-xs text-white outline-none placeholder:text-slate-500 sm:text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={!command.trim() || isLoading}
              aria-label="Run command"
              className="grid size-9 shrink-0 place-items-center rounded-lg border border-emerald-300/30 bg-emerald-400 text-[#03100b] shadow-[0_0_18px_rgba(16,185,129,0.2)] transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40 sm:size-10"
            >
              {isLoading ? <LoaderCircle className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
            </button>
          </div>
          <div className="flex min-h-8 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-white/[0.06] px-4 py-2 font-mono text-[9px] text-slate-500 sm:px-5">
            <span className="flex items-center gap-1.5">
              <Shield className="size-3 text-emerald-400/70" />
              {isLoading ? (
                <span className="animate-pulse text-emerald-300 [text-shadow:0_0_10px_rgba(16,185,129,0.8)]">
                  GEMINI IS ANALYZING THE NETWORK...
                </span>
              ) : commandError ? (
                <span role="alert" className="text-rose-300">
                  MATCH FAILED · {commandError}
                </span>
              ) : commandResult ? (
                `AI MATCH · ${commandResult.matches.length} NODE${commandResult.matches.length === 1 ? "" : "S"} · ${commandResult.searchIntent}`
              ) : (
                "NEURAL LINK READY · DEVELOPER GRAPH"
              )}
            </span>
            <span className="flex items-center gap-1.5 tracking-wider uppercase">
              <LocateFixed className="size-3 text-cyan-300/70" />
              BLR mesh <span className="text-slate-700">/</span> {availableCount} of 50 online
            </span>
          </div>
        </div>

        {commandResult ? (
          <div className="mx-auto mt-2 flex w-fit max-w-full flex-wrap justify-center gap-2 rounded-full border border-emerald-400/15 bg-[#07100f]/90 px-3 py-1.5 font-mono text-[9px] text-emerald-100/75 backdrop-blur-xl">
            {commandResult.matches.length ? (
              <>
                {commandResult.matches.slice(0, 3).map((node) => (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => selectNode(node)}
                    className="transition hover:text-emerald-300"
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

      <div className="pointer-events-none absolute bottom-32 right-4 z-10 hidden items-center gap-3 font-mono text-[9px] tracking-wider text-slate-500 uppercase sm:flex sm:right-7">
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,245,189,.8)]" />
          Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-slate-600" />
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
  accent,
  align = "left",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  accent: "emerald" | "cyan";
  align?: "left" | "right";
}) {
  const color =
    accent === "emerald"
      ? "text-emerald-300 border-emerald-400/20"
      : "text-cyan-300 border-cyan-400/20";

  return (
    <div className={`min-w-[136px] border-l bg-black/25 px-3 py-2 backdrop-blur-md sm:min-w-[172px] sm:px-4 ${color} ${align === "right" ? "border-r border-l-0 text-right" : ""}`}>
      <p className={`flex items-center gap-1.5 font-mono text-[8px] tracking-[0.16em] text-slate-500 uppercase sm:text-[9px] ${align === "right" ? "justify-end" : ""}`}>
        {align === "left" ? icon : null}
        {label}
        {align === "right" ? icon : null}
      </p>
      <p className={`mt-1 font-mono text-sm font-medium tracking-wide sm:text-base ${accent === "emerald" ? "text-emerald-300" : "text-cyan-200"}`}>
        {value}
      </p>
      <p className="mt-0.5 font-mono text-[8px] text-slate-500 sm:text-[9px]">{detail}</p>
    </div>
  );
}
