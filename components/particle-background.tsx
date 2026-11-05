"use client";

import { useEffect, useMemo, useState } from "react";
import { useReducedMotion } from "framer-motion";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import type { ISourceOptions } from "@tsparticles/engine";

const PARTICLE_OPTIONS: ISourceOptions = {
  background: { color: { value: "transparent" } },
  detectRetina: true,
  fpsLimit: 30,
  fullScreen: { enable: false },
  interactivity: {
    detectsOn: "window",
    events: {
      onHover: { enable: true, mode: "grab" },
      resize: { enable: true, delay: 0 },
    },
    modes: { grab: { distance: 150, links: { opacity: 0.38 } } },
  },
  particles: {
    color: { value: ["#10b981", "#06b6d4"] },
    links: {
      color: "#10b981",
      distance: 135,
      enable: true,
      opacity: 0.18,
      width: 1,
    },
    move: {
      direction: "none",
      enable: true,
      outModes: { default: "out" },
      random: true,
      speed: 0.35,
    },
    number: { density: { enable: true, height: 1100, width: 1100 }, value: 62 },
    opacity: { value: { min: 0.15, max: 0.55 } },
    size: { value: { min: 1, max: 2.5 } },
  },
};

export function ParticleBackground() {
  const shouldReduceMotion = useReducedMotion();
  const [particlesReady, setParticlesReady] = useState(false);
  const options = useMemo<ISourceOptions>(
    () => ({
      ...PARTICLE_OPTIONS,
      particles: {
        ...PARTICLE_OPTIONS.particles,
        move: {
          ...PARTICLE_OPTIONS.particles?.move,
          enable: !shouldReduceMotion,
        },
      },
    }),
    [shouldReduceMotion],
  );

  useEffect(() => {
    let active = true;

    void initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => {
      if (active) setParticlesReady(true);
    });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0">
      {particlesReady ? (
        <Particles
          id="skillin-particle-network"
          className="absolute inset-0"
          options={options}
          style={{ position: "absolute", inset: 0 }}
        />
      ) : null}
    </div>
  );
}
