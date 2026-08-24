import { ModelProviderAvatar } from "@renderer/components/model-provider-avatar";
import {
  DEFAULT_LLM_MODEL_ID,
  getUpdatedLlmModel,
  UPDATED_LLM_MODELS,
  type UpdatedModel,
} from "@renderer/lib/updated-models";
import { useEffect, useMemo, useRef, useState } from "react";

export function ModelPickerButton({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const active = getUpdatedLlmModel(value || DEFAULT_LLM_MODEL_ID);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return UPDATED_LLM_MODELS;
    return UPDATED_LLM_MODELS.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.provider.toLowerCase().includes(q) ||
        m.apiId.toLowerCase().includes(q),
    );
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent): void => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = (m: UpdatedModel): void => {
    onChange(m.apiId);
    setOpen(false);
    setQuery("");
  };

  return (
    <div className="updated-model-picker" ref={wrapRef}>
      <button
        type="button"
        className="updated-model-picker-trigger"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Model: ${active.name}`}
        title={active.name}
        onClick={() => setOpen((v) => !v)}
      >
        <ModelProviderAvatar model={active} size={18} />
        <span className="updated-model-picker-name">{active.name}</span>
        <span className="updated-model-picker-caret" aria-hidden="true">
          ▾
        </span>
      </button>
      {open ? (
        <div className="updated-model-picker-menu" role="listbox">
          <input
            className="updated-model-picker-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search models"
            aria-label="Search models"
          />
          <ul className="updated-model-picker-list">
            {filtered.map((m) => {
              const selected = m.apiId === active.apiId;
              return (
                <li key={m.apiId}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={`updated-model-picker-option${selected ? " is-selected" : ""}`}
                    onClick={() => pick(m)}
                  >
                    <ModelProviderAvatar model={m} size={20} />
                    <span className="updated-model-picker-option-text">
                      <span className="updated-model-picker-option-name">
                        {m.name}
                      </span>
                      <span className="updated-model-picker-option-meta">
                        {m.provider}
                        {m.note ? ` · ${m.note}` : ""}
                      </span>
                    </span>
                    {selected ? (
                      <span className="updated-model-picker-check" aria-hidden>
                        ✓
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
