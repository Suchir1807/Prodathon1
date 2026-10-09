import type { MatchInsight, Profile } from "@/lib/types";

function overlap(left: string[], right: string[]) {
  const wanted = new Set(right);
  return left.filter((item) => wanted.has(item));
}

export function matchInsight(viewer: Profile, partner: Profile): MatchInsight {
  const theyTeachYou = overlap(partner.canTeach, viewer.wantsToLearn);
  const youTeachThem = overlap(viewer.canTeach, partner.wantsToLearn);
  const sharedDomains = overlap(viewer.domains, partner.domains);
  const raw =
    theyTeachYou.length * 28 + youTeachThem.length * 22 + sharedDomains.length * 12;
  return {
    score: Math.min(99, raw),
    theyTeachYou,
    youTeachThem,
    sharedDomains,
  };
}
