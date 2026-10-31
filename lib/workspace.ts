import type { GeminiMission } from "@/lib/mission";

export type ActiveMissionWorkspace = GeminiMission & {
  partnerName: string;
  acceptedAt: string;
};

const WORKSPACE_KEY = "skillin.workspace";
const WORKSPACE_EVENT = "skillin-workspace";
const LEGACY_WORKSPACE_KEY = "cofoundry.workspace";

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
    const value = window.localStorage.getItem(WORKSPACE_KEY);
    if (value !== null) {
      window.localStorage.removeItem(LEGACY_WORKSPACE_KEY);
    }
    const raw =
      value ?? window.localStorage.getItem(LEGACY_WORKSPACE_KEY);
    if (value === null && raw !== null) {
      window.localStorage.setItem(WORKSPACE_KEY, raw);
      window.localStorage.removeItem(LEGACY_WORKSPACE_KEY);
    }
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
  const value = window.localStorage.getItem(WORKSPACE_KEY);
  if (value !== null) {
    window.localStorage.removeItem(LEGACY_WORKSPACE_KEY);
    return value;
  }

  const legacyValue = window.localStorage.getItem(LEGACY_WORKSPACE_KEY);
  if (legacyValue !== null) {
    window.localStorage.setItem(WORKSPACE_KEY, legacyValue);
    window.localStorage.removeItem(LEGACY_WORKSPACE_KEY);
  }
  return legacyValue ?? "";
}

export function getWorkspaceServerSnapshot() {
  return "";
}
