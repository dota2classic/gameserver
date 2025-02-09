# Game session rework draft


Goals:  

GameSessionState
    Room
    ServerStarted
    GameStarted
    GameFailed
    GameComplete


```js
class GameSessionModel {
    @Column
    server_url: string;

    @PrimaryColumn
    match_id: number;

      matchId: number;
      matchmaking_mode: MatchmakingMode;
      game_mode: Dota_GameMode;
      game_state: Dota_GameRulesState;
      duration: number;
      server: string;
      timestamp: number;
}

class GameSessionPlayer {
  @ManyToOne(match_id)
  session: GameSessionModel;
  
  connected: boolean;
  
  abandoned: boolean;
}


```
