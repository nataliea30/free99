import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../api/client";

export default function MessagesPage() {
  const userId = localStorage.getItem("free99_user_id") || "";
  const [threads, setThreads] = useState([]);
  const [activeThreadId, setActiveThreadId] = useState("");
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  const activeThread = useMemo(
    () => threads.find((t) => t.id === activeThreadId),
    [threads, activeThreadId]
  );

  const loadThreads = async () => {
    try {
      const data = await apiFetch("/messages/threads", { userId });
      setThreads(data);
      if (!activeThreadId && data[0]) {
        setActiveThreadId(data[0].id);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const loadMessages = async (threadId) => {
    if (!threadId) return;
    try {
      const data = await apiFetch(`/messages/${threadId}`, { userId });
      setMessages(data);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    loadThreads();
  }, [userId]);

  useEffect(() => {
    loadMessages(activeThreadId);
  }, [activeThreadId]);

  const sendMessage = async (e) => {
    e.preventDefault();
    try {
      await apiFetch("/messages", {
        method: "POST",
        userId,
        body: { thread_id: activeThreadId, text },
      });
      setText("");
      await loadMessages(activeThreadId);
      await loadThreads();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section>
      <h2>Messages</h2>
      <p className="muted">Thread list on left, conversation on right.</p>
      {error && <p className="error">{error}</p>}
      <div className="messages-layout card">
        <aside className="thread-list">
          {threads.map((t) => (
            <button
              key={t.id}
              className={t.id === activeThreadId ? "thread active" : "thread"}
              onClick={() => setActiveThreadId(t.id)}
            >
              <div>Thread {t.id.slice(0, 8)}</div>
              <small>{new Date(t.last_message_at).toLocaleString()}</small>
            </button>
          ))}
        </aside>
        <div className="conversation">
          <header className="conversation-header">
            {activeThread ? `Participants: ${activeThread.participant_ids.join(", ")}` : "No thread selected"}
          </header>
          <div className="conversation-body">
            {messages.map((m) => (
              <div key={m.id} className={m.sender_id === userId ? "bubble mine" : "bubble"}>
                <p>{m.text}</p>
                <small>{new Date(m.created_at).toLocaleTimeString()}</small>
              </div>
            ))}
          </div>
          <form onSubmit={sendMessage} className="row gap">
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message" />
            <button type="submit" disabled={!activeThreadId || !text.trim()}>
              Send
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

