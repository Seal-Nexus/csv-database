#!/usr/bin/env node
const DEBUG = require( "debug" )( "test:main" );
const path = require("path");
const database = require("../index");
const csvdb = require("csv-database");
let sample_date = `${Number(new Date("2022-01-01"))}`;
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
      username   = `jack-${~~(Math.random()*0xffffff)}`,
      password =  `${~~(Math.random()*5) + 95}`,
      date = sample_date;
  let res = db.write({ pid, username, password, date });
}


main( );