import { getStore } from "@netlify/blobs";

const STORE_NAME = "supertrunfo-rooms";

export function store() {
  return getStore(STORE_NAME);
}

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem 0/O/1/I, evita confusao

export function genCode() {
  let code = "";
  for (let i = 0; i < 5; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return code;
}

export function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

// Leitura sem lag de propagacao (Netlify Blobs por padrao e eventualmente
// consistente -- medimos ate ~10s de atraso com a consistencia default).
export async function readRoom(code) {
  const s = store();
  return s.get(code, { type: "json", consistency: "strong" });
}

// Read-modify-write seguro contra corrida: duas chamadas concorrentes (ex:
// dois jogadores entrando quase ao mesmo tempo) nao podem mais sobrescrever
// uma a outra silenciosamente. `mutate(room)` edita `room` in-place e pode
// retornar {error} pra abortar sem salvar. Se outra escrita colidir no meio
// do caminho, tenta de novo automaticamente com os dados mais recentes.
//
// `onlyIfMatch` sozinho nao foi suficiente num teste de carga (10 entradas
// simultaneas perderam 1 jogador mesmo com etag check) -- por isso, depois
// de uma escrita "bem-sucedida", confere com uma leitura fresca via
// `verify(room)`; se a mudanca nao aparecer, tenta tudo de novo.
export async function readModifyWrite(code, mutate, verify, maxAttempts = 8) {
  const s = store();
  for (let i = 0; i < maxAttempts; i++) {
    const existing = await s.getWithMetadata(code, { type: "json", consistency: "strong" });
    if (!existing) return { ok: false, notFound: true };
    const room = existing.data;
    const result = mutate(room) || {};
    if (result.error) return { ok: false, error: result.error };
    const write = await s.setJSON(code, room, { onlyIfMatch: existing.etag });
    if (!write.modified) continue;
    if (verify) {
      const check = await s.get(code, { type: "json", consistency: "strong" });
      if (!verify(check)) continue;
    }
    return { ok: true, room, extra: result };
  }
  return { ok: false, error: "Conflito ao salvar, tenta de novo." };
}
