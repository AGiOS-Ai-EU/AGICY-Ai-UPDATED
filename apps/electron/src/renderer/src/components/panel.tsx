import "../overlay.css";
import "../tavern.css";

import { useChat } from "@ai-sdk/react";
import { Markdown } from "@renderer/components/markdown";
import { NotesTab } from "@renderer/components/notes-tab";
import { Spark } from "@renderer/components/spark";
import { TodosTab } from "@renderer/components/todos-tab";
import {
  type AgentToolCall,
  agentToolTier,
  DECLINED_OUTPUT,
  describeAgentAction,
  executeAgentTool,
} from "@renderer/lib/agent-tools";
import { apiFetch, initApiBase } from "@renderer/lib/api";
import { fsCall, type BrainFile as HomeFile } from "@renderer/lib/brain-fs";
import { installGlobalErrorHandlers } from "@renderer/lib/report-error";
import { PANEL_TABS, type PanelTab } from "@shared/panel";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
  type UIMessage,
} from "ai";
import type React from "react";
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createRoot } from "react-dom/client";

const TAB_LABELS: Record<PanelTab, string> = {
  chat: "Chat",
  history: "History",
  todos: "Todos",
  notes: "Notes",
  brain: "Brain",
};

const TAB_PLACEHOLDER: Record<PanelTab, string> = {
  chat: "Ask anything, or point at something on screen.",
  history: "Past conversations land here — pick one to continue it.",
  todos: "Nothing to do yet.",
  notes: "No notes yet.",
  brain:
    "Everything Freestyle knows lives here — memories, notes, skills, todos.",
};

const COMPOSER_PLACEHOLDER: Record<PanelTab, string> = {
  chat: "Ask anything",
  history: "Ask anything",
  todos: "Ask anything",
  notes: "Ask anything",
  brain: "Ask anything",
};

const TOOL_LABELS: Record<string, string> = {
  "tool-current_time": "checked the time",
  "tool-web_search": "searched the web",
  "tool-image_search": "searched for images",
  "tool-get_context": "looked at your screen",
  "tool-read_document": "read the document",
  "tool-get_clipboard": "read your clipboard",
  "tool-set_clipboard": "updated your clipboard",
  "tool-paste": "pasted at your cursor",
  "tool-list_files": "looked through the files",
  "tool-read_file": "read a file",
  "tool-write_file": "wrote a file",
  "tool-edit_file": "edited a file",
  "tool-search_files": "searched the files",
};

type FileView =
  | { kind: "list" }
  | { kind: "view"; path: string; text: string }
  | { kind: "edit"; path: string; draft: string }
  | { kind: "create"; name: string; draft: string };

function slugify(name: string): string {
  const segments = name
    .split("/")
    .map((seg) =>
      seg
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, ""),
    )
    .filter(Boolean);
  return segments.join("/") || "untitled";
}

function FileEditor({
  label,
  draft,
  onDraft,
  onSave,
  onCancel,
}: {
  label: string;
  draft: string;
  onDraft: (text: string) => void;
  onSave: () => void;
  onCancel: () => void;
}): React.JSX.Element {
  return (
    <>
      <span className="tavern-file-back">{label}</span>
      <textarea
        className="tavern-editor"
        value={draft}
        onChange={(e) => onDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            onCancel();
          }
        }}
      />
      <div className="tavern-approve-actions">
        <button
          type="button"
          className="tavern-approve-btn tavern-approve-allow"
          onClick={onSave}
        >
          Save
        </button>
        <button type="button" className="tavern-approve-btn" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </>
  );
}

