#!/usr/bin/env node
const DEBUG = require( "debug" )( "test:main" );
const path = require("path");
const database = require("../index");
const csvdb = require("csv-database");
let sample_date = `2022-01-01`;
let db = new database({
  filePath: "common",
  fileName: "users.csv",
  standDir: path.resolve( __dirname, "database" ),
  fileds: [
    { name: "pid",  type: "string" },
    { name: "username",   type: "string" },
    { name: "password", type: "string" },
    { name: "date", type: "string" }, // user input date
    { name: "sys",  type: "string", autofill: ( ) => `${Number(new Date())}` },
  ]
});


async function main( ){
  let pid  = "p001",
      username   = `${~~(Math.random()*30) + 70}`,
      password =  `${~~(Math.random()*5) + 95}`,
      date = sample_date;
  let res = await db.update({ pid }, { username, password, date });
  console.log( res );
}


main( );