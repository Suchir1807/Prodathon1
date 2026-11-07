import type { Profile } from "@/lib/types";

export const STARTER_PROFILE: Profile = {
  name: "",
  canTeach: ["Cooking", "English", "Guitar"],
  wantsToLearn: ["Yoga", "Photography"],
  domains: [],
};

export const EMPTY_PROFILE: Profile = {
  name: "",
  canTeach: [],
  wantsToLearn: [],
  domains: [],
};
