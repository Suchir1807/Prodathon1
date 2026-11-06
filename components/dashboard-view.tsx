"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  ArrowRight,
  ArrowUp,
  Check,
  Compass,
  LoaderCircle,
  LocateFixed,
  Network,
  Radio,
  Shield,
  Sparkles,
  Terminal,
  UsersRound,
} from "lucide-react";
import type { ForceGraphMethods, NodeObject } from "react-force-graph-3d";
import * as THREE from "three";

import { useProfile } from "@/components/profile-provider";
import { Button } from "@/components/ui/button";
import { displayName } from "@/lib/profile";

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
  const { data: session } = useSession();
  const { profile, quests } = useProfile();
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
  const userName = displayName(profile, session?.user?.name ?? undefined);
  const activeQuest = quests[0] ?? null;
  const activeQuestDay = activeQuest ? getQuestDayIndex(activeQuest.acceptedAt) : 0;

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
      aria-label="Skillin dashboard"
      className="relative isolate min-h-[calc(100dvh-3.5rem)] overflow-hidden bg-[#020617] text-white"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_55%_30%,rgba(16,185,129,0.12),transparent_44%),linear-gradient(180deg,#07110c_0%,#020617_65%)]"
      />
      <main className="relative z-10 mx-auto max-w-[1480px] px-4 py-6 sm:px-7 sm:py-8 lg:px-10">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[10px] font-semibold tracking-[0.18em] text-emerald-300/75 uppercase">
              <span className="size-1.5 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.7)]" />
              Your builder dashboard
            </p>
            <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Welcome back, <span className="text-emerald-200">{userName}</span>
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
              Find a collaborator who can help turn your next idea into something real.
            </p>
            {(profile.canTeach.length > 0 || profile.wantsToLearn.length > 0) ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {profile.canTeach.slice(0, 3).map((skill) => (
                  <span key={`teach-${skill}`} className="rounded-full border border-emerald-300/20 bg-emerald-300/[0.06] px-2.5 py-1 text-[11px] text-emerald-100/80">
                    Can teach · {skill}
                  </span>
                ))}
                {profile.wantsToLearn.slice(0, 2).map((skill) => (
                  <span key={`learn-${skill}`} className="rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1 text-[11px] text-slate-300">
                    Learning · {skill}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button asChild size="sm" className="h-10 px-4">
              <Link href="/find-partners">
                <UsersRound />
                Find a partner
                <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="h-10 px-4">
              <Link href="/profile">Edit your profile</Link>
            </Button>
          </div>
        </header>

        <section
          aria-label="Bengaluru developer network"
          className="relative mt-7 h-[min(70dvh,760px)] min-h-[560px] overflow-hidden rounded-3xl border border-emerald-500/15 bg-[#020617] shadow-[0_24px_100px_rgba(0,0,0,0.38)]"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-900/25 via-[#020617]/65 to-[#020617]"
          />
          <div
            aria-hidden="true"
            className="tactical-grid-mask pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#10b9810a_1px,transparent_1px),linear-gradient(to_bottom,#10b9810a_1px,transparent_1px)] bg-[size:40px_40px]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 aspect-square w-[min(86vw,76rem)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-emerald-500/10 motion-safe:animate-[spin_60s_linear_infinite]"
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

          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 bg-gradient-to-b from-[#020617]/90 to-transparent px-4 pb-14 pt-4 sm:px-6 sm:pt-5">
            <div>
              <p className="flex items-center gap-2 text-[10px] font-semibold tracking-[0.16em] text-emerald-200/75 uppercase">
                <Network className="size-3.5" />
                Neural Nexus
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                Bengaluru maker network · {DEVELOPERS.nodes.length} simulated profiles
              </p>
            </div>
            <div className="rounded-xl border border-emerald-400/15 bg-slate-950/60 px-3 py-2 text-right backdrop-blur-xl">
              <p className="flex items-center justify-end gap-1.5 text-[10px] text-slate-400">
                <Radio className="size-3 text-emerald-300" />
                Available to build
              </p>
              <p className="mt-0.5 text-sm font-semibold text-emerald-200">
                {availableCount} <span className="font-normal text-slate-500">/ {DEVELOPERS.nodes.length}</span>
              </p>
            </div>
          </div>

          {hoveredNode ? (
            <div className="pointer-events-none absolute bottom-36 left-4 z-10 hidden max-w-[260px] rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 backdrop-blur-xl sm:block sm:left-6">
              <p className="text-xs font-medium text-white">{hoveredNode.name}</p>
              <p className="mt-1 text-[11px] text-slate-400">
                {hoveredNode.skill} <span className="text-slate-600">·</span> {hoveredNode.area}
              </p>
              <p className={hoveredNode.available ? "mt-1 text-[11px] text-emerald-300" : "mt-1 text-[11px] text-slate-500"}>
                {hoveredNode.available ? "Available" : "Busy"}
              </p>
            </div>
          ) : (
            <div className="pointer-events-none absolute bottom-32 left-4 z-10 hidden items-center gap-2 text-[11px] text-slate-500 sm:flex sm:left-6">
              <span className="size-1.5 rounded-full bg-emerald-300" />
              Available
              <span className="ml-1 size-1.5 rounded-full bg-zinc-500" />
              Busy
              <span className="ml-2 text-slate-600">Drag to explore</span>
            </div>
          )}

          <form
            onSubmit={submitCommand}
            className="absolute bottom-4 left-1/2 z-20 w-[calc(100%-1.5rem)] max-w-3xl -translate-x-1/2 sm:bottom-6 sm:w-[calc(100%-3rem)]"
          >
            <div className="relative rounded-2xl border border-emerald-500/20 bg-slate-950/70 shadow-[0_0_32px_rgba(16,185,129,0.08)] backdrop-blur-xl transition-colors duration-300 hover:border-emerald-400/40">
              <div className="flex items-center gap-3 px-3 py-3 sm:gap-4 sm:px-5 sm:py-4">
                <div className="hidden size-9 shrink-0 place-items-center rounded-xl border border-emerald-300/10 bg-emerald-300/[0.06] text-emerald-200 sm:grid">
                  <Sparkles className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <label htmlFor="nexus-command" className="mb-1 flex items-center gap-1.5 text-[11px] text-slate-400">
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
                    className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-600 sm:text-base"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!command.trim() || isLoading}
                  aria-label="Run collaborator search"
                  className="grid size-9 shrink-0 place-items-center rounded-xl border border-signal/80 bg-signal text-signal-foreground transition-all duration-300 hover:border-signal hover:bg-signal/90 disabled:cursor-not-allowed disabled:opacity-40 sm:size-10"
                >
                  {isLoading ? <LoaderCircle className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
                </button>
              </div>
              <div className="flex min-h-8 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-white/5 px-4 py-2 text-[10px] text-slate-500 sm:px-5">
                <span className="flex min-w-0 items-center gap-1.5">
                  <Shield className="size-3 shrink-0 text-emerald-300/70" />
                  {isLoading ? (
                    <span className="text-slate-300">Finding collaborators…</span>
                  ) : commandError ? (
                    <span role="alert" className="truncate text-rose-300">
                      {commandError}
                    </span>
                  ) : commandResult ? (
                    `${commandResult.matches.length} result${commandResult.matches.length === 1 ? "" : "s"} · ${commandResult.searchIntent}`
                  ) : (
                    "Describe the skills or experience you need"
                  )}
                </span>
                <span className="flex shrink-0 items-center gap-1.5">
                  <LocateFixed className="size-3 text-slate-500" />
                  {availableCount} available
                </span>
              </div>
            </div>

            {commandResult ? (
              <div className="mx-auto mt-2 flex w-fit max-w-full flex-wrap justify-center gap-2 rounded-full border border-white/10 bg-slate-950/80 px-3 py-1.5 text-[11px] text-slate-300 backdrop-blur-xl">
                {commandResult.matches.length ? (
                  <>
                    {commandResult.matches.slice(0, 3).map((node) => (
                      <button
                        key={node.id}
                        type="button"
                        onClick={() => selectNode(node)}
                        className="transition-colors duration-300 hover:text-emerald-200"
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
        </section>

        <div className="grid gap-4 py-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(300px,0.7fr)]">
          <section aria-labelledby="current-quest-heading" className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 backdrop-blur-xl sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold tracking-[0.16em] text-emerald-300/70 uppercase">
                  The 3-day build
                </p>
                <h2 id="current-quest-heading" className="mt-2 font-heading text-xl font-semibold text-white">
                  {activeQuest ? activeQuest.quest.title : "Your next build starts with a match"}
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  {activeQuest
                    ? `Building with ${activeQuest.partnerName}`
                    : "Meet someone with complementary skills, then make something together."}
                </p>
              </div>
              {activeQuest ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/20 bg-emerald-300/[0.07] px-2.5 py-1 text-[11px] font-medium text-emerald-200">
                  <span className="size-1.5 animate-pulse rounded-full bg-emerald-300" />
                  Day {activeQuestDay + 1} of 3
                </span>
              ) : (
                <span className="grid size-10 place-items-center rounded-xl border border-signal/20 bg-signal/[0.07] text-signal">
                  <Compass className="size-5" />
                </span>
              )}
            </div>

            {activeQuest ? (
              <>
                <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label="Quest progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(((activeQuestDay + 1) / 3) * 100)}>
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-lime-300 transition-[width] duration-700"
                    style={{ width: `${((activeQuestDay + 1) / 3) * 100}%` }}
                  />
                </div>
                <ol className="mt-4 grid grid-cols-3 gap-3">
                  {(["Plan", "Build", "Showcase"] as const).map((step, index) => {
                    const complete = index < activeQuestDay;
                    const current = index === activeQuestDay;
                    return (
                      <li key={step} className="flex items-center gap-2 text-xs">
                        <span className={`grid size-6 shrink-0 place-items-center rounded-full border ${complete ? "border-emerald-300/40 bg-emerald-300/15 text-emerald-200" : current ? "border-signal/50 bg-signal/10 text-signal" : "border-white/10 text-slate-500"}`}>
                          {complete ? <Check className="size-3" /> : index + 1}
                        </span>
                        <span className={current ? "font-medium text-white" : complete ? "text-emerald-100/70" : "text-slate-500"}>
                          Day {index + 1} · {step}
                        </span>
                      </li>
                    );
                  })}
                </ol>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-4">
                  <p className="max-w-xl text-xs leading-5 text-slate-400">
                    {activeQuest.quest.tagline}
                  </p>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/workspace">
                      Open workspace <ArrowRight />
                    </Link>
                  </Button>
                </div>
              </>
            ) : (
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-4">
                <p className="max-w-xl text-xs leading-5 text-slate-400">
                  Your skill profile helps Skillin surface the right people and a project worth finishing.
                </p>
                <Button asChild size="sm">
                  <Link href="/find-partners">
                    Explore partners <ArrowRight />
                  </Link>
                </Button>
              </div>
            )}
          </section>

          <section aria-labelledby="skill-signal-heading" className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 backdrop-blur-xl sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold tracking-[0.16em] text-emerald-300/70 uppercase">
                  Your signal
                </p>
                <h2 id="skill-signal-heading" className="mt-2 font-heading text-xl font-semibold text-white">
                  Skill profile
                </h2>
              </div>
              <Button asChild size="icon-sm" variant="ghost" aria-label="Edit skill profile">
                <Link href="/profile"><ArrowRight /></Link>
              </Button>
            </div>
            <SkillGroup label="Can teach" skills={profile.canTeach} tone="emerald" />
            <SkillGroup label="Want to learn" skills={profile.wantsToLearn} tone="lime" />
          </section>
        </div>
      </main>
    </section>
  );
}

function SkillGroup({
  label,
  skills,
  tone,
}: {
  label: string;
  skills: string[];
  tone: "emerald" | "lime";
}) {
  const classes =
    tone === "emerald"
      ? "border-emerald-300/20 bg-emerald-300/[0.06] text-emerald-100"
      : "border-signal/20 bg-signal/[0.06] text-lime-100";

  return (
    <div className="mt-4">
      <p className="text-[10px] font-medium tracking-wide text-slate-500 uppercase">{label}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {skills.length ? (
          skills.slice(0, 5).map((skill) => (
            <span key={skill} className={`rounded-full border px-2.5 py-1 text-[11px] ${classes}`}>
              {skill}
            </span>
          ))
        ) : (
          <span className="text-xs text-slate-500">Add skills to improve your matches.</span>
        )}
      </div>
    </div>
  );
}

function getQuestDayIndex(acceptedAt: string) {
  const acceptedTime = Date.parse(acceptedAt);
  if (!Number.isFinite(acceptedTime)) return 0;
  const elapsedDays = Math.floor(Math.max(0, Date.now() - acceptedTime) / 86_400_000);
  return Math.min(2, elapsedDays);
}
