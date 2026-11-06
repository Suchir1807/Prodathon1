"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import { useSession } from "next-auth/react";

import { messageFromYou } from "@/lib/chats";
import { displayName, sanitizeProfile } from "@/lib/profile";
import {
  getChatsSnapshot,
  getProfileSnapshot,
  getServerSnapshot,
  chatsFromSnapshot,
  profileFromSnapshot,
  readChats,
  subscribeChats,
  subscribeProfile,
  writeChats,
  writeProfile,
} from "@/lib/storage";
import type { Conversation, Profile } from "@/lib/types";

type ProfileContextValue = {
  profile: Profile;
  chats: Conversation[];
  saveProfile: (profile: Profile) => void;
  sendMessage: (chatId: string, body: string) => void;
  markRead: (chatId: string) => void;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

function subscribeClient() {
  return () => {};
}

export function useIsClient() {
  return useSyncExternalStore(subscribeClient, () => true, () => false);
}

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const username = session?.user?.name ?? undefined;

  const profileSnapshot = useSyncExternalStore(
    subscribeProfile,
    getProfileSnapshot,
    getServerSnapshot,
  );
  const chatsSnapshot = useSyncExternalStore(
    subscribeChats,
    getChatsSnapshot,
    getServerSnapshot,
  );
  const profile = useMemo(() => profileFromSnapshot(profileSnapshot), [profileSnapshot]);
  const chats = useMemo(() => chatsFromSnapshot(chatsSnapshot), [chatsSnapshot]);

  const saveProfile = useCallback((next: Profile) => {
    writeProfile(sanitizeProfile(next));
  }, []);

  const sendMessage = useCallback((chatId: string, body: string) => {
    const text = body.trim();
    if (!text) return;
    const message = messageFromYou(text, displayName(profile, username));
    writeChats(
      readChats().map((chat) =>
        chat.id === chatId
          ? { ...chat, unread: 0, messages: [...chat.messages, message] }
          : chat,
      ),
    );
  }, [profile, username]);

  const markRead = useCallback((chatId: string) => {
    const chats = readChats();
    const target = chats.find((chat) => chat.id === chatId);
    if (!target || target.unread === 0) return;
    writeChats(chats.map((chat) => (chat.id === chatId ? { ...chat, unread: 0 } : chat)));
  }, []);

  const value = useMemo(
    () => ({ profile, chats, saveProfile, sendMessage, markRead }),
    [profile, chats, saveProfile, sendMessage, markRead],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const value = useContext(ProfileContext);
  if (!value) {
    throw new Error("useProfile must be used within ProfileProvider");
  }
  return value;
}
