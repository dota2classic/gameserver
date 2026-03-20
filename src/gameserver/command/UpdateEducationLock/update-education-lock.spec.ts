import { testUser, useFullModule } from '@test/useFullModule';
import { MakeSureExistsHandler } from 'gameserver/command/MakeSureExists/make-sure-exists.handler';
import { MakeSureExistsCommand } from 'gameserver/command/MakeSureExists/make-sure-exists.command';
import { PlayerId } from 'gateway/shared-types/player-id';
import { PlayerServiceV2 } from 'gameserver/service/player-service-v2.service';
import { MatchAccessLevel } from 'gateway/shared-types/match-access-level';
import { UpdateEducationLockHandler } from 'gameserver/command/UpdateEducationLock/update-education-lock.handler';
import { UpdateEducationLockCommand } from 'gameserver/command/UpdateEducationLock/update-education-lock.command';
import { PlayerEducationLockEntity } from 'gameserver/model/player-education-lock.entity';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';
import { DotaTeam } from 'gateway/shared-types/dota-team';
import { createFakeMatch } from '@test/create-fake-match';
import PlayerInMatchEntity from 'gameserver/model/player-in-match.entity';

describe('Education Lock', () => {
  const te = useFullModule();

  async function makeSureExists(steamId: string): Promise<void> {
    await te
      .service(MakeSureExistsHandler)
      .execute(new MakeSureExistsCommand(new PlayerId(steamId)));
  }

  async function playBotGame(
    steamId: string,
    won: boolean,
    kda: { kills: number; deaths: number; assists: number },
    mode: MatchmakingMode = MatchmakingMode.BOTS,
  ): Promise<void> {
    const fm = await createFakeMatch(te, won ? DotaTeam.RADIANT : DotaTeam.DIRE, mode);

    const pim = new PlayerInMatchEntity();
    pim.match = fm;
    pim.partyIndex = 0;
    pim.playerId = steamId;
    pim.abandoned = false;
    pim.team = DotaTeam.RADIANT;
    pim.kills = kda.kills;
    pim.deaths = kda.deaths;
    pim.assists = kda.assists;
    pim.denies = 0;
    pim.last_hits = 0;
    pim.gpm = 400;
    pim.xpm = 400;
    pim.hero = 'npc_dota_hero_riki';
    pim.level = 1;
    pim.item0 = 0; pim.item1 = 0; pim.item2 = 0;
    pim.item3 = 0; pim.item4 = 0; pim.item5 = 0;
    await te.repo<PlayerInMatchEntity>(PlayerInMatchEntity).save(pim);

    await te
      .service(UpdateEducationLockHandler)
      .execute(new UpdateEducationLockCommand([steamId]));
  }

  async function getStatus(steamId: string) {
    return te.service(PlayerServiceV2).getEducationStatus(steamId);
  }

  async function getLock(steamId: string): Promise<PlayerEducationLockEntity | null> {
    return te
      .repo<PlayerEducationLockEntity>(PlayerEducationLockEntity)
      .findOne({ where: { steamId } });
  }

  it('should spin up', () => {});

  // --- Backward compatibility ---

  it('existing player without a lock gets full access', async () => {
    const steamId = testUser();
    // No MakeSureExists called — simulates pre-feature player
    const { accessLevel, readinessProgress } = await getStatus(steamId);
    expect(accessLevel).toEqual(MatchAccessLevel.HUMAN_GAMES);
    expect(readinessProgress).toEqual(1);
  });

  // --- Lock creation ---

  it('MakeSureExists creates a lock for a new player', async () => {
    const steamId = testUser();
    await makeSureExists(steamId);

    const lock = await getLock(steamId);
    expect(lock).not.toBeNull();
    expect(lock!.resolved).toBe(false);
    expect(lock!.requiredGames).toBe(1);
    expect(lock!.totalBotGames).toBe(0);
  });

  it('MakeSureExists is idempotent — calling twice does not fail or duplicate lock', async () => {
    const steamId = testUser();
    await makeSureExists(steamId);
    await makeSureExists(steamId);
    const lock = await getLock(steamId);
    expect(lock).not.toBeNull();
    expect(lock!.requiredGames).toBe(1);
  });

  // --- Access levels before any games ---

  it('new player with 0 bot games gets EDUCATION access', async () => {
    const steamId = testUser();
    await makeSureExists(steamId);

    const { accessLevel, readinessProgress } = await getStatus(steamId);
    expect(accessLevel).toEqual(MatchAccessLevel.EDUCATION);
    expect(readinessProgress).toEqual(0);
  });

  // --- First game paths ---

  it('new player graduates immediately after 1 game with great performance', async () => {
    const steamId = testUser();
    await makeSureExists(steamId);
    // kda = (10+5)/1 = 15, winrate = 1.0 — both well above thresholds
    await playBotGame(steamId, true, { kills: 10, deaths: 1, assists: 5 });

    const { accessLevel, readinessProgress } = await getStatus(steamId);
    expect(accessLevel).toEqual(MatchAccessLevel.HUMAN_GAMES);
    expect(readinessProgress).toEqual(1);
  });

  it('bad 1st game gives SIMPLE_MODES and steps required_games from 1 to 3', async () => {
    const steamId = testUser();
    await makeSureExists(steamId);
    // kda = 0/10 = 0, winrate = 0 — both below thresholds
    await playBotGame(steamId, false, { kills: 0, deaths: 10, assists: 0 });

    const lock = await getLock(steamId);
    expect(lock!.resolved).toBe(false);
    expect(lock!.requiredGames).toBe(3);

    const { accessLevel } = await getStatus(steamId);
    expect(accessLevel).toEqual(MatchAccessLevel.SIMPLE_MODES);
  });

  // --- Snapshot fields ---

  it('lock snapshots kda and winrate after each game', async () => {
    const steamId = testUser();
    await makeSureExists(steamId);
    // kda = (10+4)/2 = 7
    await playBotGame(steamId, true, { kills: 10, deaths: 2, assists: 4 });

    const lock = await getLock(steamId);
    expect(lock!.totalBotGames).toBe(1);
    expect(lock!.recentKda).toBeCloseTo(7.0);
    expect(lock!.recentWinrate).toBeCloseTo(1.0);
  });

  // --- Progress bar ---

  it('progress bar reflects games played vs required_games', async () => {
    const steamId = testUser();
    await makeSureExists(steamId);
    // Game 1: bad → required steps to 3
    await playBotGame(steamId, false, { kills: 0, deaths: 10, assists: 0 });
    // Game 2: also bad
    await playBotGame(steamId, false, { kills: 0, deaths: 10, assists: 0 });

    // 2 games played out of 3 required
    const { readinessProgress } = await getStatus(steamId);
    expect(readinessProgress).toBeCloseTo(2 / 3);
  });

  // --- Graduation after multiple games ---

  it('graduates after hitting required_games with good recent performance', async () => {
    const steamId = testUser();
    await makeSureExists(steamId);
    // Game 1: bad → required=3
    await playBotGame(steamId, false, { kills: 0, deaths: 10, assists: 0 });
    // Games 2–3: excellent
    await playBotGame(steamId, true, { kills: 8, deaths: 1, assists: 4 }); // kda=12
    await playBotGame(steamId, true, { kills: 8, deaths: 1, assists: 4 }); // kda=12
    // Recent 3 games: kda = (0+12+12)/3 = 8 > 2.0, wr = 2/3 ≈ 0.67 > 0.6

    const { accessLevel } = await getStatus(steamId);
    expect(accessLevel).toEqual(MatchAccessLevel.HUMAN_GAMES);
  });

  // --- Recent window ---

  it('old bad games fall out of the recent window — player can recover', async () => {
    const steamId = testUser();
    await makeSureExists(steamId);
    // Game 1: bad → required=3
    await playBotGame(steamId, false, { kills: 0, deaths: 10, assists: 0 });
    // Games 2–3: bad → required=7
    await playBotGame(steamId, false, { kills: 0, deaths: 10, assists: 0 });
    await playBotGame(steamId, false, { kills: 0, deaths: 10, assists: 0 });
    // Games 4–7: excellent (these fill the recent window=5, pushing game 3 out)
    for (let i = 0; i < 4; i++) {
      await playBotGame(steamId, true, { kills: 10, deaths: 1, assists: 5 }); // kda=15
    }
    // At game 7: recent 5 = [game3(kda=0,L), game4(kda=15,W), game5, game6, game7]
    // avg_kda = (0+15+15+15+15)/5 = 12 > 2.0, wr = 4/5 = 0.8 > 0.6

    const { accessLevel } = await getStatus(steamId);
    expect(accessLevel).toEqual(MatchAccessLevel.HUMAN_GAMES);
  });

  // --- Turbo mode ---

  it('turbo games (mode 13) also count toward the lock', async () => {
    const steamId = testUser();
    await makeSureExists(steamId);
    await playBotGame(steamId, true, { kills: 10, deaths: 1, assists: 5 }, MatchmakingMode.TURBO);

    const lock = await getLock(steamId);
    expect(lock!.totalBotGames).toBe(1);
    expect(lock!.resolved).toBe(true);
  });

  // --- Admin demotion ---

  it('admin can force player back by bumping required_games and clearing resolved', async () => {
    const steamId = testUser();
    await makeSureExists(steamId);
    // Graduate
    await playBotGame(steamId, true, { kills: 10, deaths: 1, assists: 5 });
    expect((await getStatus(steamId)).accessLevel).toEqual(MatchAccessLevel.HUMAN_GAMES);

    // Admin demotes
    await te
      .repo<PlayerEducationLockEntity>(PlayerEducationLockEntity)
      .update({ steamId }, { resolved: false, requiredGames: 5 });

    const { accessLevel, readinessProgress } = await getStatus(steamId);
    expect(accessLevel).toEqual(MatchAccessLevel.SIMPLE_MODES);
    // 1 bot game played, 5 required
    expect(readinessProgress).toBeCloseTo(1 / 5);
  });

  // --- Resolved lock is sticky ---

  it('resolved lock stays resolved — subsequent bad games do not regress it', async () => {
    const steamId = testUser();
    await makeSureExists(steamId);
    await playBotGame(steamId, true, { kills: 10, deaths: 1, assists: 5 });
    expect((await getLock(steamId))!.resolved).toBe(true);

    // Play more bad games
    await playBotGame(steamId, false, { kills: 0, deaths: 10, assists: 0 });
    await playBotGame(steamId, false, { kills: 0, deaths: 10, assists: 0 });

    expect((await getLock(steamId))!.resolved).toBe(true);
    expect((await getStatus(steamId)).accessLevel).toEqual(MatchAccessLevel.HUMAN_GAMES);
  });

  // --- New season: MakeSureExists re-runs for existing players ---

  it('experienced player (has bot wins) gets resolved=true lock on new season start', async () => {
    const steamId = testUser();
    // Player already has bot wins in DB — simulates history before this season
    await playBotGame(steamId, true, { kills: 10, deaths: 1, assists: 5 });

    // New season starts: MakeSureExists is called, no VersionPlayerEntity for new season yet
    await makeSureExists(steamId);

    const lock = await getLock(steamId);
    expect(lock).not.toBeNull();
    expect(lock!.resolved).toBe(true);
  });

  it('brand new player with no history gets resolved=false lock', async () => {
    const steamId = testUser();
    await makeSureExists(steamId);

    const lock = await getLock(steamId);
    expect(lock!.resolved).toBe(false);
  });

  it('player with more total games than required still steps up the ladder on failure', async () => {
    const steamId = testUser();
    // Simulate pre-existing bad bot games from a previous season (no lock yet)
    // Use raw DB inserts via playBotGame — but since there's no lock yet,
    // UpdateEducationLock is a no-op. We just need the finished_match rows to exist.
    const pimRepo = te.repo<PlayerInMatchEntity>(PlayerInMatchEntity);
    for (let i = 0; i < 5; i++) {
      const fm = await createFakeMatch(te, DotaTeam.DIRE, MatchmakingMode.BOTS);
      const pim = new PlayerInMatchEntity();
      pim.match = fm; pim.partyIndex = 0; pim.playerId = steamId;
      pim.abandoned = false; pim.team = DotaTeam.RADIANT;
      pim.kills = 0; pim.deaths = 10; pim.assists = 0; pim.level = 1;
      pim.denies = 0; pim.last_hits = 0; pim.gpm = 0; pim.xpm = 0;
      pim.hero = 'npc_dota_hero_riki';
      pim.item0 = 0; pim.item1 = 0; pim.item2 = 0;
      pim.item3 = 0; pim.item4 = 0; pim.item5 = 0;
      await pimRepo.save(pim);
    }

    // New season: MakeSureExists creates lock. No bot wins → resolved=false, required=1.
    // But queryBotStats will see total=5 on the very next game played.
    await makeSureExists(steamId);

    // Game 6 (bad): total=6, window=[L,L,L,L,L], need 3 wins → required = 6+3 = 9
    // Old bug: 6 === 1 → false → stuck forever at required=1
    await playBotGame(steamId, false, { kills: 0, deaths: 10, assists: 0 });
    expect((await getLock(steamId))!.requiredGames).toBe(9);

    // Game 7 (bad): total=7 < required=9 → no step-up
    await playBotGame(steamId, false, { kills: 0, deaths: 10, assists: 0 });
    expect((await getLock(steamId))!.requiredGames).toBe(9);
  });

  // --- Old player plays bot games ---

  it('old player without a lock plays a bot game — still gets full access', async () => {
    const steamId = testUser();
    // No lock created — simulates pre-feature player
    await playBotGame(steamId, false, { kills: 0, deaths: 10, assists: 0 });

    // Handler finds no lock → skips → no lock created
    const lock = await getLock(steamId);
    expect(lock).toBeNull();

    const { accessLevel, readinessProgress } = await getStatus(steamId);
    expect(accessLevel).toEqual(MatchAccessLevel.HUMAN_GAMES);
    expect(readinessProgress).toEqual(1);
  });

  it('old player with a resolved lock plays terrible bot games — access is not lost', async () => {
    const steamId = testUser();
    await makeSureExists(steamId);
    // Graduate first
    await playBotGame(steamId, true, { kills: 10, deaths: 1, assists: 5 });
    expect((await getLock(steamId))!.resolved).toBe(true);

    // Now plays terribly
    await playBotGame(steamId, false, { kills: 0, deaths: 20, assists: 0 });
    await playBotGame(steamId, false, { kills: 0, deaths: 20, assists: 0 });

    const { accessLevel } = await getStatus(steamId);
    expect(accessLevel).toEqual(MatchAccessLevel.HUMAN_GAMES);
  });

  // --- Dynamic required_games formula ---

  it('required_games is computed from minimum wins needed, not a fixed ladder', async () => {
    const steamId = testUser();
    await makeSureExists(steamId);

    // Game 1 (L): window=[L], need [L,W,W]→2/3≥0.6, k=2 → required = 1+2 = 3
    await playBotGame(steamId, false, { kills: 0, deaths: 10, assists: 0 });
    expect((await getLock(steamId))!.requiredGames).toBe(3);

    // Games 2–3 (L, L): total=3, window=[L,L,L], need 3 wins to get 3/5 → required = 3+3 = 6
    await playBotGame(steamId, false, { kills: 0, deaths: 10, assists: 0 });
    await playBotGame(steamId, false, { kills: 0, deaths: 10, assists: 0 });
    expect((await getLock(steamId))!.requiredGames).toBe(6);

    // Games 4–6 (L, L, L): total=6, window=[L,L,L,L,L], still need 3 wins → required = 6+3 = 9
    await playBotGame(steamId, false, { kills: 0, deaths: 10, assists: 0 });
    await playBotGame(steamId, false, { kills: 0, deaths: 10, assists: 0 });
    await playBotGame(steamId, false, { kills: 0, deaths: 10, assists: 0 });
    expect((await getLock(steamId))!.requiredGames).toBe(9);
  });
});
