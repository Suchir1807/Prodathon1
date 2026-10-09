export type Profile = {
  name: string;
  canTeach: string[];
  wantsToLearn: string[];
  domains: string[];
};

export type Partner = Profile & {
  id: string;
  role: string;
  location: string;
  blurb: string;
};

export type QuestSide = {
  name: string;
  focus: string;
  tasks: string[];
};

export type Quest = {
  title: string;
  tagline: string;
  difficulty: "Easy" | "Medium" | "Hard";
  timeline: string;
  summary: string;
  stack: string[];
  studentA: QuestSide;
  studentB: QuestSide;
  successCriteria: string[];
};

export type QuestSource = "gemini" | "sample";

export type QuestResponse = {
  source: QuestSource;
  mission: {
    questTitle: string;
    kanbanTasksStudentA: string[];
    kanbanTasksStudentB: string[];
    apiContractHint: string;
    plannedCurveball: string;
  };
  quest: Quest;
  notice?: string;
};

export type AcceptedQuest = {
  id: string;
  acceptedAt: string;
  partnerId: string;
  partnerName: string;
  quest: Quest;
};

export type MatchInsight = {
  score: number;
  theyTeachYou: string[];
  youTeachThem: string[];
  sharedDomains: string[];
};

export type ChatKind = "dm" | "quest";

export type ChatMessage = {
  id: string;
  senderId: string;
  senderName: string;
  body: string;
  timeLabel: string;
};

export type Conversation = {
  id: string;
  kind: ChatKind;
  title: string;
  subtitle: string;
  avatarName: string;
  unread: number;
  messages: ChatMessage[];
};
