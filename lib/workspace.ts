import type { GeminiMission } from "@/lib/mission";

export type ActiveMissionWorkspace = GeminiMission & {
  partnerName: string;
  acceptedAt: string;
};

const WORKSPACE_KEY = "cofoundry.workspace";
const WORKSPACE_EVENT = "cofoundry-workspace";

function emit() {
  window.dispatchEvent(new Event(WORKSPACE_EVENT));
}

export function writeActiveWorkspace(workspace: ActiveMissionWorkspace) {
  window.localStorage.setItem(WORKSPACE_KEY, JSON.stringify(workspace));
  emit();
}

export function readActiveWorkspace(): ActiveMissionWorkspace | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(WORKSPACE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveMissionWorkspace;
    if (!parsed?.questTitle || !Array.isArray(parsed.kanbanTasksStudentA)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function subscribeWorkspace(onStoreChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === WORKSPACE_KEY) onStoreChange();
  };
  window.addEventListener(WORKSPACE_EVENT, onStoreChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(WORKSPACE_EVENT, onStoreChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function getWorkspaceSnapshot() {
  return window.localStorage.getItem(WORKSPACE_KEY) ?? "";
}

export function getWorkspaceServerSnapshot() {
  return "";
}
