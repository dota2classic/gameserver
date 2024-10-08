const cheerio = require('cheerio');
const fs = require('fs');
const cp = require('child_process');
const { performance } = require('perf_hooks');

const heroes = [
  {
    name: 'antimage',
    id: 1,
    localized_name: 'Anti-Mage',
  },
  {
    name: 'axe',
    id: 2,
    localized_name: 'Axe',
  },
  {
    name: 'bane',
    id: 3,
    localized_name: 'Bane',
  },
  {
    name: 'bloodseeker',
    id: 4,
    localized_name: 'Bloodseeker',
  },
  {
    name: 'crystal_maiden',
    id: 5,
    localized_name: 'Crystal Maiden',
  },
  {
    name: 'drow_ranger',
    id: 6,
    localized_name: 'Drow Ranger',
  },
  {
    name: 'earthshaker',
    id: 7,
    localized_name: 'Earthshaker',
  },
  {
    name: 'juggernaut',
    id: 8,
    localized_name: 'Juggernaut',
  },
  {
    name: 'mirana',
    id: 9,
    localized_name: 'Mirana',
  },
  {
    name: 'nevermore',
    id: 11,
    localized_name: 'Shadow Fiend',
  },
  {
    name: 'morphling',
    id: 10,
    localized_name: 'Morphling',
  },
  {
    name: 'phantom_lancer',
    id: 12,
    localized_name: 'Phantom Lancer',
  },
  {
    name: 'puck',
    id: 13,
    localized_name: 'Puck',
  },
  {
    name: 'pudge',
    id: 14,
    localized_name: 'Pudge',
  },
  {
    name: 'razor',
    id: 15,
    localized_name: 'Razor',
  },
  {
    name: 'sand_king',
    id: 16,
    localized_name: 'Sand King',
  },
  {
    name: 'storm_spirit',
    id: 17,
    localized_name: 'Storm Spirit',
  },
  {
    name: 'sven',
    id: 18,
    localized_name: 'Sven',
  },
  {
    name: 'tiny',
    id: 19,
    localized_name: 'Tiny',
  },
  {
    name: 'vengefulspirit',
    id: 20,
    localized_name: 'Vengeful Spirit',
  },
  {
    name: 'windrunner',
    id: 21,
    localized_name: 'Windranger',
  },
  {
    name: 'zuus',
    id: 22,
    localized_name: 'Zeus',
  },
  {
    name: 'kunkka',
    id: 23,
    localized_name: 'Kunkka',
  },
  {
    name: 'lina',
    id: 25,
    localized_name: 'Lina',
  },
  {
    name: 'lich',
    id: 31,
    localized_name: 'Lich',
  },
  {
    name: 'lion',
    id: 26,
    localized_name: 'Lion',
  },
  {
    name: 'shadow_shaman',
    id: 27,
    localized_name: 'Shadow Shaman',
  },
  {
    name: 'slardar',
    id: 28,
    localized_name: 'Slardar',
  },
  {
    name: 'tidehunter',
    id: 29,
    localized_name: 'Tidehunter',
  },
  {
    name: 'witch_doctor',
    id: 30,
    localized_name: 'Witch Doctor',
  },
  {
    name: 'riki',
    id: 32,
    localized_name: 'Riki',
  },
  {
    name: 'enigma',
    id: 33,
    localized_name: 'Enigma',
  },
  {
    name: 'tinker',
    id: 34,
    localized_name: 'Tinker',
  },
  {
    name: 'sniper',
    id: 35,
    localized_name: 'Sniper',
  },
  {
    name: 'necrolyte',
    id: 36,
    localized_name: 'Necrophos',
  },
  {
    name: 'warlock',
    id: 37,
    localized_name: 'Warlock',
  },
  {
    name: 'beastmaster',
    id: 38,
    localized_name: 'Beastmaster',
  },
  {
    name: 'queenofpain',
    id: 39,
    localized_name: 'Queen of Pain',
  },
  {
    name: 'venomancer',
    id: 40,
    localized_name: 'Venomancer',
  },
  {
    name: 'faceless_void',
    id: 41,
    localized_name: 'Faceless Void',
  },
  {
    name: 'skeleton_king',
    id: 42,
    localized_name: 'Skeleton King',
  },
  {
    name: 'death_prophet',
    id: 43,
    localized_name: 'Death Prophet',
  },
  {
    name: 'phantom_assassin',
    id: 44,
    localized_name: 'Phantom Assassin',
  },
  {
    name: 'pugna',
    id: 45,
    localized_name: 'Pugna',
  },
  {
    name: 'templar_assassin',
    id: 46,
    localized_name: 'Templar Assassin',
  },
  {
    name: 'viper',
    id: 47,
    localized_name: 'Viper',
  },
  {
    name: 'luna',
    id: 48,
    localized_name: 'Luna',
  },
  {
    name: 'dragon_knight',
    id: 49,
    localized_name: 'Dragon Knight',
  },
  {
    name: 'dazzle',
    id: 50,
    localized_name: 'Dazzle',
  },
  {
    name: 'rattletrap',
    id: 51,
    localized_name: 'Clockwerk',
  },
  {
    name: 'leshrac',
    id: 52,
    localized_name: 'Leshrac',
  },
  {
    name: 'furion',
    id: 53,
    localized_name: "Nature's Prophet",
  },
  {
    name: 'life_stealer',
    id: 54,
    localized_name: 'Lifestealer',
  },
  {
    name: 'dark_seer',
    id: 55,
    localized_name: 'Dark Seer',
  },
  {
    name: 'clinkz',
    id: 56,
    localized_name: 'Clinkz',
  },
  {
    name: 'omniknight',
    id: 57,
    localized_name: 'Omniknight',
  },
  {
    name: 'enchantress',
    id: 58,
    localized_name: 'Enchantress',
  },
  {
    name: 'huskar',
    id: 59,
    localized_name: 'Huskar',
  },
  {
    name: 'night_stalker',
    id: 60,
    localized_name: 'Night Stalker',
  },
  {
    name: 'broodmother',
    id: 61,
    localized_name: 'Broodmother',
  },
  {
    name: 'bounty_hunter',
    id: 62,
    localized_name: 'Bounty Hunter',
  },
  {
    name: 'weaver',
    id: 63,
    localized_name: 'Weaver',
  },
  {
    name: 'jakiro',
    id: 64,
    localized_name: 'Jakiro',
  },
  {
    name: 'batrider',
    id: 65,
    localized_name: 'Batrider',
  },
  {
    name: 'chen',
    id: 66,
    localized_name: 'Chen',
  },
  {
    name: 'spectre',
    id: 67,
    localized_name: 'Spectre',
  },
  {
    name: 'doom_bringer',
    id: 69,
    localized_name: 'Doom',
  },
  {
    name: 'ancient_apparition',
    id: 68,
    localized_name: 'Ancient Apparition',
  },
  {
    name: 'ursa',
    id: 70,
    localized_name: 'Ursa',
  },
  {
    name: 'spirit_breaker',
    id: 71,
    localized_name: 'Spirit Breaker',
  },
  {
    name: 'gyrocopter',
    id: 72,
    localized_name: 'Gyrocopter',
  },
  {
    name: 'alchemist',
    id: 73,
    localized_name: 'Alchemist',
  },
  {
    name: 'invoker',
    id: 74,
    localized_name: 'Invoker',
  },
  {
    name: 'silencer',
    id: 75,
    localized_name: 'Silencer',
  },
  {
    name: 'obsidian_destroyer',
    id: 76,
    localized_name: 'Outworld Devourer',
  },
  {
    name: 'lycan',
    id: 77,
    localized_name: 'Lycanthrope',
  },
  {
    name: 'brewmaster',
    id: 78,
    localized_name: 'Brewmaster',
  },
  {
    name: 'shadow_demon',
    id: 79,
    localized_name: 'Shadow Demon',
  },
  {
    name: 'lone_druid',
    id: 80,
    localized_name: 'Lone Druid',
  },
  {
    name: 'chaos_knight',
    id: 81,
    localized_name: 'Chaos Knight',
  },
  {
    name: 'meepo',
    id: 82,
    localized_name: 'Meepo',
  },
  {
    name: 'treant',
    id: 83,
    localized_name: 'Treant Protector',
  },
  {
    name: 'ogre_magi',
    id: 84,
    localized_name: 'Ogre Magi',
  },
  {
    name: 'undying',
    id: 85,
    localized_name: 'Undying',
  },
  {
    name: 'rubick',
    id: 86,
    localized_name: 'Rubick',
  },
  {
    name: 'disruptor',
    id: 87,
    localized_name: 'Disruptor',
  },
  {
    name: 'nyx_assassin',
    id: 88,
    localized_name: 'Nyx Assassin',
  },
  {
    name: 'naga_siren',
    id: 89,
    localized_name: 'Naga Siren',
  },
  {
    name: 'keeper_of_the_light',
    id: 90,
    localized_name: 'Keeper of the Light',
  },
  {
    name: 'wisp',
    id: 91,
    localized_name: 'Wisp',
  },
  {
    name: 'visage',
    id: 92,
    localized_name: 'Visage',
  },
  {
    name: 'slark',
    id: 93,
    localized_name: 'Slark',
  },
  {
    name: 'medusa',
    id: 94,
    localized_name: 'Medusa',
  },
  {
    name: 'troll_warlord',
    id: 95,
    localized_name: 'Troll Warlord',
  },
  {
    name: 'centaur',
    id: 96,
    localized_name: 'Centaur Warrunner',
  },
  {
    name: 'magnataur',
    id: 97,
    localized_name: 'Magnus',
  },
  {
    name: 'shredder',
    id: 98,
    localized_name: 'Timbersaw',
  },
  {
    name: 'bristleback',
    id: 99,
    localized_name: 'Bristleback',
  },
  {
    name: 'tusk',
    id: 100,
    localized_name: 'Tusk',
  },
  {
    name: 'skywrath_mage',
    id: 101,
    localized_name: 'Skywrath Mage',
  },
  {
    name: 'abaddon',
    id: 102,
    localized_name: 'Abaddon',
  },
  {
    name: 'elder_titan',
    id: 103,
    localized_name: 'Elder Titan',
  },
  {
    name: 'legion_commander',
    id: 104,
    localized_name: 'Legion Commander',
  },
  {
    name: 'ember_spirit',
    id: 106,
    localized_name: 'Ember Spirit',
  },
  {
    name: 'earth_spirit',
    id: 107,
    localized_name: 'Earth Spirit',
  },
  {
    name: 'abyssal_underlord',
    id: 108,
    localized_name: 'Abyssal Underlord',
  },
  {
    name: 'terrorblade',
    id: 109,
    localized_name: 'Terrorblade',
  },
  {
    name: 'phoenix',
    id: 110,
    localized_name: 'Phoenix',
  },
  {
    name: 'techies',
    id: 105,
    localized_name: 'Techies',
  },
  {
    name: 'oracle',
    id: 111,
    localized_name: 'Oracle',
  },
  {
    name: 'winter_wyvern',
    id: 112,
    localized_name: 'Winter Wyvern',
  },
  {
    name: 'arc_warden',
    id: 113,
    localized_name: 'Arc Warden',
  },
];

