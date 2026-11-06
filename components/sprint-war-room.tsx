"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, Users } from "lucide-react";
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
  const [editorFocused, setEditorFocused] = useState(false);
  const docRef = useRef<Y.Doc | null>(null);
  const scratchpadRef = useRef<Y.Text | null>(null);

  useEffect(() => {
    const doc = new Y.Doc();
    let disposed = false;
    let cleanupSession: (() => void) | null = null;

    void Promise.resolve().then(() => {
      if (disposed) return;

      let provider: WebrtcProvider;
      try {
        provider = new WebrtcProvider("skillin-sprint-room-alpha", doc);
      } catch (setupError) {
        setConnectionStatus("unavailable");
        setError(
          setupError instanceof Error
            ? setupError.message
            : "Unable to initialize the live room.",
        );
        cleanupSession = () => doc.destroy();
        return;
      }

      const scratchpad = doc.getText("scratchpad");
      const awareness = provider.awareness;
      const clientId = doc.clientID;
      const color = randomColor({ luminosity: "bright" });
      const name = `Operator ${String(clientId).slice(-4)}`;
      let animationFrame: number | null = null;
      let latestPointer: { x: number; y: number } | null = null;

      docRef.current = doc;
      scratchpadRef.current = scratchpad;
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
      const onProviderStatus = ({ connected }: { connected: boolean }) => {
        setConnectionStatus(connected ? "connected" : "disconnected");
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

      cleanupSession = () => {
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
    });

    return () => {
      disposed = true;
      if (cleanupSession) {
        cleanupSession();
      } else {
        doc.destroy();
      }
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
    <>
      <section className="relative mb-7 rounded-xl border border-white/5 bg-black/40 p-4 shadow-[0_0_15px_rgba(255,255,255,0.03)] backdrop-blur-2xl transition-colors duration-300 hover:border-white/10 sm:p-5">
        <header className="mb-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
              <FileText className="size-3.5 text-zinc-500" />
              Shared workspace
            </div>
            <h2 className="mt-2 text-base font-semibold text-white">Live scratchpad</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Notes and cursor presence update in real time.
            </p>
          </div>
          <div
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-300"
            aria-live="polite"
            aria-label={`Connected peers: ${peers.length}`}
          >
            <Users className="size-3.5 text-zinc-500" />
            <span>{peers.length} connected</span>
          </div>
        </header>

        <div className="mb-2 flex items-center justify-between gap-3 text-[11px] text-zinc-500">
          <span>Live Markdown</span>
          <span className="flex items-center gap-1.5">
            <span
              className={`size-1.5 rounded-full ${
                connectionStatus === "connected" ? "bg-emerald-400" : "bg-zinc-600"
              }`}
            />
            {connectionStatus === "connected" ? "Connected" : connectionStatus}
          </span>
        </div>
        <label className="sr-only" htmlFor="sprint-war-room-scratchpad">
          Live Markdown scratchpad
        </label>
        <div className="relative pt-px">
          <div
            aria-hidden="true"
            className={`absolute inset-x-0 top-0 z-10 h-px transition-all duration-300 ${
              editorFocused
                ? "bg-gradient-to-r from-transparent via-emerald-400/80 to-transparent shadow-[0_0_12px_rgba(52,211,153,0.4)]"
                : "bg-white/5"
            }`}
          />
          <textarea
            id="sprint-war-room-scratchpad"
            value={text}
            onChange={(event) => updateScratchpad(event.target.value)}
            onFocus={() => setEditorFocused(true)}
            onBlur={() => setEditorFocused(false)}
            spellCheck={false}
            placeholder={"# Sprint brief\n\n## Objective\n\n## Decisions\n\n## Next move"}
            className="scrollbar-hide min-h-52 w-full resize-y border-0 bg-transparent p-4 font-mono text-sm leading-relaxed text-zinc-100 outline-none placeholder:text-zinc-600 focus:ring-0"
          />
        </div>
        {error ? (
          <p role="alert" className="mt-2 text-xs text-red-300">
            Live room unavailable: {error}
          </p>
        ) : null}
      </section>

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
                  className="size-4 opacity-80"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M5.5 3.5 19 13l-6.1 1.2-3.4 5.4-4-16.1Z" />
                </svg>
                <span className="ml-3 -mt-1 block w-max rounded border border-white/10 bg-zinc-950/90 px-1.5 py-0.5 font-mono text-[10px] text-zinc-200">
                  {peer.name}
                </span>
              </div>
            ),
        )}
      </div>
    </>
  );
}
