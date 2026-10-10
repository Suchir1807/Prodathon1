import { sanitizeProfile } from "@/lib/profile";
import type { Profile } from "@/lib/types";
import type { IUser } from "@/models/User";

export function profileFromUser(
  user: Pick<
    IUser,
    "displayName" | "skillsHave" | "skillsLearn" | "domainInterests"
  >,
): Profile {
  return sanitizeProfile({
    name: user.displayName ?? "",
    canTeach: user.skillsHave ?? [],
    wantsToLearn: user.skillsLearn ?? [],
    domains: user.domainInterests ?? [],
  });
}

export function profileToUserFields(profile: Profile) {
  const sanitized = sanitizeProfile(profile);
  return {
    displayName: sanitized.name,
    skillsHave: sanitized.canTeach,
    skillsLearn: sanitized.wantsToLearn,
    domainInterests: sanitized.domains,
  };
}

export type ApiProfilePayload = {
  username: string;
  displayName: string;
  skillsHave: string[];
  skillsLearn: string[];
  domainInterests: string[];
  isProfileComplete: boolean;
};

export function toApiProfile(
  user: IUser & { _id?: { toString(): string } },
): ApiProfilePayload {
  return {
    username: user.username,
    displayName: user.displayName ?? "",
    skillsHave: user.skillsHave ?? [],
    skillsLearn: user.skillsLearn ?? [],
    domainInterests: user.domainInterests ?? [],
    isProfileComplete: Boolean(user.isProfileComplete),
  };
}
