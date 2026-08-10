import { apiFetch } from "@renderer/lib/api";

export interface BrainFile {
  path: string;
  size: number;
  modified: number;
}

const GET_ROUTES = new Set(["list", "graph", "export"]);

export async function fsCall(
  route: string,
  body: Record<string, unknown>,
): Promise<Record<string, unknown> | null> {
  try {
    const isGet = GET_ROUTES.has(route);
    const res = await apiFetch(`/api/brain/${route}`, {
      method: isGet ? "GET" : "POST",
      ...(isGet
        ? {}
        : {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }),
    });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function readBrainFile(path: string): Promise<string | null> {
  const res = await fsCall("read", { path });
  return res?.ok ? ((res.text as string) ?? "") : null;
}

export async function writeBrainFile(
  path: string,
  text: string,
): Promise<boolean> {
  const res = await fsCall("write", { path, text });
  return res?.ok === true;
}

export async function listBrainFiles(prefix?: string): Promise<BrainFile[]> {
  const res = await fsCall("list", {});
  const files = res?.ok ? ((res.files as BrainFile[]) ?? []) : [];
  if (!prefix) return files;
  return files.filter((f) =>
    f.path.replace(/\\/g, "/").startsWith(`${prefix}/`),
  );
}
