import React from 'react';
import './ChatSidebar.css';


const ChatSidebar = ({ chats, activeChatId, onSelectChat, onNewChat, open }) => {
  return (
    <aside className={"chat-sidebar " + (open ? 'open' : '')} aria-label="Previous chats">
      <div className="sidebar-header">
        <h2>Chats</h2>
        <button className="small-btn" onClick={onNewChat}>New</button>
      </div>
      <nav className="chat-list" aria-live="polite">
        {chats.map(c => (
          <button
            key={c.id}
            className={"chat-list-item " + (c.id === activeChatId ? 'active' : '')}
            onClick={() => onSelectChat(c.id)}
          >
            <span className="title-line">{c.title}</span>
            <span className="meta-line">{c.messages.length} msg{c.messages.length !== 1 && 's'}</span>
          </button>
        ))}
        {chats.length === 0 && <p className="empty-hint">No chats yet.</p>}
      </nav>
    </aside>
  );
};

export default ChatSidebar;
