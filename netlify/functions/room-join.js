import { readModifyWrite, genId, json } from "./_store.js";

export default async (req) => {
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const body = await req.json().catch(() => ({}));
  const code = (body.code || "").trim().toUpperCase();
  const name = (body.name || "").trim().slice(0, 30);
  if (!code || !name) return json({ error: "Dados incompletos" }, 400);

  const playerId = genId();
  const result = await readModifyWrite(
    code,
    (room) => {
      if (room.started) return { error: "Esse jogo já começou" };
      if (room.players.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
        return { error: "Já tem alguém com esse nome na sala" };
      }
      room.players.push({ id: playerId, name });
    },
    (room) => room.players.some((p) => p.id === playerId)
  );

  if (result.notFound) return json({ error: "Sala não encontrada" }, 404);
  if (!result.ok) return json({ error: result.error }, 409);
  return json({ code, playerId, name });
};
