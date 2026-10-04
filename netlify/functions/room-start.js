import { store, json } from "./_store.js";
import { CARDS } from "./_cards.js";

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    var t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

export default async (req) => {
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const body = await req.json().catch(() => ({}));
  const code = (body.code || "").trim().toUpperCase();
  const playerId = body.playerId || "";
  if (!code || !playerId) return json({ error: "Dados incompletos" }, 400);

  const s = store();
  const room = await s.get(code, { type: "json" });
  if (!room) return json({ error: "Sala não encontrada" }, 404);
  if (room.hostId !== playerId) return json({ error: "Só quem criou a sala pode começar" }, 403);
  if (room.started) return json({ ok: true });
  if (room.players.length < 2) return json({ error: "Precisa de pelo menos 2 jogadores" }, 400);

  const deck = shuffle(CARDS.map((c) => c.id));
  const hands = {};
  room.players.forEach((p) => { hands[p.id] = []; });
  deck.forEach((cardId, i) => {
    var player = room.players[i % room.players.length];
    hands[player.id].push(cardId);
  });

  room.started = true;
  room.hands = hands;
  await s.setJSON(code, room);
  return json({ ok: true });
};
