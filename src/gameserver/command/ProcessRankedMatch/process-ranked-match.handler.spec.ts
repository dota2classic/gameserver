import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus, EventBus } from '@nestjs/cqrs';
import { clearRepositories, TestEnvironment } from '@test/cqrs';
import { ProcessRankedMatchHandler } from 'gameserver/command/ProcessRankedMatch/process-ranked-match.handler';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { ProcessRankedMatchCommand } from 'gameserver/command/ProcessRankedMatch/process-ranked-match.command';
import { arrayOf, randomUser } from '@test/values';
import { Entities, testDbConfig } from 'util/typeorm-config';
import { GameServerService } from 'gameserver/gameserver.service';
import { TestDataService } from '@test/test-util';
import { Connection, Repository } from 'typeorm';
import { VersionPlayer } from 'gameserver/entity/VersionPlayer';
import { Dota2Version } from 'gateway/shared-types/dota2version';

describe('ProcessRankedMatchHandler', () => {
  let ebus: EventBus;
  let cbus: CommandBus;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot(testDbConfig),
        TypeOrmModule.forFeature(Entities),
      ],
      providers: [
        ProcessRankedMatchHandler,
        GameServerService,
        ...TestEnvironment(),
      ],
    }).compile();

    cbus = module.get<CommandBus>(CommandBus);
    ebus = module.get<EventBus>(EventBus);

    cbus.register([ProcessRankedMatchHandler]);
  });

  beforeEach(async () => {
    await module.get(TestDataService).init();
  });

  afterEach(() => {
    clearRepositories();
    module.get(Connection).synchronize(true);
  });

  it('should update mmrs', async () => {
    const winners = arrayOf(5).map(() => randomUser());
    const losers = arrayOf(5).map(() => randomUser());

    await cbus.execute(new ProcessRankedMatchCommand(winners, losers));

    const rep = module.get<Repository<VersionPlayer>>(
      getRepositoryToken(VersionPlayer),
    );
    for (let i = 0; i < winners.length; i++) {
      expect(
        await rep.findOne({
          steam_id: winners[i].value,
          version: Dota2Version.Dota_681,
        }),
      ).toEqual({
        steam_id: winners[i].value,
        mmr: VersionPlayer.STARTING_MMR + 25,
        version: Dota2Version.Dota_681,
      });
    }
    for (let i = 0; i < losers.length; i++) {
      expect(
        await rep.findOne({
          steam_id: losers[i].value,
          version: Dota2Version.Dota_681,
        }),
      ).toEqual({
        steam_id: losers[i].value,
        mmr: VersionPlayer.STARTING_MMR - 25,
        version: Dota2Version.Dota_681,
      });
    }
  });
});
