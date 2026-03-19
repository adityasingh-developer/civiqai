export function buildSavedMessagesFromChats(chats) {
  const savedMessages = [];

  chats.forEach((chat) => {
    if (chat.savedUser) {
      savedMessages.push({
        id: `${chat.id}:user`,
        chatId: chat.id,
        role: "user",
        text: chat.input,
        images: Array.isArray(chat.promptImages) ? chat.promptImages : [],
        createdAt: chat.savedUserAt || chat.userTime,
      });
    }

    if (chat.savedAssistant) {
      savedMessages.push({
        id: `${chat.id}:assistant`,
        chatId: chat.id,
        role: "assistant",
        text: chat.answer,
        images: [],
        createdAt: chat.savedAssistantAt || chat.assistantTime,
      });
    }
  });

  return savedMessages.sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
}

export function removeSavedMessageFromChats(chats, message) {
  return chats.map((chat) => {
    if (chat.id !== message.chatId) {
      return chat;
    }

    if (message.role === "user") {
      return {
        ...chat,
        savedUser: false,
        savedUserAt: null,
      };
    }

    return {
      ...chat,
      savedAssistant: false,
      savedAssistantAt: null,
    };
  });
}
