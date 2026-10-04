import { store, getIndex, json } from "./_store.js";

const MAX_AGE_MS = 12 * 60 * 60 * 1000; // nao mostra salas "esquecidas" de muito tempo atras

export default async () => {
  const s = store();
  const codes = await getIndex();

  const rooms = [];
  for (const code of codes) {
    const room = await s.get(code, { type: "json", consistency: "strong" });
    if (!room || room.started) continue;
    if (Date.now() - room.createdAt > MAX_AGE_MS) continue;
    rooms.push({
      code: room.code,
      hostName: room.players[0] ? room.players[0].name : "?",
      playerCount: room.players.length,
      createdAt: room.createdAt,
    });
  }
  rooms.sort((a, b) => b.createdAt - a.createdAt);

  return json({ rooms });
};
