import { ForbiddenException } from '@nestjs/common';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';
import { PlayerAspect } from 'gateway/shared-types/player-aspect';
import { PlayerFeedbackService } from './player-feedback.service';
import { ProcessRankedMatchHandler } from '../command/ProcessRankedMatch/process-ranked-match.handler';
import { ProcessRankedMatchCommand } from '../command/ProcessRankedMatch/process-ranked-match.command';

describe('SECRET match policy', () => {
  const match = { id: 123, matchmaking_mode: MatchmakingMode.SECRET };

  it('rejects reports before spending report allowance or writing data', async () => {
    const reportStatus = { findOneOrFail: jest.fn() };
    const ds = {
      getRepository: () => ({ findOne: async () => match }),
      transaction: jest.fn(),
    };
    const service = new PlayerFeedbackService(
      {} as any, {} as any, reportStatus as any, ds as any, {} as any, {} as any,
    );
    await expect(service.handlePlayerReport("1", "2", 0 as unknown as PlayerAspect, match.id))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(reportStatus.findOneOrFail).not.toHaveBeenCalled();
    expect(ds.transaction).not.toHaveBeenCalled();
  });

  it('rejects a stale ranked command for a match stored as SECRET', async () => {
    const ratings = { save: jest.fn() };
    const matchRepo = { findOneOrFail: async () => match };
    const ds = { transaction: jest.fn() };
    const seasonService = { getCurrentSeason: jest.fn() };
    const handler = new ProcessRankedMatchHandler(
      ratings as any, {} as any, matchRepo as any, {} as any, {} as any,
      ds as any, seasonService as any, {} as any, {} as any,
    );
    await handler.execute(new ProcessRankedMatchCommand(match.id, ["1"], ["2"], MatchmakingMode.UNRANKED));
    expect(seasonService.getCurrentSeason).not.toHaveBeenCalled();
    expect(ratings.save).not.toHaveBeenCalled();
    expect(ds.transaction).not.toHaveBeenCalled();
  });
});
