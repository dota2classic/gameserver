import FinishedMatchEntity from 'gameserver/model/finished-match.entity';
import { GameSeasonEntity } from 'gameserver/model/game-season.entity';
import { MatchEntity } from 'gameserver/model/match.entity';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';
import { Dota_GameMode } from 'gateway/shared-types/dota-game-mode';
import { DotaTeam } from 'gateway/shared-types/dota-team';
import PlayerInMatchEntity from 'gameserver/model/player-in-match.entity';
import { TestEnvironment } from '@test/useFullModule';

export async function createSeason(te: TestEnvironment) {
  const seasonRep = te.repo(GameSeasonEntity);
  const gs3 = new GameSeasonEntity();
  gs3.id = 3;
  gs3.startTimestamp = new Date("2023-08-31 20:00:00.000000");
  await seasonRep.save(gs3);
}

export async function createFakeMatch(
  te: TestEnvironment,
  winner: DotaTeam = DotaTeam.RADIANT,
  mode: MatchmakingMode = MatchmakingMode.UNRANKED,
  duration: number = 100,
): Promise<FinishedMatchEntity> {
  const matchRep = te.repo(FinishedMatchEntity);

  const meRep = te.repo(MatchEntity);

  // seasons setup

  const me = new MatchEntity();
  me.finished = true;
  me.started = true;
  me.server = "";
  me.mode = mode;
  await meRep.save(me);

  const match = new FinishedMatchEntity(
    me.id,
    winner,
    new Date().toISOString(),
    Dota_GameMode.RANKED_AP,
    mode,
    duration,
    "",
    1
  );

  await matchRep.save(match);

  return match;
}

const randInt = (r: number) => Math.round(Math.random() * r);

export async function fillMatch(
  te: TestEnvironment,
  fm: FinishedMatchEntity,
  count: number = 10,
  modify: (pim: PlayerInMatchEntity) => void = () => undefined,
) {
  const pRep = te.repo(PlayerInMatchEntity);

  const pims: PlayerInMatchEntity[] = [];
  for (let i = 0; i < count; i++) {
    const pim = new PlayerInMatchEntity();
    pim.match = fm;
    pim.playerId = `${fm.id}${randInt(1000000)}${i}`;
    pim.abandoned = false;
    pim.denies = randInt(50);
    pim.last_hits = randInt(250);
    pim.kills = randInt(20);
    pim.deaths = randInt(10);
    pim.assists = randInt(20);
    pim.team = i < count / 2 ? DotaTeam.RADIANT : DotaTeam.DIRE;
    pim.level = randInt(25);
    pim.gpm = randInt(800);
    pim.xpm = randInt(700);
    pim.hero = "npc_dota_hero_riki";
    pim.item0 = randInt(100);
    pim.item1 = randInt(100);
    pim.item2 = randInt(100);
    pim.item3 = randInt(100);
    pim.item4 = randInt(100);
    pim.item5 = randInt(100);
    modify(pim);
    await pRep.save(pim);
    pims.push(pim);
  }

  return pims;
}
