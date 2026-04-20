# Session Lifecycle

A session (`GameServerSessionEntity` + `GameSessionPlayerEntity`) represents a live match on a game server. This document describes how sessions are created, mutated, and destroyed.

---

## Creation

**Trigger:** `SrcdsServerStartedEvent` (RMQ, from game server sidecar)

When the game server binary starts, the sidecar publishes `SrcdsServerStartedEvent`. `AssignStartedServerHandler` creates one `GameServerSessionEntity` and one `GameSessionPlayerEntity` per player. Initial player state: `connection = NOT_YET_CONNECTED`, `abandoned = false`.

---

## Mid-game mutations

| Event | Source | Effect on session |
|-------|--------|-------------------|
| `LiveMatchUpdateEvent` | Redis (game server heartbeat) | Updates `gameState`, `duration`, `player.connection` |
| `PlayerAbandonedEvent` | RMQ (game server) | Sets `player.abandoned = true` via `LeaveGameSessionCommand` |
| `POST /player/abandon` | REST | Sets `player.userAbandoned = true`, sends rcon abandon command |

These events mutate session state but never destroy it.

---

## Termination

All three termination paths emit an internal `SessionEndedEvent` and funnel into `SessionEndedHandler`, which is the **single point of session deletion**.

### Path 1 — Normal completion
```
GameResultsEvent (RMQ)
  → SaveGameResultsHandler   saves FinishedMatchEntity + PlayerInMatchEntity
  → SessionEndedEvent(COMPLETED)
  → SessionEndedHandler      deletes session + players
  → MatchFinishedEvent       broadcast to other services via Redis
```

### Path 2 — Players failed to load
```
MatchFailedEvent (RMQ)
  → SaveMatchFailedHandler   creates PlayerCrimeLog for each failed player
                             publishes PlayerNotLoadedEvent × N  (RMQ out, for ban service)
  → SessionEndedEvent(LOAD_FAILURE, failedPlayers[])
  → SessionEndedHandler      deletes session + players
  → ReturnGoodPlayersToQueueEvent   (RMQ out, carries steamIds of players who loaded OK)
```

### Path 3 — Server crash
```
GameServerStoppedEvent (Redis, from sidecar)   ─┐
  OR                                             ├→ SessionEndedEvent(CRASHED)
ServerStatusEvent(running=false) (Redis)        ─┘    → SessionEndedHandler   deletes session + players
                                                       → MatchFinishedEvent
```

---

## Idempotency

The sidecar always emits `GameServerStoppedEvent` when a server stops — including after a graceful match end. `SessionEndedHandler` handles this safely: if no session exists for the given server URL it logs and returns without emitting any downstream event. Concurrent termination signals are also safe because only the first one finds a session to delete.

---

## Downstream events reference

| Event | Transport | Emitted when |
|-------|-----------|--------------|
| `MatchFinishedEvent` | Redis out | COMPLETED or CRASHED |
| `ReturnGoodPlayersToQueueEvent` | RMQ out | LOAD_FAILURE — queue service re-queues these players |
| `PlayerNotLoadedEvent` | RMQ out | LOAD_FAILURE — ban service records load failure per player |
| `MatchStartedEvent` | Redis out | Session created (`AssignStartedServerHandler`) |

---

## Key files

| File | Role |
|------|------|
| `gameserver/event/session-ended.event.ts` | Internal termination event |
| `gameserver/event-handler/session-ended.handler.ts` | Deletes session, dispatches downstream |
| `gameserver/command/AssignStartedServer/` | Creates session on server start |
| `gameserver/command/SaveGameResults/` | Triggers COMPLETED |
| `gameserver/command/SaveMatchFailed/` | Triggers LOAD_FAILURE |
| `session/session-redis.listener.ts` | Converts sidecar `GameServerStoppedEvent` → CRASHED |
| `gameserver/event-handler/server-status.handler.ts` | Converts `ServerStatusEvent(running=false)` → CRASHED |
