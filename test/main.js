#!/usr/bin/env node
const DEBUG = require( "debug" )( "test:main" );
const path = require("path");
const database = require("../index");
let sample_date = `${Number(new Date("2022-01-02"))}`;
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
  let pid  = "p001",
      hr   = `${~~(Math.random()*30) + 70}`,
      spo2 = `${~~(Math.random()*5) + 95}`,
      date = sample_date;
  let write_res = await db.write({ 
    pid, hr, spo2, date
  });

  DEBUG( { pid, hr, spo2, date } );

  DEBUG( "[Write]", write_res );

  // let search_res = await db.read({ pid, date });
  // DEBUG( "[Read]", search_res.length );

  // let search_res_missing_key = await db.read({ pid });
  // DEBUG( "[Read multiDE]", search_res_missing_key );
}


main( );