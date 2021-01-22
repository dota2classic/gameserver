import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus, EventBus } from '@nestjs/cqrs';
import { clearRepositories, TestEnvironment } from '@test/cqrs';
import { ProcessRankedMatchHandler } from 'gameserver/command/ProcessRankedMatch/process-ranked-match.handler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { randomUser } from '@test/values';
import { Entities, testDbConfig } from 'util/typeorm-config';
import { GameServerService } from 'gameserver/gameserver.service';
import { TestDataService } from '@test/test-util';
import { Connection } from 'typeorm';

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
    // await module.get(TestDataService).init();
  });

  afterEach(() => {
    clearRepositories();
    // module.get(Connection).synchronize(true);
  });

  // it('should update mmrs', async () => {
  //   const winners = arrayOf(5).map(() => randomUser());
  //   const losers = arrayOf(5).map(() => randomUser());
  //
  //   const s = [...winners, ...losers];
  //   await Promise.all(
  //     s.map(async u => {
  //       const s = module
  //         .get(Connection)
  //         .getRepository<VersionPlayer>(VersionPlayer);
  //       const p = new VersionPlayer();
  //       p.mmr = 2000; // + Math.random() * 300 - 150;
  //       p.steam_id = u.value;
  //       p.version = Dota2Version.Dota_681;
  //
  //       await s.save(p);
  //     }),
  //   );
  //
  //
  //
  //   await cbus.execute(new ProcessRankedMatchCommand(winners, losers));
  //
  //   const rep = module.get<Repository<VersionPlayer>>(
  //     getRepositoryToken(VersionPlayer),
  //   );
  //   for (let i = 0; i < winners.length; i++) {
  //     expect(
  //       await rep.findOne({
  //         steam_id: winners[i].value,
  //         version: Dota2Version.Dota_681,
  //       }),
  //     ).toEqual({
  //       steam_id: winners[i].value,
  //       mmr: VersionPlayer.STARTING_MMR + 50,
  //       version: Dota2Version.Dota_681,
  //     });
  //   }
  //   for (let i = 0; i < losers.length; i++) {
  //     expect(
  //       await rep.findOne({
  //         steam_id: losers[i].value,
  //         version: Dota2Version.Dota_681,
  //       }),
  //     ).toEqual({
  //       steam_id: losers[i].value,
  //       mmr: VersionPlayer.STARTING_MMR - 50,
  //       version: Dota2Version.Dota_681,
  //     });
  //   }
  // });

  it('should do calc default mmr change(no average diff)', () => {
    const s = module.get(ProcessRankedMatchHandler);

    const winnerMMR = 2000 * 5;
    const loserMMR = 2000 * 5;

    const averageDiff = Math.abs(winnerMMR / 5 - loserMMR / 5);

    const diffDeviationFactor =
      (ProcessRankedMatchHandler.AVERAGE_DEVIATION_MAX *
        Math.min(averageDiff, ProcessRankedMatchHandler.AVERAGE_DIFF_CAP)) /
      ProcessRankedMatchHandler.AVERAGE_DIFF_CAP;

    expect(
      s.computeMMRChange(randomUser().value, 15, true, diffDeviationFactor),
    ).toEqual(25);

    expect(
      s.computeMMRChange(randomUser().value, 15, false, diffDeviationFactor),
    ).toEqual(-25);
  });

  it('should do calc default mmr change(with average diff)', () => {
    const s = module.get(ProcessRankedMatchHandler);

    const winnerMMR = 2100 * 5;
    const loserMMR = 2000 * 5;

    const diffDeviationFactor = s.calculateMmrDeviation(
      winnerMMR / 5,
      loserMMR / 5,
    );

    const winnerChange = s.computeMMRChange(
      randomUser().value,
      15,
      true,
      diffDeviationFactor,
    );

    expect(winnerChange).toBeLessThan(25);
    expect(winnerChange).toBeGreaterThan(10);

    const loserChange = s.computeMMRChange(
      randomUser().value,
      15,
      false,
      diffDeviationFactor,
    );
    expect(loserChange).toBeGreaterThan(-25);
    expect(loserChange).toBeLessThan(-10);
  });

  it('should do calc default mmr change(with average diff), but loser mmr > winner mmr', () => {
    const s = module.get(ProcessRankedMatchHandler);

    const winnerMMR = 2000 * 5;
    const loserMMR = 2100 * 5;

    const diffDeviationFactor = s.calculateMmrDeviation(
      winnerMMR / 5,
      loserMMR / 5,
    );

    const winnerChange = s.computeMMRChange(
      randomUser().value,
      15,
      true,
      diffDeviationFactor,
    );

    expect(winnerChange).toBeGreaterThan(25);
    expect(winnerChange).toBeLessThan(40);

    const loserChange = s.computeMMRChange(
      randomUser().value,
      15,
      false,
      diffDeviationFactor,
    );
    expect(loserChange).toBeLessThan(-25);
    expect(loserChange).toBeGreaterThan(-40);
  });

  it('should do calc default mmr change(with average diff), edge case 1', () => {
    const s = module.get(ProcessRankedMatchHandler);

    const winnerMMR = 2000 * 5;
    const loserMMR = 2900 * 5;


    // how much to add to remove from winners and add to losers
    const diffDeviationFactor = s.calculateMmrDeviation(
      winnerMMR / 5,
      loserMMR / 5,
    );

    const winnerChange = s.computeMMRChange(
      randomUser().value,
      15,
      true,
      diffDeviationFactor,
    );

    expect(winnerChange).toBeGreaterThan(40);
    expect(winnerChange).toBeLessThan(50);

    const loserChange = s.computeMMRChange(
      randomUser().value,
      15,
      false,
      diffDeviationFactor,
    );
    expect(loserChange).toBeGreaterThan(-50);
    expect(loserChange).toBeLessThan(-40);
  });

  it('should do calc default mmr change(with average diff), edge case 2', () => {
    const s = module.get(ProcessRankedMatchHandler);

    const winnerMMR = 2900 * 5;
    const loserMMR = 2000 * 5;

    const diffDeviationFactor = s.calculateMmrDeviation(
      winnerMMR / 5,
      loserMMR / 5,
    );

    const winnerChange = s.computeMMRChange(
      randomUser().value,
      15,
      true,
      diffDeviationFactor,
    );

    expect(winnerChange).toBeGreaterThan(0);
    expect(winnerChange).toBeLessThan(10);

    const loserChange = s.computeMMRChange(
      randomUser().value,
      15,
      false,
      diffDeviationFactor,
    );
    expect(loserChange).toBeLessThan(0);
    expect(loserChange).toBeGreaterThan(-10);
  });
});
