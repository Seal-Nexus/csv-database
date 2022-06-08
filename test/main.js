#!/usr/bin/env node
const path = require("path");
const database = require("../index");

let db = new database({
  //filePath: "$pid/$date/data.csv",
  filePath: "hello/world/database.csv",
  standDir: path.resolve( __dirname, "database" ),
  fileds: [
    { name: "pid",  type: "string" },
    { name: "hr",   type: "string" },
    { name: "spo2", type: "string" },
    { name: "date", type: "string" }, // user input date
    { name: "sys",  type: "string", autofill: ( ) => `${Number(new Date())}` }, // system time
  ]
});


async function main( ){
  let res = await db.write({
    pid : "p001",
    hr  : `${~~(Math.random()*30) + 70}`,
    spo2: "99",
    date: `${Number(new Date())}`,
  });
  
  console.log( res );
}


main( );