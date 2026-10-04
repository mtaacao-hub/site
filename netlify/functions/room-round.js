import { readRoom, json } from "./_store.js";
import { CARDS, STATS } from "./_cards.js";

function cardById(id) {
  return CARDS.find((c) => c.id === id);
}

function playerName(room, id) {
  var p = room.players.find((p) => p.id === id);
  return p ? p.name : "?";
}

export default async (req) => {
  const url = new URL(req.url);
  const code = (url.searchParams.get("code") || "").trim().toUpperCase();
  const playerId = url.searchParams.get("playerId") || "";
  if (!code || !playerId) return json({ error: "Dados incompletos" }, 400);

  const room = await readRoom(code);
  if (!room) return json({ error: "Sala não encontrada" }, 404);
  if (!room.started) return json({ started: false });

  const me = room.players.find((p) => p.id === playerId);
  if (!me) return json({ error: "Jogador não encontrado nessa sala" }, 404);

  const myStack = room.stacks[playerId] || [];
  const myTopId = myStack[0];
  const myTopCard = myTopId ? cardById(myTopId) : null;

  var lastRound = null;
  if (room.lastRound) {
    lastRound = {
      num: room.lastRound.num,
      category: room.lastRound.category,
      tie: room.lastRound.tie,
      entries: room.lastRound.entries,
      eliminated: room.lastRound.eliminated || [],
    };
  }

  const out = {
    started: true,
    stats: STATS,
    roundNum: room.round ? room.round.num : room.lastRound ? room.lastRound.num + 1 : 1,
    potSize: room.pot.length,
    stackSize: myStack.length,
    eliminated: !!me.eliminated,
    myCard: myTopCard,
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      stackSize: (room.stacks[p.id] || []).length,
      eliminated: !!p.eliminated,
    })),
    lastRound: lastRound,
    gameOver: !!room.gameOver,
  };

  if (room.gameOver) {
    out.winnerName = playerName(room, room.winnerId);
  } else if (room.round) {
    out.chooserName = playerName(room, room.round.chooser);
    out.isMyTurn = room.round.chooser === playerId && !me.eliminated;
    out.categoryChosen = !!room.round.category;
  }

  return json(out);
};
