import { store, genId, json } from "./_store.js";

export default async (req) => {
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const body = await req.json().catch(() => ({}));
  const code = (body.code || "").trim().toUpperCase();
  const name = (body.name || "").trim().slice(0, 30);
  if (!code || !name) return json({ error: "Dados incompletos" }, 400);

  const s = store();
  const room = await s.get(code, { type: "json" });
  if (!room) return json({ error: "Sala não encontrada" }, 404);
  if (room.started) return json({ error: "Esse jogo já começou" }, 409);
  if (room.players.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
    return json({ error: "Já tem alguém com esse nome na sala" }, 409);
  }

  const playerId = genId();
  room.players.push({ id: playerId, name });
  await s.setJSON(code, room);
  return json({ code, playerId, name });
};