async function run(matchId) {
  const url = `https://dota2classic.com/Match/${matchId}`;
  console.log('SCraping');

  const $ = await cheerio.fromURL(url);

  const matchId2 = $('.match-info-id')
    .text()
    .replace('Match ID: ', '');
  const [m, s] = $('.match-info-duration')
    .text()
    .split(':')
    .map(it => it.trim())
    .map(Number);

  const duration = m * 60 + s;

  const winner = $('.match-info-radiant-victory').text().toLowerCase().includes('radiant') ? 2 : 3;

  const date = new Date($('.match-info-date time').attr('datetime'));

  const players = $('.player-row')
    .map(function(i) {
      const $el = $(this);

      const teamWrap = $el.parent().parent().parent();
      const team = teamWrap.find('.team-title').text().toLowerCase().includes('radiant') ? 2 : 3;

      const heroid = $el.find('.player-hero').data('heroid');
      const hero = `npc_dota_hero_` + heroes.find(it => it.id === heroid).name;
      const steam64 = $el
        .find('.player-name-link')
        .attr('href')
        .split('/')[2];
      const level = parseInt($el.find('.player-level').text());
      const kills = parseInt($el.find('.player-kills').text());
      const deaths = parseInt($el.find('.player-deaths').text());
      const assists = parseInt($el.find('.player-assists').text());
      const gpm = parseInt($el.find('.player-gpm').text());
      const xpm = parseInt($el.find('.player-xpm').text());
      const hd = parseInt($el.find('.player-hd').text());
      const td = parseInt($el.find('.player-td').text());
      const gold = parseInt($el.find('.player-gold').text());
      const last_hits = parseInt($el.find('.player-lasthits').text());
      const denies = parseInt($el.find('.player-denies').text());

      const itemList = $el
        .find('.player-stat-item')
        .toArray()
        .map(it => it.attribs['data-itemid'])
        .map(Number); //.map(itemid => items.find(it => it.id === itemid).name);

      const player = {
        steam64: steam64,
        playerId: (BigInt(steam64) - BigInt('76561197960265728')).toString(),
        kills,
        deaths,
        assists,
        team,
        level,
        last_hits,
        denies,
        gpm,
        xpm,
        hd,
        td,
        gold,
        hero,
        item0: itemList[0],
        item1: itemList[1],
        item2: itemList[2],
        item3: itemList[3],
        item4: itemList[4],
        item5: itemList[5],
      };

      return player;
    })
    .toArray();

  const isBotMatch = players.find(it => Number(it.steam64) <= 10);

  const match = {
    players,
    timestamp: date.getTime(),
    duration,
    server: 'dota2classic.com',
    winner: winner,
    matchmaking_mode: isBotMatch ? 7 : 1, // 1 = unranked
  };

  fs.writeFileSync(`./matches/${matchId}.json`, JSON.stringify(match));
}

