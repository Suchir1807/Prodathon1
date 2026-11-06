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

export type MatchInsight = {
  score: number;
  theyTeachYou: string[];
  youTeachThem: string[];
  sharedDomains: string[];
};

export type ChatKind = "dm" | "session";

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
