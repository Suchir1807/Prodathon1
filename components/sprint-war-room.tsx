"use client";

import { useEffect, useRef, useState } from "react";
import { Radio, Users } from "lucide-react";
import randomColor from "randomcolor";
import { WebrtcProvider } from "y-webrtc";
import * as Y from "yjs";

type RemotePeer = {
  id: number;
  name: string;
  color: string;
  cursor: { x: number; y: number } | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function SprintWarRoom() {
  const [text, setText] = useState("");
  const [peers, setPeers] = useState<RemotePeer[]>([]);
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [error, setError] = useState("");
  const docRef = useRef<Y.Doc | null>(null);
  const scratchpadRef = useRef<Y.Text | null>(null);

  useEffect(() => {
    const doc = new Y.Doc();
    let provider: WebrtcProvider;

    try {
      provider = new WebrtcProvider("skillin-sprint-room-alpha", doc);
    } catch (setupError) {
      doc.destroy();
      setError(
        setupError instanceof Error
          ? setupError.message
          : "Unable to initialize the live room.",
      );
      return;
    }

    const scratchpad = doc.getText("scratchpad");
    docRef.current = doc;
    scratchpadRef.current = scratchpad;
    const awareness = provider.awareness;
    const clientId = doc.clientID;
    const color = randomColor({ luminosity: "bright" });
    const name = `Operator ${String(clientId).slice(-4)}`;
    let animationFrame: number | null = null;
    let latestPointer: { x: number; y: number } | null = null;

    awareness.setLocalStateField("user", { name, color });
    setText(scratchpad.toString());

    const onTextChange = () => setText(scratchpad.toString());
    const onAwarenessChange = () => {
      const currentPeers: RemotePeer[] = [];

      for (const [peerId, state] of awareness.getStates()) {
        if (peerId === clientId || !isRecord(state.user)) continue;

        const user = state.user;
        if (typeof user.name !== "string" || typeof user.color !== "string") continue;

        const cursorState = isRecord(state.cursor) ? state.cursor : null;
        const cursor =
          cursorState &&
          typeof cursorState.x === "number" &&
          Number.isFinite(cursorState.x) &&
          typeof cursorState.y === "number" &&
          Number.isFinite(cursorState.y)
            ? { x: cursorState.x, y: cursorState.y }
            : null;

        currentPeers.push({
          id: peerId,
          name: user.name,
          color: user.color,
          cursor,
        });
      }

      setPeers(currentPeers);
    };
    const onProviderStatus = ({ status }: { status: string }) => {
      setConnectionStatus(status);
    };
    const onPointerMove = (event: PointerEvent) => {
      latestPointer = { x: event.clientX, y: event.clientY };
      if (animationFrame !== null) return;

      animationFrame = window.requestAnimationFrame(() => {
        if (latestPointer) awareness.setLocalStateField("cursor", latestPointer);
        animationFrame = null;
      });
    };
    const onPointerLeave = (event: PointerEvent) => {
      if (event.relatedTarget !== null) return;
      latestPointer = null;
      awareness.setLocalStateField("cursor", null);
    };

    scratchpad.observe(onTextChange);
    awareness.on("change", onAwarenessChange);
    provider.on("status", onProviderStatus);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerout", onPointerLeave);
    onAwarenessChange();

    return () => {
      scratchpad.unobserve(onTextChange);
      awareness.off("change", onAwarenessChange);
      provider.off("status", onProviderStatus);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerout", onPointerLeave);
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
      docRef.current = null;
      scratchpadRef.current = null;
      provider.destroy();
      doc.destroy();
    };
  }, []);

  function updateScratchpad(nextText: string) {
    const doc = docRef.current;
    const scratchpad = scratchpadRef.current;
    if (!doc || !scratchpad) return;

    const currentText = scratchpad.toString();
    if (currentText === nextText) return;

    let prefixLength = 0;
    while (
      prefixLength < currentText.length &&
      prefixLength < nextText.length &&
      currentText[prefixLength] === nextText[prefixLength]
    ) {
      prefixLength += 1;
    }

    let suffixLength = 0;
    while (
      suffixLength < currentText.length - prefixLength &&
      suffixLength < nextText.length - prefixLength &&
      currentText[currentText.length - 1 - suffixLength] ===
        nextText[nextText.length - 1 - suffixLength]
    ) {
      suffixLength += 1;
    }

    const deleteLength = currentText.length - prefixLength - suffixLength;
    const insertedText = nextText.slice(prefixLength, nextText.length - suffixLength);

    doc.transact(() => {
      if (deleteLength > 0) scratchpad.delete(prefixLength, deleteLength);
      if (insertedText.length > 0) scratchpad.insert(prefixLength, insertedText);
    });
  }

  return (
    <section className="relative mb-7 overflow-hidden rounded-xl border border-emerald-500/20 bg-[#06110f]/80 p-4 shadow-[0_0_42px_rgba(16,185,129,0.07)] backdrop-blur-xl sm:p-5">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(16,185,129,0.09),transparent_42%)]"
      />
      <header className="relative mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-semibold tracking-[0.2em] text-emerald-300 uppercase">
            <Radio className="size-3.5" />
            Sprint War Room / P2P Channel
          </div>
          <h2 className="mt-2 text-base font-semibold tracking-wide text-white">
            Live collaboration feed
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Markdown and cursor telemetry sync directly between connected operators.
          </p>
        </div>
        <div
          className="flex items-center gap-2 rounded-md border border-emerald-400/30 bg-emerald-950/50 px-3 py-2 font-mono text-xs text-emerald-100 shadow-[0_0_22px_rgba(16,185,129,0.14)]"
          aria-live="polite"
          aria-label={`Connected peers: ${peers.length}`}
        >
          <Users className="size-3.5 text-emerald-300" />
          <span>Connected Peers: {peers.length}</span>
        </div>
      </header>

      <div className="relative mb-2 flex items-center justify-between gap-3 font-mono text-[10px] tracking-wide text-slate-500 uppercase">
        <span>Peer channel // skillin-sprint-room-alpha</span>
        <span className="flex items-center gap-1.5">
          <span
            className={`size-1.5 rounded-full ${
              connectionStatus === "connected" ? "bg-emerald-400" : "bg-amber-400"
            }`}
          />
          {connectionStatus === "connected" ? "Signaling online" : connectionStatus}
        </span>
      </div>
      <label className="sr-only" htmlFor="sprint-war-room-scratchpad">
        Live Markdown scratchpad
      </label>
      <textarea
        id="sprint-war-room-scratchpad"
        value={text}
        onChange={(event) => updateScratchpad(event.target.value)}
        spellCheck={false}
        placeholder={"# Sprint brief\n\n## Objective\n\n## Decisions\n\n## Next move"}
        className="relative min-h-52 w-full resize-y rounded-lg border border-emerald-500/30 bg-black/40 p-4 font-mono text-sm leading-relaxed text-emerald-50 outline-none backdrop-blur-xl placeholder:text-emerald-100/25 focus:border-emerald-400/75 focus:ring-1 focus:ring-emerald-400/40 focus:shadow-[0_0_28px_rgba(16,185,129,0.16)]"
      />
      {error ? (
        <p role="alert" className="mt-2 text-xs text-red-300">
          Live room unavailable: {error}
        </p>
      ) : null}

      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[100]">
        {peers.map(
          (peer) =>
            peer.cursor && (
              <div
                key={peer.id}
                className="absolute"
                style={{
                  left: peer.cursor.x,
                  top: peer.cursor.y,
                  color: peer.color,
                }}
              >
                <svg
                  aria-hidden="true"
                  className="size-5 drop-shadow-[0_0_5px_currentColor]"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M5.5 3.5 19 13l-6.1 1.2-3.4 5.4-4-16.1Z" />
                </svg>
                <span className="ml-4 -mt-1 block w-max rounded border border-current/40 bg-black/80 px-1.5 py-0.5 font-mono text-[10px] shadow-[0_0_12px_currentColor]">
                  {peer.name}
                </span>
              </div>
            ),
        )}
      </div>
    </section>
  );
}