async function getMatchBatch(page) {
  const { Matches } = await fetch(
    `https://dota2classic.com/API/Match/List?page=${page}`,
  ).then(it => it.json());
  return Matches.map(it => it.MatchHistory.match_id);
}

async function main() {
  const arg = process.argv[2];
  if(arg === 'main'){
    // root process orchestrates others
    console.log('Root process');
    let page = 0;

    while(page < 3000){

      const start = performance.now();

      const matches = await getMatchBatch(page);
      if(matches.length === 0) break;

      const procs = matches.map(match => {
        return new Promise((resolve, reject) => {
          const proc = cp.spawn(`node`, ['./scrapper.js', match]);
          proc.on('close', (code) => {
            if(code !== 0) {
              console.warn(`Process for matchId ${match} exited with code ${code}`);
            }
            resolve(code);
          });
        })
      });

      await Promise.all(procs);
      page++;
      const timeTaken = performance.now() - start
      console.log(`Page ${page} complete in ${timeTaken} millis`)


    }

  }else {
    const matchId = Number(arg);
    if(Number.isNaN(matchId)){
      console.error('Bad page number')
      process.exit()
    }
    console.log('Subprocess')

    run(matchId)
  }

}

// run(19913);

main()

// getMatchBatch(12).then(it => console.log(it));
