const fs = require('fs');

const data = fs.readFileSync('./heroes.csv').toString();
const rows = data.split('\n').slice(1);

let insert = `insert into heroes(id, name, attribute, melee) values`;

insert += rows.map(row => {
  const [id, hero, attr, melee] = row.split(',');
  return `(${id}, '${hero}', ${attr}, ${melee})`
}).join(', ')

insert += ';';


console.log(insert)
