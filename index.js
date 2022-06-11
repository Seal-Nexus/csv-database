"use strict";
// System modules
const path = require("path");
const fs = require("fs");

// Third-party modules
const csvdb = require("csv-database");

function application( params ){
  let { fileName, filePath, fileds, standDir, delimiter } = params;
  // filed system config
  // NN = Not Null
  // PK = Primary Key
  // U  = Unique Key
  // AI = Auto Increment
  
  this.fileName    = fileName;
  this.delimiter   = delimiter || ",";
  this.filePattern = filePath.match(/\$[a-zA-Z0-9]+/g);
  this.indexed     = new Object( );

  this.filedKeys   = fileds.map( v=>v.name );
  this.fileds      = new Object( );
  this.inputFileds = fileds;

  this.standDir = standDir;
  this.filePath = filePath;
  this.dbs = new Object( ); // Path: new csv-dataase

  this.read   =   Read;
  this.write  =  Write;
  this.update = Update;
  this.delete = Delete;

  this.getdb  = getdb;
  this.resolveDatabasePath = resolveDatabasePath;

  // Init
  for(let item of fileds){
    this.fileds[item.name] = item;
  }
}

async function Read( data, filter ){
  // data is only the fileds are needed.
  let { filePattern } = this;
  let db = null;
  let missingKeys = new Array( );
  for( let key of filePattern ){
    if( data[key.substr(1)] === undefined ){
      missingKeys.push( key );
    }
  }
  
  if( missingKeys.length > 0 ){
    return {error: "missing key", key: missingKeys};
  }

  db = await this.getdb( data );
  return await db.get( filter );
}

async function ReadMultiple( data, filter ){
  let { filePattern } = this;
  let db = null;
  for( let key of filePattern ){
    if( data[key.substr(1)] === undefined ){
      return { error:"key is missing", key };
    }
  }

  db = await this.getdb( data );
  return await db.get( filter );
}

async function Write( data ){
  let { filedKeys, fileds } = this;
  let db = null;

  try{

    for(let key of filedKeys ){
      let d     =   data[key];
      let filed = fileds[key];

      // vaild data checking 
      let dataCheckResult = dataChecking( filed, d );
      if( dataCheckResult.error ){
        return dataCheckResult;
      }
      data[key] = dataCheckResult.value;
    }

    db = await this.getdb( data );
    await db.add( data );
    return { message:"ok" };
  }catch(e){
    return { error:e, message: e.message };
  }
}

async function Update( ){

}

async function Delete( ){

}

async function getdb( data ){
  let filePath = path.resolve(this.standDir, this.filePath);
  let fileName = this.fileName;
  let dbPath = resolveDatabasePath( filePath, data );
  let dbFile = path.resolve( dbPath, fileName );
  let fileds = this.filedKeys;
  let delimiter = this.delimiter;
  let db = this.dbs[dbFile];
  try{
    if( db === undefined ){
      checkFilePath( dbPath );
      db = await csvdb( dbFile, fileds, delimiter );
      this.dbs[dbFile] = db;
    }
    return db;
  }catch(e){
    throw e;
  }
}

function checkFilePath( filePath ){
  // another issues:
  // if the filePath is not start with /, it won't be treated as relative path

  let paths = [ "/" ];
  for( let p of filePath.split("/") ){
    paths.push( p );
    let _path = path.resolve( ...paths );
    if( !fs.existsSync( _path ) ){
      fs.mkdirSync( _path );
    }
  }
}

// common functions

function resolveDatabasePath( filePath, data ){
  for(let key in data){
    filePath = filePath.replace( `$${key}`, data[key] );
  }
  return filePath;
}

function dataChecking( filed, value ){
  if( value === undefined ){
    value = autofillValue( filed );
  }

  if( checkEmptyRule( filed ) === true && value === undefined ){
    return { error:"data is missing" };
  }

  // Pass the data checking
  // if( typeof data !== filed['type'] ){
  //   return { error:"Type is not matching", key };
  // }

  return { value };
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