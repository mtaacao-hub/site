import { store, genCode, genId, json } from "./_store.js";

export default async (req) => {
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const body = await req.json().catch(() => ({}));
  const name = (body.name || "").trim().slice(0, 30);
  if (!name) return json({ error: "Nome obrigatório" }, 400);

  const s = store();
  const playerId = genId();
  const room = {
    createdAt: Date.now(),
    started: false,
    hostId: playerId,
    players: [{ id: playerId, name }],
    stacks: {},
    pot: [],
    round: null,
    lastRound: null,
    gameOver: false,
    winnerId: null,
  };

  for (let tries = 0; tries < 10; tries++) {
    var code = genCode();
    room.code = code;
    var write = await s.setJSON(code, room, { onlyIfNew: true });
    if (write.modified) return json({ code, playerId, name });
  }
  return json({ error: "Não consegui gerar um código de sala livre, tenta de novo" }, 500);
};
