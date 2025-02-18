import { MatchController } from './match.controller';
import { createFakeMatch, fillMatch } from '@test/create-fake-match';
import * as request from 'supertest';
import { makePage } from 'gateway/util/make-page';
import { useFullModule } from '@test/useFullModule';
import { MatchMapper } from 'rest/match/match.mapper';

describe("MatchController", () => {
  const te = useFullModule();

  it("should spin up", () => {});

  describe("/GET /match/:id", () => {
    it(`should return mapped match if exists`, async () => {
      const fm = await createFakeMatch(te);
      const pims = await fillMatch(te, fm, 10);

      await request(te.app.getHttpServer())
        .get(`/match/${fm.id}`)
        .expect(200)
        .expect(
          JSON.stringify(
            te.service(MatchMapper).mapMatch({ ...fm, players: pims }),
          ),
        );
    });

    it(`should return 404 and an error if match doesn't exist`, async () => {
      const matchId = -2;

      await request(te.app.getHttpServer())
        .get(`/match/${matchId}`)
        .expect(404);
    });
  });

  describe("/GET /match/player/:id", () => {
    it(`should return matches for given player`, async () => {
      const fm = await createFakeMatch(te);
      const pims = await fillMatch(te, fm, 10);

      await request(te.app.getHttpServer())
        .get(`/match/player/${pims[0].playerId}`)
        .query({ page: 0 })
        .expect(200)
        .expect(
          JSON.stringify(
            await makePage(
              [te.service(MatchMapper).mapMatch({ ...fm, players: [pims[0]] })],
              1,
              0,
              25,
              (t) => t,
            ),
          ),
        );
    });

    it(`should return empty if no matches available for player`, async () => {
      const fm = await createFakeMatch(te);
      const pims = await fillMatch(te, fm, 10);

      await request(te.app.getHttpServer())
        .get(`/match/player/-41234213`)
        .query({ page: 0 })
        .expect(200)
        .expect(JSON.stringify(await makePage([], 0, 0, 25, (t) => t)));
    });
  });
});
