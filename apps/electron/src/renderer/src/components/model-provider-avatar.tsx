import cerebrasMark from "@renderer/assets/providers/cerebras-color.svg";
import claudeMark from "@renderer/assets/providers/claude-color.svg";
import deepseekMark from "@renderer/assets/providers/deepseek-color.svg";
import geminiMark from "@renderer/assets/providers/gemini-color.svg";
import gemmaMark from "@renderer/assets/providers/gemma-color.svg";
import grokMark from "@renderer/assets/providers/grok.svg";
import groqMark from "@renderer/assets/providers/groq.svg";
import kimiMark from "@renderer/assets/providers/kimi-color.svg";
import metaMark from "@renderer/assets/providers/meta-color.svg";
import mistralMark from "@renderer/assets/providers/mistral-color.svg";
import openaiMark from "@renderer/assets/providers/openai.svg";
import qwenMark from "@renderer/assets/providers/qwen-color.svg";
import zhipuMark from "@renderer/assets/providers/zhipu-color.svg";
import type { UpdatedModel } from "@renderer/lib/updated-models";
import { PROVIDER_SVG_FILES } from "@renderer/lib/updated-models";
import type React from "react";

const SVG_BY_FILE: Record<string, string> = {
  "openai.svg": openaiMark,
  "claude-color.svg": claudeMark,
  "gemini-color.svg": geminiMark,
  "grok.svg": grokMark,
  "mistral-color.svg": mistralMark,
  "deepseek-color.svg": deepseekMark,
  "qwen-color.svg": qwenMark,
  "meta-color.svg": metaMark,
  "kimi-color.svg": kimiMark,
  "zhipu-color.svg": zhipuMark,
  "groq.svg": groqMark,
  "cerebras-color.svg": cerebrasMark,
  "gemma-color.svg": gemmaMark,
};

export function providerMarkSrc(domain: string): string | null {
  const file = PROVIDER_SVG_FILES[domain];
  if (!file) return null;
  return SVG_BY_FILE[file] ?? null;
}

export function ModelProviderAvatar({
  model,
  size = 20,
}: {
  model: Pick<UpdatedModel, "domain" | "name" | "logoText" | "logoBg">;
  size?: number;
}): React.JSX.Element {
  const src = providerMarkSrc(model.domain);
  if (src) {
    return (
      <img
        className="updated-model-avatar"
        src={src}
        alt=""
        width={size}
        height={size}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="updated-model-avatar is-badge"
      style={{
        width: size,
        height: size,
        background: model.logoBg,
        fontSize: Math.max(10, size * 0.45),
      }}
      aria-hidden="true"
    >
      {model.logoText.slice(0, 1)}
    </span>
  );
}
