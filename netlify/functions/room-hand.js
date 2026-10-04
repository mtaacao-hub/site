import { store, json } from "./_store.js";
import { CARDS, STATS } from "./_cards.js";

export default async (req) => {
  const url = new URL(req.url);
  const code = (url.searchParams.get("code") || "").trim().toUpperCase();
  const playerId = url.searchParams.get("playerId") || "";
  if (!code || !playerId) return json({ error: "Dados incompletos" }, 400);

  const s = store();
  const room = await s.get(code, { type: "json" });
  if (!room) return json({ error: "Sala não encontrada" }, 404);
  if (!room.started) return json({ started: false });

  const hand = room.hands[playerId];
  if (!hand) return json({ error: "Jogador não encontrado nessa sala" }, 404);

  const cards = hand.map((id) => CARDS.find((c) => c.id === id));
  return json({ started: true, stats: STATS, cards });
};