function FilesTab({
  root,
  emptyText,
  headline,
  newLabel,
}: {
  root: string;
  emptyText: string;
  headline: string | null;
  newLabel: string;
}): React.JSX.Element {
  const [files, setFiles] = useState<HomeFile[]>([]);
  const [headlineText, setHeadlineText] = useState<string | null>(null);
  const [view, setView] = useState<FileView>({ kind: "list" });

  const load = useCallback((): void => {
    void fsCall("list", root ? { path: root } : {}).then((res) => {
      if (res?.ok) setFiles((res.files as HomeFile[]) ?? []);
    });
    if (headline) {
      void fsCall("read", { path: headline }).then((res) => {
        setHeadlineText(res?.ok ? ((res.text as string) ?? null) : null);
      });
    }
  }, [root, headline]);

  useEffect(() => {
    load();
  }, [load]);

  const openFile = (path: string): void => {
    void fsCall("read", { path }).then((res) => {
      if (res?.ok)
        setView({ kind: "view", path, text: (res.text as string) ?? "" });
    });
  };

  const saveFile = (path: string, text: string): void => {
    void fsCall("write", { path, text }).then((res) => {
      if (res?.ok) {
        load();
        setView({ kind: "view", path, text });
      }
    });
  };

  const listed = files.filter(
    (f) => !headline || f.path.replace(/\\/g, "/") !== headline,
  );

  if (view.kind === "view") {
    return (
      <>
        <button
          type="button"
          className="tavern-file-back"
          onClick={() => setView({ kind: "list" })}
        >
          ← {view.path.replace(/\\/g, "/")}
        </button>
        <Markdown text={view.text} />
        <div className="tavern-approve-actions">
          <button
            type="button"
            className="tavern-approve-btn"
            onClick={() =>
              setView({ kind: "edit", path: view.path, draft: view.text })
            }
          >
            Edit
          </button>
          <button
            type="button"
            className="tavern-file-delete"
            onClick={() => {
              void fsCall("delete", { path: view.path }).then(() => {
                setView({ kind: "list" });
                load();
              });
            }}
          >
            Delete
          </button>
        </div>
      </>
    );
  }

  if (view.kind === "edit") {
    return (
      <FileEditor
        label={view.path.replace(/\\/g, "/")}
        draft={view.draft}
        onDraft={(draft) => setView({ ...view, draft })}
        onSave={() => saveFile(view.path, view.draft)}
        onCancel={() => openFile(view.path)}
      />
    );
  }

  if (view.kind === "create") {
    return (
      <>
        <input
          className="tavern-editor-name"
          value={view.name}
          placeholder="File name"
          onChange={(e) => setView({ ...view, name: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.stopPropagation();
              setView({ kind: "list" });
            }
          }}
        />
        <FileEditor
          label={`${root ? `${root}/` : ""}${slugify(view.name)}.md`}
          draft={view.draft}
          onDraft={(draft) => setView({ ...view, draft })}
          onSave={() =>
            saveFile(
              `${root ? `${root}/` : ""}${slugify(view.name)}.md`,
              view.draft,
            )
          }
          onCancel={() => setView({ kind: "list" })}
        />
      </>
    );
  }

  return (
    <>
      {headlineText?.trim() ? (
        <>
          <Markdown text={headlineText} />
          <button
            type="button"
            className="tavern-file-back"
            onClick={() => {
              if (headline)
                setView({ kind: "edit", path: headline, draft: headlineText });
            }}
          >
            Edit {headline?.replace(/\\/g, "/").split("/").pop()}
          </button>
        </>
      ) : null}
      {listed.length === 0 && !headlineText?.trim() ? (
        <div className="tavern-empty">{emptyText}</div>
      ) : null}
      {listed.map((f) => (
        <button
          key={f.path}
          type="button"
          className="tavern-file-row"
          onClick={() => openFile(f.path)}
        >
          {(root
            ? f.path.replace(/\\/g, "/").replace(`${root}/`, "")
            : f.path.replace(/\\/g, "/")
          ).replace(/\.md$/, "")}
        </button>
      ))}
      <button
        type="button"
        className="tavern-file-new"
        onClick={() => setView({ kind: "create", name: "", draft: "" })}
      >
        ＋ {newLabel}
      </button>
    </>
  );
}

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
          const tool = part as {
            state?: string;
            output?: { ok?: boolean; reason?: string };
          };
          if (tool.state !== "output-available") return null;
          if (tool.output?.ok === false) return null;
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

interface ThreadState {
  id: string;
  messages: UIMessage[];
}

interface ThreadSummary {
  id: string;
  title: string;
  updatedAt: number;
}

function dateGroup(ts: number): string {
  const day = (d: Date): number =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const date = new Date(ts);
  const now = new Date();
  const diffDays = Math.round((day(now) - day(date)) / 86_400_000);
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  const opts: Intl.DateTimeFormatOptions =
    date.getFullYear() === now.getFullYear()
      ? { month: "long", day: "numeric" }
      : { month: "long", day: "numeric", year: "numeric" };
  return date.toLocaleDateString(undefined, opts);
}

function newThread(): ThreadState {
  return { id: crypto.randomUUID(), messages: [] };
}

function PanelRoot(): React.JSX.Element {
  const [thread, setThread] = useState<ThreadState | null>(null);

  useEffect(() => {
    void apiFetch("/api/agent/thread/latest")
      .then(async (res) => {
        if (!res.ok) return null;
        const data = (await res.json()) as {
          thread: { id: string; messages: UIMessage[] } | null;
        };
        return data.thread;
      })
      .catch(() => null)
      .then((latest) =>
        setThread(
          latest ? { id: latest.id, messages: latest.messages } : newThread(),
        ),
      );
  }, []);

  if (!thread) return <div className="tavern tavern-panel" />;
  return (
    <PanelInner key={thread.id} thread={thread} onSwitchThread={setThread} />
  );
}

