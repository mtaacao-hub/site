import { readModifyWrite, json } from "./_store.js";
import { CARDS, STATS } from "./_cards.js";

function cardById(id) {
  return CARDS.find((c) => c.id === id);
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    var t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

const SUPER_TRUNFO_ID = "marcos";
const AMOR_IDS = ["belenga", "david", "felice", "marcossamba"];

function byValue(plays, category) {
  var lowerWins = category === "Calvície";
  var extremeVal = lowerWins
    ? Math.min.apply(null, plays.map(function (pl) { return pl.value; }))
    : Math.max.apply(null, plays.map(function (pl) { return pl.value; }));
  var winners = plays.filter(function (pl) { return pl.value === extremeVal; });
  return { winners: winners, isTie: winners.length > 1 };
}

// Regra especial: a carta do Super Trunfo vence qualquer rodada em que
// aparecer, exceto se uma carta "Amor do Trunfo" tambem estiver em jogo --
// aí o Amor vence. Com 2+ Amores junto do Trunfo, eles disputam normalmente
// entre si pelo valor da categoria. Sem o Trunfo na rodada, Amor e carta
// normal (ver _cards.js / mensagem do Ricardo de 2026-10-05).
function resolveRound(plays, category) {
  var trunfoPlay = plays.find(function (pl) { return pl.cardId === SUPER_TRUNFO_ID; });
  if (!trunfoPlay) {
    var r = byValue(plays, category);
    return { winners: r.winners, isTie: r.isTie, special: null };
  }

  var amorPlays = plays.filter(function (pl) { return AMOR_IDS.indexOf(pl.cardId) !== -1; });
  if (amorPlays.length === 0) {
    return { winners: [trunfoPlay], isTie: false, special: "trunfo" };
  }
  if (amorPlays.length === 1) {
    return { winners: amorPlays, isTie: false, special: "amor-solo" };
  }
  var r2 = byValue(amorPlays, category);
  return { winners: r2.winners, isTie: r2.isTie, special: "amor-disputa" };
}

export default async (req) => {
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const body = await req.json().catch(() => ({}));
  const code = (body.code || "").trim().toUpperCase();
  const playerId = body.playerId || "";
  const category = body.category || "";
  if (!code || !playerId || !category) return json({ error: "Dados incompletos" }, 400);
  if (STATS.indexOf(category) === -1) return json({ error: "Categoria inválida" }, 400);

  var resolvedRoundNum = null;

  const result = await readModifyWrite(
    code,
    (room) => {
    if (!room.started) return { error: "O jogo ainda não começou" };
    if (room.gameOver) return { error: "O jogo já acabou" };
    if (!room.round || room.round.category) return { error: "Rodada já resolvida, aguarde a atualização" };
    if (room.round.chooser !== playerId) return { error: "Não é sua vez de escolher" };

    const active = room.players.filter((p) => !p.eliminated);
    if (active.length < 2) return { error: "Jogadores insuficientes" };

    const plays = active.map((p) => {
      var topId = room.stacks[p.id][0];
      return { playerId: p.id, cardId: topId, value: cardById(topId).stats[category] };
    });

    var resolved = resolveRound(plays, category);
    var winners = resolved.winners;
    var isTie = resolved.isTie;
    var special = resolved.special;

    var playedCardIds = [];
    plays.forEach(function (pl) {
      room.stacks[pl.playerId].shift();
      playedCardIds.push(pl.cardId);
    });
    var potCards = shuffle(room.pot.concat(playedCardIds));

    var roundWinnerId = null;
    if (!isTie) {
      roundWinnerId = winners[0].playerId;
      room.stacks[roundWinnerId] = room.stacks[roundWinnerId].concat(potCards);
      room.pot = [];
    } else {
      room.pot = potCards;
    }

    var eliminatedNames = [];
    active.forEach(function (p) {
      if (p.id !== roundWinnerId && room.stacks[p.id].length === 0) {
        var pObj = room.players.find(function (x) { return x.id === p.id; });
        pObj.eliminated = true;
        eliminatedNames.push(pObj.name);
      }
    });

    var stillActive = room.players.filter(function (p) { return !p.eliminated; });
    var gameOver = stillActive.length <= 1;
    var winnerId = gameOver && stillActive.length === 1 ? stillActive[0].id : null;

    var nextChooser = null;
    if (!gameOver) {
      if (!isTie) {
        nextChooser = roundWinnerId;
      } else {
        var order = room.players.map(function (p) { return p.id; });
        var startIdx = order.indexOf(room.round.chooser);
        for (var step = 1; step <= order.length; step++) {
          var idx = (startIdx + step) % order.length;
          var cand = room.players.find(function (p) { return p.id === order[idx]; });
          if (cand && !cand.eliminated) { nextChooser = cand.id; break; }
        }
      }
    }

    room.lastRound = {
      num: room.round.num,
      category: category,
      tie: isTie,
      special: special,
      entries: plays.map(function (pl) {
        return {
          name: room.players.find(function (p) { return p.id === pl.playerId; }).name,
          value: pl.value,
          isWinner: !isTie && pl.playerId === roundWinnerId,
          cardId: pl.cardId,
          cardName: cardById(pl.cardId).name,
          cardImg: cardById(pl.cardId).img,
        };
      }),
      eliminated: eliminatedNames,
    };

    room.gameOver = gameOver;
    room.winnerId = winnerId;
    room.round = gameOver ? null : { num: room.lastRound.num + 1, chooser: nextChooser, category: null, values: null };
    resolvedRoundNum = room.lastRound.num;
    },
    (room) => room.gameOver === true || (room.lastRound && room.lastRound.num === resolvedRoundNum)
  );

  if (result.notFound) return json({ error: "Sala não encontrada" }, 404);
  if (!result.ok) return json({ error: result.error }, 400);
  return json({ ok: true });
};
