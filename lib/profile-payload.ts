import type { Profile } from "@/lib/types";

/** Body fields that match `models/User.ts` exactly. */
export function buildProfileSavePayload(draft: Profile) {
  return {
    displayName: draft.name.trim(),
    skillsHave: [...draft.canTeach],
    skillsLearn: [...draft.wantsToLearn],
    domainInterests: [...draft.domains],
  };
}

export type ProfileLiveState = {
  displayName: string;
  skillsHave: string[];
  skillsLearn: string[];
  domainInterests: string[];
};

export function liveStateFromDraft(draft: Profile): ProfileLiveState {
  return {
    displayName: draft.name,
    skillsHave: draft.canTeach,
    skillsLearn: draft.wantsToLearn,
    domainInterests: draft.domains,
  };
}
