import { CrimeLogCreatedHandler } from "./crime-log-created.handler";
import { BanReason } from "gateway/shared-types/ban";

describe("active restricted ban reason", () => {
  it.each([BanReason.GAME_DECLINE, BanReason.LOAD_FAILURE])(
    "preserves reason while extending with %s",
    async (crimeReason) => {
      const originalEnd = Date.now() + 600000;
      const ban = {
        steam_id: "1",
        reason: BanReason.RULE_VIOLATION,
        endTime: new Date(originalEnd),
      };
      const bans = {
        findOne: jest.fn().mockResolvedValue(ban),
        save: jest.fn(),
      };
      const crimes = { find: jest.fn().mockResolvedValue([]) };
      const handler = new CrimeLogCreatedHandler(
        crimes as any,
        bans as any,
        { publish: jest.fn() } as any,
      );
      await (handler as any).applyBan("1", 60000, { crime: crimeReason }, []);
      expect(bans.save).toHaveBeenCalledWith(
        expect.objectContaining({ reason: BanReason.RULE_VIOLATION }),
      );
      expect(ban.endTime.getTime()).toBe(originalEnd + 60000);
    },
  );
});
