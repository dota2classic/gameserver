import { Injectable, Logger } from '@nestjs/common';
import { VersionPlayerEntity } from 'gameserver/model/version-player.entity';
import { fetchWithRetry } from 'util/fetchWithRetry';
import { lerp } from 'util/lerp';

export interface DotaPlayerProfile {
  solo_competitive_rank: number;
  competitive_rank: number;
  rank_tier: number;
  leaderboard_rank: number;
  profile: {
    account_id: number;
    personaname: string;
    name: string;
    plus: boolean;
    cheese: number;
    steamid: string;
    avatar: string;
    avatarmedium: string;
    avatarfull: string;
    profileurl: string;
    last_login: string;
    loccountrycode: string;
    is_contributor: boolean;
    is_subscriber: boolean;
  };
}
// Rank tier

// 42 - archon 2

// 54 = legend 4

// 64 = ancient 4

// 72 = divine x

// 80 = titan 2k

@Injectable()
export class StartingMmrService {
  private logger = new Logger(StartingMmrService.name);

  public async getStartingMMRForSteamId(steamId: string) {
    try {
      const profile: DotaPlayerProfile = await fetchWithRetry(
        `https://api.opendota.com/api/players/${steamId}`,
      ).then((t) => t.json());
      const mmr = Math.round(this.mapRankTierToMmr(profile.rank_tier));
      if (Number.isNaN(mmr)) {
        throw "Invalid mmr";
      }
      return mmr;
    } catch (e) {
      this.logger.error(
        `Error getting starting mmr for player ${steamId}! Falling back to static constant`,
        e,
      );
      return VersionPlayerEntity.STARTING_MMR;
    }
  }

  private mapRankTierToMmr(rankTier: number) {
    return lerp(rankTier, 0, 80, 1000, 2800);
  }
}
