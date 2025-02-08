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
}

class GameSessionPlayer {
  @ManyToOne(match_id)
  session: GameSessionModel;
  
  connected: boolean;
  
  abandoned: boolean;
}


```
