const fs = require("fs");
async function geta(id) {
  const data = await fetch(
    "https://www.dota2.com/datafeed/herodata?language=english&hero_id=" + id,
  ).then((it) => it.json());
  const h = data.result.data.heroes[0];
  const heroRow = {
    id: h.id,
    name: h.name,
    primary_attr: h.primary_attr,
    attack_range: h.attack_range,
  };
  return heroRow;
}

async function data() {
  // fs.writeFileSync("./heroes.csv", "id,hero,primary_attr,is_melee\n", {
  //   flag: "a",
  // });
  for (let i = 24; i < 113; i++) {
    try {
      const r = await geta(i);
      fs.writeFileSync(
        "./heroes.csv",
        `${r.id},${r.name},${r.primary_attr},${r.attack_range <= 150}\n`,
        { flag: "a" },
      );
      console.log(`${i} / 113 done`);
    }catch (e) {
      console.warn(`${i} skipped`);
    }
  }
}

data();
