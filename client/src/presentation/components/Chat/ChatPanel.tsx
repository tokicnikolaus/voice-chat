import { useChat } from '@/application/hooks/useChat';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { TypingIndicator } from './TypingIndicator';

export function ChatPanel() {
  const {
    messages,
    typingUserNames,
    sendMessage,
    onTyping,
    toggleReaction,
    closePanel,
  } = useChat();

  return (
    <aside className="chat-panel">
      <ChatHeader onClose={closePanel} />
      <MessageList messages={messages} onReaction={toggleReaction} />
      <TypingIndicator userNames={typingUserNames} />
      <ChatInput onSend={sendMessage} onTyping={onTyping} />

      <style>{`
        .chat-panel {
          width: 380px;
          min-width: 380px;
          height: 100%;
          max-height: 100%;
          display: flex;
          flex-direction: column;
          background: var(--bg-secondary);
          border-left: 1px solid var(--border-color);
          overflow: hidden;
        }
      `}</style>
    </aside>
  );
}
