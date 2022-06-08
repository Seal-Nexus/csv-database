#!/usr/bin/env node
const path = require("path");
const database = require("../index");
let sample_date = `${Number(new Date("2022-01-01"))}`;
let db = new database({
  filePath: "$pid/$date",
  // filePath: "hello/world",
  fileName: "database.csv",
  standDir: path.resolve( __dirname, "database" ),
  fileds: [
    { name: "pid",  type: "string" },
    { name: "hr",   type: "string" },
    { name: "spo2", type: "string" },
    { name: "date", type: "string" }, // user input date
    { name: "sys",  type: "string", autofill: ( ) => `${Number(new Date())}` },
  ]
});


async function main( ){
  let write_res = await db.write({
    pid : "p001",
    hr  : `${~~(Math.random()*30) + 70}`,
    spo2: `${~~(Math.random()*5) + 95}`,
    date: sample_date,
  });

  let search_res = await db.read({
    pid: "p001",
    date: sample_date,
  });
  
  console.log( "[Write]", write_res );
  console.log( "[Read]", search_res );
}


main( );