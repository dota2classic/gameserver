import { MatchEntity } from 'gameserver/model/match.entity';
import { GameServerSessionEntity } from 'gameserver/model/game-server-session.entity';
import { GameServerEntity } from 'gameserver/model/game-server.entity';
import { PlayerCrimeLogEntity } from 'gameserver/model/player-crime-log.entity';
import { MmrChangeLogEntity } from 'gameserver/model/mmr-change-log.entity';
import { LeaderboardView } from 'gameserver/model/leaderboard.view';
import { ItemView } from 'gameserver/model/item.view';
import { GameSeasonEntity } from 'gameserver/model/game-season.entity';
import { VersionPlayerEntity } from 'gameserver/model/version-player.entity';
import PlayerInMatchEntity from 'gameserver/model/player-in-match.entity';
import { PlayerBanEntity } from 'gameserver/model/player-ban.entity';
import { PlayerReportStatusEntity } from 'gameserver/model/player-report-status.entity';
import { PlayerReportEntity } from 'gameserver/model/player-report.entity';
import FinishedMatchEntity from 'gameserver/model/finished-match.entity';
import { ItemHeroView } from 'gameserver/model/item-hero.view';
import { AchievementEntity } from 'gameserver/model/achievement.entity';
import { MatchmakingModeMappingEntity } from 'gameserver/model/matchmaking-mode-mapping.entity';
import { PlayerIpEntity } from 'gameserver/model/player-ip.entity';
import { GameSessionPlayerEntity } from 'gameserver/model/game-session-player.entity';
import { MmrBucketView } from 'gameserver/model/mmr-bucket.view';
import { DodgeListEntity } from 'gameserver/model/dodge-list.entity';
import { RecalibrationEntity } from 'gameserver/model/recalibration.entity';

export const Entities: Function[] = [
  GameSeasonEntity,
  VersionPlayerEntity,
  MatchmakingModeMappingEntity,

  MatchEntity,
  FinishedMatchEntity,
  PlayerInMatchEntity,

  PlayerBanEntity,

  GameServerSessionEntity,
  GameSessionPlayerEntity,

  GameServerEntity,
  PlayerCrimeLogEntity,


  MmrChangeLogEntity,
  PlayerReportStatusEntity,
  PlayerReportEntity,
  AchievementEntity,

  LeaderboardView,
  MmrBucketView,


  ItemView,
  ItemHeroView,
  PlayerIpEntity,
  DodgeListEntity,
  RecalibrationEntity
];