function ThreadHistory({
  onPick,
  currentId,
}: {
  onPick: (thread: ThreadState) => void;
  currentId: string;
}): React.JSX.Element {
  const [threads, setThreads] = useState<ThreadSummary[]>([]);

  useEffect(() => {
    void apiFetch("/api/agent/thread/list")
      .then(async (res) =>
        res.ok
          ? ((await res.json()) as { threads: ThreadSummary[] }).threads
          : [],
      )
      .catch(() => [])
      .then(setThreads);
  }, []);

  if (threads.length === 0)
    return <div className="tavern-empty">No conversations yet.</div>;

  let lastGroup = "";
  return (
    <>
      {threads.map((t) => {
        const group = dateGroup(t.updatedAt);
        const divider = group !== lastGroup;
        lastGroup = group;
        return (
          <Fragment key={t.id}>
            {divider ? <p className="tavern-thread-divider">{group}</p> : null}
            <button
              type="button"
              className={`tavern-thread-row${t.id === currentId ? " is-current" : ""}`}
              onClick={() => {
                void apiFetch(`/api/agent/thread/${t.id}`).then(async (res) => {
                  if (!res.ok) return;
                  const data = (await res.json()) as {
                    thread: { id: string; messages: UIMessage[] };
                  };
                  onPick({
                    id: data.thread.id,
                    messages: data.thread.messages,
                  });
                });
              }}
            >
              {t.title}
            </button>
          </Fragment>
        );
      })}
    </>
  );
}

function PanelInner({
  thread,
  onSwitchThread,
}: {
  thread: ThreadState;
  onSwitchThread: (thread: ThreadState) => void;
}): React.JSX.Element {
  const [tab, setTab] = useState<PanelTab>("chat");
  const [draft, setDraft] = useState("");

  const [notice, setNotice] = useState<string | null>(null);
  const [approvals, setApprovals] = useState<AgentToolCall[]>([]);
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
    id: thread.id,
    messages: thread.messages,
    transport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onFinish: ({ messages: finished }) => {
      if (finished.length === 0) return;
      void apiFetch("/api/agent/thread/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId: thread.id, messages: finished }),
      }).catch(() => {});
    },
    onToolCall: async ({ toolCall }) => {
      const call: AgentToolCall = {
        toolName: toolCall.toolName,
        toolCallId: toolCall.toolCallId,
        input: toolCall.input,
      };
      const tier = agentToolTier(call.toolName);
      if (tier === "confirmed") {
        setApprovals((prev) => [...prev, call]);
        return;
      }
      const output =
        tier === "free"
          ? await executeAgentTool(call)
          : { ok: false, reason: `unknown tool: ${call.toolName}` };
      addToolOutput({
        tool: toolCall.toolName,
        toolCallId: toolCall.toolCallId,
        output,
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
    if (!text || tab !== "chat" || busy || approvals.length > 0) return;
    setNotice(null);
    setDraft("");
    void sendMessage({ text });
  };

  const resolveApproval = (call: AgentToolCall, allowed: boolean): void => {
    setApprovals((prev) =>
      prev.filter((a) => a.toolCallId !== call.toolCallId),
    );
    void (async () => {
      const output = allowed ? await executeAgentTool(call) : DECLINED_OUTPUT;
      addToolOutput({
        tool: call.toolName,
        toolCallId: call.toolCallId,
        output,
      });
    })();
  };

  useEffect(() => {
    const el = bodyRef.current;
    if (el && (messages.length > 0 || approvals.length > 0))
      el.scrollTop = el.scrollHeight;
  }, [messages, approvals]);

  const pinned = busy || approvals.length > 0;
  useEffect(() => {
    window.api.panelSetBusy(pinned);
    return () => window.api.panelSetBusy(false);
  }, [pinned]);

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
        {chatActive || tab === "history" ? (
          <button
            type="button"
            className="tavern-head-btn"
            title="New conversation"
            disabled={pinned}
            onClick={() => onSwitchThread(newThread())}
          >
            ＋ New
          </button>
        ) : null}
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
        {tab === "history" ? (
          <ThreadHistory
            currentId={thread.id}
            onPick={(picked) => {
              if (picked.id === thread.id) setTab("chat");
              else onSwitchThread(picked);
            }}
          />
        ) : showChat ? (
          <>
            {messages.map((m) => (
              <ChatMessage key={m.id} message={m} />
            ))}
            {approvals.map((call) => (
              <div key={call.toolCallId} className="tavern-approve">
                <div className="tavern-approve-text">
                  {describeAgentAction(call)}
                </div>
                <div className="tavern-approve-actions">
                  <button
                    type="button"
                    className="tavern-approve-btn tavern-approve-allow"
                    onClick={() => resolveApproval(call, true)}
                  >
                    Allow
                  </button>
                  <button
                    type="button"
                    className="tavern-approve-btn"
                    onClick={() => resolveApproval(call, false)}
                  >
                    Don't allow
                  </button>
                </div>
              </div>
            ))}
            {status === "submitted" ? (
              <div className="tavern-thinking">…</div>
            ) : null}
          </>
        ) : tab === "todos" ? (
          <TodosTab />
        ) : tab === "notes" ? (
          <NotesTab />
        ) : tab === "brain" ? (
          <FilesTab
            key="brain"
            root=""
            headline="BRAIN.md"
            emptyText={TAB_PLACEHOLDER.brain}
            newLabel="New file"
          />
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
          onMouseDown={() => window.api.panelRequestFocus()}
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
