"use strict";
// System modules
const path = require("path");

// Third-party modules
const database = require("csv-database");

function application( params ){
  let { filePath, fileds, standDir } = params;
  // filed system config
  // NN = Not Null
  // PK = Primary Key
  // U  = Unique Key
  // AI = Auto Increment

  this.inputFileds = fileds;
  this.filedKeys = fileds.map( v=>v.name );
  this.fileds = new Object();

  this.standDir = standDir;
  this.filePath = filePath;
  this.dbs = new Object( ); // Path: new csv-dataase
  this.write = Write;

  var getdb = getdb;
  this.resolveDatabasePath = resolveDatabasePath;

  // Init
  for(let item of fileds){
    this.fileds[item.name] = item;
  }
}

function Read( ){

}

function Write( data ){
  for(let key of this.filedKeys ){
    let d = data[key];
    let filed = this.fileds[key];
    // vaild data checking 
    let dataCheckResult = dataChecking( filed, d );
    if(dataCheckResult !== true)
      return dataCheckResult;
    
    let db = this.getdb( d );
  }

  return { message:"ok" };
}

function Update( ){

}

function Delete( ){

}

function getdb( data ){
  let filePath = this.filePath;
  let dbPath = resolveDatabasePath( filePath, data );
  let db = this.dbs[filePath];
  if( db )
    return db;
}

// common functions
function dataChecking( filed, data ){
  if( data === undefined ){
    data = autofillValue( filed );
  }

  if( checkEmptyRule( filed ) === true && data === undefined ){
    return { error:"data is missing" };
  }
  // Pass the data checking
  //if( typeof data !== filed['type'] ){
  //  return { error:"Type is not matching", key };
  //}

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