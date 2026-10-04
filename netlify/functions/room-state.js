import { store, json } from "./_store.js";

export default async (req) => {
  const url = new URL(req.url);
  const code = (url.searchParams.get("code") || "").trim().toUpperCase();
  if (!code) return json({ error: "code obrigatório" }, 400);

  const s = store();
  const room = await s.get(code, { type: "json" });
  if (!room) return json({ error: "Sala não encontrada" }, 404);

  return json({
    code: room.code,
    started: room.started,
    hostId: room.hostId,
    players: room.players.map((p) => ({ id: p.id, name: p.name })),
  });
};
