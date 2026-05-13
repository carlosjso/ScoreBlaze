import type { ScoreboardState, ScoreboardTeamState } from "@/features/scoreboard/Scoreboard.types";

function isTemporaryGuestPlayer(player: ScoreboardTeamState["players"][number]) {
  return player.playerId === null && player.key.startsWith("guest-temp:");
}

function mergePlayersPreservingTemporaryGuests(
  currentPlayers: ScoreboardTeamState["players"],
  incomingPlayers: ScoreboardTeamState["players"],
) {
  const incomingKeys = new Set(incomingPlayers.map((player) => player.key));
  const preservedGuests = currentPlayers.filter(
    (player) => isTemporaryGuestPlayer(player) && !incomingKeys.has(player.key),
  );

  return preservedGuests.length > 0
    ? [...incomingPlayers, ...preservedGuests]
    : incomingPlayers;
}

function mergeTeamIdentityFromCurrent(current: ScoreboardTeamState, incoming: ScoreboardTeamState): ScoreboardTeamState {
  const sameTeam =
    current.id !== undefined &&
    incoming.id !== undefined &&
    current.id === incoming.id;

  if (!sameTeam) {
    return incoming;
  }

  return {
    ...incoming,
    name: current.name || incoming.name,
    logo: current.logo ?? incoming.logo,
    players: mergePlayersPreservingTemporaryGuests(current.players, incoming.players),
  };
}

function mergeTeamIdentityFromSnapshot(current: ScoreboardTeamState, snapshot: ScoreboardTeamState): ScoreboardTeamState {
  const sameTeam =
    current.id !== undefined &&
    snapshot.id !== undefined &&
    current.id === snapshot.id;

  return {
    ...current,
    id: snapshot.id ?? current.id,
    name: sameTeam ? snapshot.name || current.name : snapshot.name,
    logo: sameTeam ? snapshot.logo ?? current.logo : snapshot.logo,
    players: snapshot.players.length > 0
      ? mergePlayersPreservingTemporaryGuests(current.players, snapshot.players)
      : current.players,
  };
}

export function mergeRealtimeStatePreservingTeamIdentity(current: ScoreboardState, incoming: ScoreboardState): ScoreboardState {
  return {
    ...incoming,
    teamA: mergeTeamIdentityFromCurrent(current.teamA, incoming.teamA),
    teamB: mergeTeamIdentityFromCurrent(current.teamB, incoming.teamB),
  };
}

export function mergeSnapshotIdentityIntoScoreboardState(current: ScoreboardState, snapshot: ScoreboardState): ScoreboardState {
  return {
    ...current,
    teamA: mergeTeamIdentityFromSnapshot(current.teamA, snapshot.teamA),
    teamB: mergeTeamIdentityFromSnapshot(current.teamB, snapshot.teamB),
  };
}
