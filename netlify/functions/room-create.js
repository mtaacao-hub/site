import { store, genCode, genId, json } from "./_store.js";

export default async (req) => {
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const body = await req.json().catch(() => ({}));
  const name = (body.name || "").trim().slice(0, 30);
  if (!name) return json({ error: "Nome obrigatório" }, 400);

  const s = store();
  let code = genCode();
  for (let tries = 0; tries < 10; tries++) {
    const existing = await s.get(code, { type: "json" });
    if (!existing) break;
    code = genCode();
  }

  const playerId = genId();
  const room = {
    code,
    createdAt: Date.now(),
    started: false,
    hostId: playerId,
    players: [{ id: playerId, name }],
    hands: {},
  };
  await s.setJSON(code, room);
  return json({ code, playerId, name });
};
