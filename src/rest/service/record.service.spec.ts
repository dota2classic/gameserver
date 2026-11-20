import { DataSource, In, Repository } from 'typeorm';
import FinishedMatchEntity from 'gameserver/model/finished-match.entity';
import PlayerInMatchEntity from 'gameserver/model/player-in-match.entity';
import { PlayerRecordType, RecordService, RecordTimespan } from 'rest/service/record.service';

describe('RecordService.getPlayerRecords', () => {
  const holderRow = (fm_id: number, steam_id: string, types: PlayerRecordType[]) => ({
    fm_id,
    steam_id,
    ...Object.fromEntries(Object.values(PlayerRecordType).map((type) => [type, types.includes(type)])),
  });

  it('returns 12 entries per period, picks the earliest tied match and loads only the picked matches', async () => {
    const overallRows = [
      holderRow(1, 'a', [PlayerRecordType.HERO_HEALING]),
      holderRow(2, 'b', [PlayerRecordType.HERO_HEALING, PlayerRecordType.KILLS]),
      holderRow(3, 'c', [PlayerRecordType.HERO_HEALING]),
    ];
    const query = jest.fn().mockResolvedValueOnce(overallRows).mockResolvedValue([]);
    const find = jest.fn(async () => [{ id: 1 }, { id: 2 }] as FinishedMatchEntity[]);
    const service = new RecordService(
      { find } as unknown as Repository<FinishedMatchEntity>,
      undefined as unknown as Repository<PlayerInMatchEntity>,
      { query } as unknown as DataSource,
    );

    const records = await service.getPlayerRecords();

    expect(find).toHaveBeenCalledWith({ where: { id: In([2, 1]) } });
    for (const span of [RecordTimespan.OVERALL, RecordTimespan.SEASON, RecordTimespan.MONTHLY, RecordTimespan.DAY]) {
      expect(records[span]).toHaveLength(12);
    }
    const overall = new Map(records[RecordTimespan.OVERALL].map((entry) => [entry.type, entry]));
    expect(overall.get(PlayerRecordType.HERO_HEALING)).toMatchObject({ steamId: 'a', match: { id: 1 } });
    expect(overall.get(PlayerRecordType.KILLS)).toMatchObject({ steamId: 'b', match: { id: 2 } });
    expect(overall.get(PlayerRecordType.GPM)).toEqual({ type: PlayerRecordType.GPM, steamId: undefined, match: undefined });
    expect(records[RecordTimespan.DAY].every((entry) => entry.match === undefined)).toBe(true);
  });
});
