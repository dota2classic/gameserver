import { MigrationInterface, QueryRunner } from 'typeorm';

export class FantasyFunction1739896254921 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        const s = await queryRunner.query(`
        create or replace
        function fantasy_score(pim player_in_match) returns numeric 
language plpgsql
as 
$$
begin
return pim.kills * 0.3 + pim.deaths * -0.3 + pim.assists * 0.2 + pim.last_hits * 0.003 + pim.denies * 0.005 + pim.gpm * 0.002 + pim.xpm * 0.002 + pim.hero_healing * 0.01 + pim.hero_damage * 0.003 + pim.tower_damage * 0.01;
end;
$$;`);
        console.log("Hey,", s)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP FUNCTION IF EXISTS function fantasy_score(pim player_in_match);')
    }

}
