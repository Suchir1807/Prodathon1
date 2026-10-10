import { formatUsername } from "@/lib/profile";
import type { Partner } from "@/lib/types";

export type PublicUser = {
  id: string;
  username: string;
  displayName: string;
  skillsHave: string[];
  skillsLearn: string[];
  domainInterests: string[];
};

export function publicUserToPartner(user: PublicUser): Partner {
  const name = user.displayName.trim() || formatUsername(user.username);
  return {
    id: user.id,
    name,
    canTeach: user.skillsHave ?? [],
    wantsToLearn: user.skillsLearn ?? [],
    domains: user.domainInterests ?? [],
    role: "CoFoundry member",
    location: "Remote",
    blurb:
      user.domainInterests.length > 0
        ? user.domainInterests.slice(0, 3).join(" · ")
        : "Building with peers on CoFoundry",
  };
}
