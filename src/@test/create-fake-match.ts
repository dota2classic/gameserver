import { Repository } from 'typeorm';
import FinishedMatchEntity from 'gameserver/model/finished-match.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GameSeasonEntity } from 'gameserver/model/game-season.entity';
import { TestingModule } from '@nestjs/testing';
import { MatchEntity } from 'gameserver/model/match.entity';
import { Dota2Version } from 'gateway/shared-types/dota2version';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';
import { Dota_GameMode } from 'gateway/shared-types/dota-game-mode';
import { DotaTeam } from 'gateway/shared-types/dota-team';
import PlayerInMatchEntity from 'gameserver/model/player-in-match.entity';

export async function createSeason(module: TestingModule) {
  const seasonRep = module.get<Repository<GameSeasonEntity>>(
    getRepositoryToken(GameSeasonEntity),
  );
  const gs3 = new GameSeasonEntity();
  gs3.id = 3;
  gs3.start_timestamp = new Date("2023-08-31 20:00:00.000000");
  gs3.version = Dota2Version.Dota_684;
  await seasonRep.save(gs3);
}

export async function createFakeMatch(
  module: TestingModule,
  winner: DotaTeam = DotaTeam.RADIANT,
  duration: number = 100
): Promise<FinishedMatchEntity> {
  const matchRep = module.get<Repository<FinishedMatchEntity>>(
    getRepositoryToken(FinishedMatchEntity),
  );

  const meRep = module.get<Repository<MatchEntity>>(
    getRepositoryToken(MatchEntity),
  );

  // seasons setup

  const me = new MatchEntity();
  me.finished = true;
  me.started = true;
  me.server = "";
  me.mode = MatchmakingMode.RANKED;
  await meRep.save(me);

  const match = new FinishedMatchEntity(
    me.id,
    winner,
    new Date().toISOString(),
    Dota_GameMode.RANKED_AP,
    MatchmakingMode.RANKED,
    duration,
    "",
  );

  await matchRep.save(match);

  return match;
}


export async function fillMatch(module: TestingModule, fm: FinishedMatchEntity, count: number = 10){
  const pRep = module.get<Repository<PlayerInMatchEntity>>(
    getRepositoryToken(PlayerInMatchEntity),
  );

  const randInt = (r: number) => Math.round(Math.random() * r)

  const pims: PlayerInMatchEntity[] = [];
  for (let i = 0; i < count; i++) {
    const pim = new PlayerInMatchEntity();
    pim.match = fm;
    pim.playerId = (Math.random() * 10000 + 1000000).toString();
    pim.abandoned = false;
    pim.denies = randInt(50)
    pim.last_hits = randInt(250)
    pim.kills = randInt(20);
    pim.deaths = randInt(10);
    pim.assists = randInt(20);
    pim.team = i < count / 2 ? DotaTeam.RADIANT : DotaTeam.DIRE;
    pim.level = randInt(25);
    pim.gpm = randInt(800);
    pim.xpm = randInt(700);
    pim.hero = 'npc_dota_hero_riki';
    pim.item0 = randInt(100)
    pim.item1 = randInt(100)
    pim.item2 = randInt(100)
    pim.item3 = randInt(100)
    pim.item4 = randInt(100)
    pim.item5 = randInt(100)
    await pRep.save(pim);
    pims.push(pim)
  }

  return pims;
}
