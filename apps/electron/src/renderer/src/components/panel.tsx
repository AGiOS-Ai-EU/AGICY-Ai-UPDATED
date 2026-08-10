import "../overlay.css";
import "../tavern.css";

import { useChat } from "@ai-sdk/react";
import { Markdown } from "@renderer/components/markdown";
import { Spark } from "@renderer/components/spark";
import { apiFetch, initApiBase } from "@renderer/lib/api";
import { installGlobalErrorHandlers } from "@renderer/lib/report-error";
import { PANEL_TABS, type PanelTab } from "@shared/panel";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
  type UIMessage,
} from "ai";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

const TAB_LABELS: Record<PanelTab, string> = {
  chat: "Chat",
  today: "Today",
  notes: "Notes",
  skills: "Skills",
  memory: "Memory",
};

const TAB_PLACEHOLDER: Record<PanelTab, string> = {
  chat: "Ask anything, or point at something on screen.",
  today: "What Freestyle did will show up here, newest first.",
  notes: "Notes and to-dos land here — yours and Freestyle's.",
  skills: "Teach a skill and it becomes a one-liner you can run.",
  memory: "What Freestyle has learned about you, in plain sentences.",
};

const COMPOSER_PLACEHOLDER: Record<PanelTab, string> = {
  chat: "Ask anything",
  today: "Ask anything",
  notes: "Add a note or to-do",
  skills: "Ask anything",
  memory: "Ask anything",
};

const TOOL_LABELS: Record<string, string> = {
  "tool-current_time": "checked the time",
  "tool-web_search": "searched the web",
  "tool-image_search": "searched for images",
};

type ClientToolExecutor = () => Record<string, unknown>;

const CLIENT_TOOLS: Record<string, ClientToolExecutor> = {
  current_time: () => {
    const now = new Date();
    return {
      iso: now.toISOString(),
      local: now.toLocaleString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  },
};

function toolLabel(partType: string): string {
  return (
    TOOL_LABELS[partType] ?? partType.replace(/^tool-/, "").replace(/_/g, " ")
  );
}

function ChatMessage({ message }: { message: UIMessage }): React.JSX.Element {
  if (message.role === "user") {
    const text = message.parts
      .filter((p) => p.type === "text")
      .map((p) => p.text)
      .join("");
    return <div className="tavern-msg-user">{text}</div>;
  }

  return (
    <>
      {message.parts.map((part, i) => {
        if (part.type === "text") {
          if (!part.text) return null;
          return (
            <div key={`${message.id}-${i}`} className="tavern-msg-assistant">
              <Markdown text={part.text} />
            </div>
          );
        }
        if (part.type.startsWith("tool-")) {
          return (
            <div key={`${message.id}-${i}`} className="tavern-msg-tool">
              ✦ {toolLabel(part.type)}
            </div>
          );
        }
        return null;
      })}
    </>
  );
}

function PanelRoot(): React.JSX.Element {
  const [tab, setTab] = useState<PanelTab>("chat");
  const [draft, setDraft] = useState("");

  const [notice, setNotice] = useState<string | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/agent",
        fetch: ((input: string | URL | Request, init?: RequestInit) =>
          apiFetch(
            typeof input === "string" ? input : "/api/agent",
            init ?? {},
          )) as typeof fetch,
      }),
    [],
  );

  const { messages, sendMessage, status, addToolOutput } = useChat({
    transport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onToolCall: ({ toolCall }) => {
      const run = CLIENT_TOOLS[toolCall.toolName];
      if (!run) return;
      addToolOutput({
        tool: toolCall.toolName,
        toolCallId: toolCall.toolCallId,
        output: run(),
      });
    },
    onError: (err) => {
      setNotice(
        err.message.includes("cloud_auth_required") ||
          err.message.includes("401")
          ? "Sign in to Freestyle Cloud to chat."
          : err.message,
      );
    },
  });

  const busy = status === "submitted" || status === "streaming";

  const send = (): void => {
    const text = draft.trim();
    if (!text || tab !== "chat" || busy) return;
    setNotice(null);
    setDraft("");
    void sendMessage({ text });
  };

  useEffect(() => {
    const el = bodyRef.current;
    if (el && messages.length > 0) el.scrollTop = el.scrollHeight;
  }, [messages]);

  useEffect(() => {
    const offFocus = window.api.onPanelFocusComposer(() => {
      document.getElementById("panel-composer")?.focus();
    });
    const offDictation = window.api.onPanelDictation((ev) => {
      if (ev.kind === "error") {
        setNotice(ev.text);
        return;
      }
      setNotice(null);
      setDraft((prev) =>
        ev.kind === "final" && prev.trim()
          ? `${prev.trim()} ${ev.text}`
          : ev.text,
      );
    });
    return () => {
      offFocus?.();
      offDictation?.();
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") window.api.panelClose();
    };
    const onLeave = (): void => window.api.panelPointerLeft();
    const onEnter = (): void => window.api.panelPointerEntered();
    window.addEventListener("keydown", onKey);
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("mouseenter", onEnter);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("mouseenter", onEnter);
    };
  }, []);

  const chatActive = tab === "chat";
  const showChat = chatActive && messages.length > 0;

  return (
    <div className="tavern tavern-panel">
      <div className="tavern-head">
        <Spark state={busy ? "working" : "idle"} size={11} />
        <span className="tavern-head-name">Freestyle</span>
        <span className="tavern-head-spacer" />
        <button
          type="button"
          className="tavern-close"
          aria-label="Close"
          onClick={() => window.api.panelClose()}
        >
          ×
        </button>
      </div>

      <div className="tavern-tabs" role="tablist">
        {PANEL_TABS.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className="tavern-tab"
            onClick={() => setTab(id)}
          >
            {TAB_LABELS[id]}
          </button>
        ))}
      </div>

      <div className="tavern-body" role="tabpanel" ref={bodyRef}>
        {showChat ? (
          <>
            {messages.map((m) => (
              <ChatMessage key={m.id} message={m} />
            ))}
            {status === "submitted" ? (
              <div className="tavern-thinking">…</div>
            ) : null}
          </>
        ) : (
          <>
            <p className="tavern-label">{TAB_LABELS[tab]}</p>
            <div className="tavern-empty">{TAB_PLACEHOLDER[tab]}</div>
          </>
        )}
        {notice ? <p className="tavern-notice">{notice}</p> : null}
      </div>

      <div className="tavern-composer">
        <button type="button" className="tavern-btn" aria-label="Attach">
          ＋
        </button>
        <input
          id="panel-composer"
          className="tavern-input"
          value={draft}
          placeholder={COMPOSER_PLACEHOLDER[tab]}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) send();
          }}
        />
        <button
          type="button"
          className="tavern-btn tavern-btn-send"
          aria-label="Send"
          onClick={send}
        >
          ↑
        </button>
      </div>
    </div>
  );
}

initApiBase();
installGlobalErrorHandlers();

const container = document.getElementById("root");
if (container) createRoot(container).render(<PanelRoot />);
