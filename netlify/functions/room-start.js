import { readModifyWrite, removeFromIndex, json } from "./_store.js";
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

  const result = await readModifyWrite(
    code,
    (room) => {
      if (room.hostId !== playerId) return { error: "Só quem criou a sala pode começar" };
      if (room.started) return {}; // idempotente
      if (room.players.length < 2) return { error: "Precisa de pelo menos 2 jogadores" };

      const deck = shuffle(CARDS.map((c) => c.id));
      const stacks = {};
      room.players.forEach((p) => { stacks[p.id] = []; p.eliminated = false; });
      deck.forEach((cardId, i) => {
        var player = room.players[i % room.players.length];
        stacks[player.id].push(cardId);
      });

      room.started = true;
      room.stacks = stacks;
      room.pot = [];
      room.lastRound = null;
      room.gameOver = false;
      room.winnerId = null;
      room.round = { num: 1, chooser: room.players[0].id, category: null, values: null };
    },
    (room) => room.started === true
  );

  if (result.notFound) return json({ error: "Sala não encontrada" }, 404);
  if (!result.ok) return json({ error: result.error }, 400);
  await removeFromIndex(code);
  return json({ ok: true });
};
