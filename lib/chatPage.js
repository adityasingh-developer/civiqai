import { writeUserCache } from "@/lib/localCache";

export function formatChatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function buildChatMessages(history) {
  const list = [];

  history.forEach((item, index) => {
    const userTimestamp = item.userTime ?? item.time ?? Date.now();
    const assistantTimestamp =
      item.assistantTime ?? item.time ?? userTimestamp;
    const chatId = item.id || `chat-${index}`;

    list.push({
      id: `u-${chatId}`,
      chatId,
      role: "user",
      text: item.input,
      images: Array.isArray(item.promptImages) ? item.promptImages : [],
      time: formatChatTime(userTimestamp),
      saved: Boolean(item.savedUser),
    });

    list.push({
      id: `a-${chatId}`,
      chatId,
      role: "assistant",
      text: item.answer,
      images: [],
      time: formatChatTime(assistantTimestamp),
      saved: Boolean(item.savedAssistant),
    });
  });

  return list;
}

export function writeChatCaches(email, history) {
  writeUserCache("chat-cache", email, history);
}

export function toggleSavedState(history, message, isSaved, createdAt) {
  return history.map((chat) => {
    if (chat.id !== message.chatId) {
      return chat;
    }

    if (message.role === "user") {
      return {
        ...chat,
        savedUser: !isSaved,
        savedUserAt: !isSaved ? createdAt : null,
      };
    }

    return {
      ...chat,
      savedAssistant: !isSaved,
      savedAssistantAt: !isSaved ? createdAt : null,
    };
  });
}
