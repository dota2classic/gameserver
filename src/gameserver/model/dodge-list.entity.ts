import { CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity("dodge_list_entry")
export class DodgeListEntity {
  @PrimaryColumn({
    name: "steam_id",
  })
  steamId: string;

  @PrimaryColumn({
    name: "dodged_steam_id",
  })
  dodgedSteamId: string;

  @CreateDateColumn({
    name: "created_at",
  })
  createdAt: Date;
}
