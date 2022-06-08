"use strict";
// System modules
const path = require("path");
const fs = require("fs");

// Third-party modules
const csvdb = require("csv-database");

function application( params ){
  let { filePath, fileds, standDir, delimiter } = params;
  // filed system config
  // NN = Not Null
  // PK = Primary Key
  // U  = Unique Key
  // AI = Auto Increment
  this.delimiter = delimiter || ",";
  
  this.inputFileds = fileds;
  this.filedKeys = fileds.map( v=>v.name );
  this.fileds = new Object();

  this.standDir = standDir;
  this.filePath = filePath;
  this.dbs = new Object( ); // Path: new csv-dataase

  this.write = Write;

  this.getdb = getdb;
  this.resolveDatabasePath = resolveDatabasePath;

  // Init
  for(let item of fileds){
    this.fileds[item.name] = item;
  }
}

function Read( ){

}

async function Write( data ){
  let db = null;

  for(let key of this.filedKeys ){
    let d = data[key];
    let filed = this.fileds[key];
    // vaild data checking 
    let dataCheckResult = dataChecking( filed, d );
    if(dataCheckResult !== true)
      return dataCheckResult;
    
  }

  try{
    db = await this.getdb( data );
    await db.add( data );
    return { message:"ok" };
  }catch(e){
    return { error:e.message };
  }

}

function Update( ){

}

function Delete( ){

}

async function getdb( data ){
  let filePath = path.resolve(this.standDir, this.filePath);
  let dbPath = resolveDatabasePath( filePath, data );
  let fileds = this.filedKeys;
  let delimiter = this.delimiter;
  let db = this.dbs[dbPath];
  if( db === undefined ){
    db = await csvdb( dbPath, fileds, delimiter );
    this.dbs[dbPath] = db;
  }
  return db;
}

// common functions

function resolveDatabasePath( pattern, data ){
  let filePath = pattern;
  for(let key in data){
    filePath = filePath.replace( `$${key}`, data[key] );
  }
  return filePath;
}

function dataChecking( filed, data ){
  if( data === undefined ){
    data = autofillValue( filed );
  }

  if( checkEmptyRule( filed ) === true && data === undefined ){
    return { error:"data is missing" };
  }

  // Pass the data checking
  // if( typeof data !== filed['type'] ){
  //   return { error:"Type is not matching", key };
  // }

  return true;
}

function autofillValue( filed ){
  if( typeof filed['autofill'] === "function" ){
    return filed['autofill']();
  }else if( filed['default'] !== undefined ){
    return filed['default'];
  }
  return undefined;
}

function checkEmptyRule( filed ){
  return filed['NN'] === true || 
         filed['PK'] === true || 
         filed['U']  === true;
}

module.exports = application;