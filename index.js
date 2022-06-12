"use strict";
// System modules
const DEBUG = require('debug')("DB");
const crypto = require("crypto");
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
  this.indexHash   = sha256( JSON.stringify( fileds ) );

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

  // Init
  for(let item of fileds){
    this.fileds[item.name] = item;
  }
}

async function Read( data ){
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
    return ReadMultiple( data, filePattern, missingKeys );
    // return {error: "missing key", key: missingKeys};
  }

  db = await this.getdb( data );
  return (await db.get( data ));
}

async function ReadMultiple( data, filePattern, missing ){
  let db = null;
  DEBUG( 'Missing key:', filePattern );
  return null;
  // db = await this.getdb( data );
  // return await db.get( data );
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
  let filePath = path.join(this.standDir, this.filePath);
  let fileName = this.fileName;
  let fileds = this.filedKeys;
  let delimiter = this.delimiter;
  let indexHash = this.indexHash;
  try{
    // Security issues: with data or filePath include a slash, also can be resolved.
    let dbPath = pathConstructor( filePath, data, indexHash );
    let dbFile = path.resolve( dbPath, fileName );
    let db = this.dbs[dbFile];
    if( db === undefined ){
      db = await csvdb( dbFile, fileds, delimiter );
      this.dbs[dbFile] = db;
    }
    return db;
  }catch(e){
    throw e;
  }
}

// common functions

function pathConstructor( filePath, data, hash ){
  // another issues:
  // if the filePath is not start with /, it won't be treated as relative path

  let paths = [ ];
  for( let p of filePath.split("/") ){
    let key = p.match(/\$([a-zA-Z0-9]+)/);
    if( key ){
      // replace the p with the data
      p = p.replace( key[0], data[key[1]] );
      // create a new index file or read the index file
      let indexFile = path.join( paths.join("/"), `${key[1]}-${hash}` );
      DEBUG( "indexFile:", indexFile );
      let content = [ ];
      if( fs.existsSync( indexFile ) ){
        content = fs.readFileSync( indexFile, "utf8" ).split("\n");
      }
      content.push( data[key[1]] );
      fs.writeFileSync( indexFile, content.join("\n") );
    }
    paths.push( p );
    let _path = paths.join("/");
    if( p && !fs.existsSync( _path ) ){
      DEBUG("Resolve path progress:", paths);
      fs.mkdirSync( _path );
    }
  }

  return paths.join("/");
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

// create a function genrate sha256 hash from the message
function sha256( message ){
  let hash = crypto.createHash('sha256');
  hash.update( message );
  return hash.digest('hex');
}

module.exports = application;