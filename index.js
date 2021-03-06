"use strict";
// System modules
const DEBUG = require('debug')("DB");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");

// Third-party modules
const csvdb = require("csv-database");

function application( params ){
  let { fileName, filePath, fields, standDir, delimiter } = params;
  // field system config
  // NN = Not Null
  // PK = Primary Key
  // U  = Unique Key
  // AI = Auto Increment
  if( fileName === undefined ){
    throw new Error("fileName is required");
  }
  if( standDir === undefined ){
    throw new Error("standDir is required");
  }
  if( fields === undefined ){
    throw new Error("fields is required");
  }

  
  this.fileName    = fileName;
  this.delimiter   = delimiter || ",";
  this.filePattern = filePath.match(/\$[a-zA-Z0-9]+/g);
  this.indexHash   = sha256( JSON.stringify( fields ) );

  this.fieldKeys   = fields.map( v=>v.name );
  this.fields      = new Object( );
  this.inputFileds = fields;

  this.standDir = standDir;
  this.filePath = filePath || "";
  this.dbs = new Object( ); // Path: new csv-dataase

  this.read   =   Read;
  this.write  =  Write;
  this.update = Update;
  this.delete = Delete;
  
  this.readMulti = ReadMultiple; // extend the read function

  this.getdb  = getdb;

  // Init
  for(let item of fields){
    this.fields[item.name] = item;
  }
}

async function Read( data, substitute ){
  // Not the best solution
  data = data || { };
  substitute = substitute || { };
  // data is only the fields are needed.
  let { filePattern } = this;
  let db = null;
  DEBUG( data, substitute );
  let missingKeys = new Array( );
  for( let key of filePattern ){
    if( data[key.substr(1)] === undefined && substitute[key.substr(1)] === undefined ){
      missingKeys.push( key );
    }
  }
  DEBUG( "[Read][Missing key]", missingKeys );
  
  if( missingKeys.length > 0 ){
    // create a fs write stream
    let { standDir, filePath, indexHash, fileName, fieldKeys, delimiter } = this;
    let temp = `.${Number( new Date() )}.csv`;
    let tempFile = path.join( standDir, temp );
    let stream = await csvdb( tempFile, fieldKeys, delimiter );

    // replace filePath with data
    filePath = filePath.replace(/\$[a-zA-Z0-9]+/g, (v)=>{
      let k = v.substr(1);
      DEBUG( "[Read][Replace Path]", k, data[k], substitute[k] );
      return substitute[k] || data[k] || v;
    });

    stream.root = tempFile;
    return this.readMulti( stream, data );
    // return {error: "missing key", key: missingKeys};
  }
  // Now, it's can do it better
  let mergedData = Object.assign( {}, data, substitute ); // require data checking
  db = await this.getdb( mergedData ); // somebug here
  return (await db.get( data ));
}

async function ReadMultiple( stream, data ){
  let { standDir, filePath, indexHash } = this;
  let filePaths = filePath.replace(/\$[a-zA-Z0-9]+/g, (v)=>{
    return data[v.substr(1)] || v;
  });
  let paths = filePaths.split("/");
  let stack = [ {  root: standDir, path: paths.slice(0), data: Object.assign( {}, data )} ];
  let iter = null;
  while( stack.length > 0 ){ // DFS
    iter = stack.pop();
    let p   = iter.path.shift( );
    if( p !== undefined ){
      let key = p.match(/\$([a-zA-Z0-9]+)/);
      if( key ){
        let indexFile = path.join( iter.root, `index-${key[1]}-${indexHash}` );
        let content = fs.readFileSync( indexFile, "utf8" ).split("\n");
        for( let v of content ){
          stack.push( {
            root: path.join( iter.root, v ),
            path: iter.path.slice(0),
            data: Object.assign( {}, iter.data, { [key[1]]: v } )
          } );
        }
      }else{
        iter.root = path.join( iter.root, p );
        stack.push( iter );
      }
    }else{
      let db = await this.getdb( iter.data );
      await stream.add( await db.get( iter.data ) );
    }
  }
  let res = await stream.get( data ); // get the temperary file
  fs.unlinkSync( stream.root ); // remove the temperary file
  return res;
}

async function Write( data, substitute ){
  let { fieldKeys, fields } = this;
  let db = null;
  
  substitute =:%: substitute || { };
  
  try{
    for(let key of fieldKeys ){
      let d     =   data[key];
      let field = fields[key];

      // vaild data checking 
      let dataCheckResult = dataChecking( field, d );
      // Issues: substitute[key] require to check or not
      if( dataCheckResult.error ){
        return dataCheckResult;
      }
      data[key] = dataCheckResult.value;
    }
    let keysCount = Object.keys( data ).length;
    if( fieldKeys.length !== keysCount ){
      return { error: "key are missing or extra" };
    }
    
    // DEBUG( '[Write test]', data );
    // with data merge with substitute, require to check the rules.
    let subtituteData = new Object( );
    for( let key in data ){
      subtituteData[key] = substitute[key] || data[key];
    }

    db = await this.getdb( subtituteData );
    await db.add( data );
    return { message:"ok" };
  }catch(e){
    return { error:e, message: e.message };
  }
}

async function WriteMulti( date, subtitute ){
  let { fields }
}

async function Update( predicate, data ){
  let { fieldKeys, fields } = this;
  let db = null;

  try{
    for(let key of fieldKeys ){
      let d     =   data[key];
      let field = fields[key];

      // vaild data checking 
      let dataCheckResult = dataChecking( field, d );
      if( dataCheckResult.error ){
        return dataCheckResult;
      }
      if( dataCheckResult.value !== undefined )
        data[key] = dataCheckResult.value;

      // DEBUG( '[Update test]', data );
      
    }
    db = await this.getdb( data );
    DEBUG( data );
    await db.edit( predicate, data );
    return { message:"ok" };
  }catch(e){
    return { error:e, message: e.message };
  }
}

async function Delete( predicate, data ){
  let { fieldKeys, fields } = this;
  let db = null;

  try{
    db = await this.getdb( data );
    await db.delete( predicate );
    return { message:"ok" };
  }catch(e){
    return { error:e, message: e.message };
  }
}

async function getdb( data ){
  let filePath = path.join(this.standDir, this.filePath);
  let fileName  =  this.fileName;
  let fields    = this.fieldKeys;
  let delimiter = this.delimiter;
  let indexHash = this.indexHash;

  try{
    let dbPath = pathConstructor( filePath, data, indexHash );
    let dbFile = path.resolve( dbPath, fileName );
    let db = this.dbs[dbFile];
    // DEBUG( '[db path]', dbFile );
    if( db === undefined ){
      DEBUG( "new db" );
      db = await csvdb( dbFile, fields, delimiter );
      this.dbs[dbFile] = db;

      DEBUG( this.dbs );
      DEBUG( dbFile );
    }
    return db;
  }catch(e){
    throw e;
  }
}

// common functions

function pathConstructor( filePath, data, hash ){
  // Security issues: with data or filePath include a slash, also can be resolved.

  let paths = [ ];
  for( let p of filePath.split("/") ){
    let key = p.match(/\$([a-zA-Z0-9]+)/);
    if( key ){
      // replace the p with the data
      p = p.replace( key[0], data[key[1]] );
      // create a new index file or read the index file
      let indexFile = path.join( paths.join("/"), `index-${key[1]}-${hash}` );
      let content = [ ];
      if( fs.existsSync( indexFile ) ){
        content = fs.readFileSync( indexFile, "utf8" ).split("\n");
      }
      // it's very slow
      if( content.indexOf( data[key[1]] ) === -1 )
        content.push( data[key[1]] );
      fs.writeFileSync( indexFile, content.join("\n") );
    }
    paths.push( p );
    let _path = paths.join("/");
    if( p && !fs.existsSync( _path ) ){
      fs.mkdirSync( _path );
    }
  }

  return paths.join("/");
}

function dataChecking( field, value ){
  if( field === undefined )
    return { error: "non-defineing field" };
  if( value === undefined ){
    value = autofillValue( field );
  }

  if( checkEmptyRule( field ) === true && value === undefined ){
    return { error:"data is missing" };
  }

  // Pass the data checking
  // if( typeof data !== field['type'] ){
  //   return { error:"Type is not matching", key };
  // }

  return { value };
}

function autofillValue( field ){
  if( typeof field['autofill'] === "function" ){
    return field['autofill']();
  }else if( field['default'] !== undefined ){
    return field['default'];
  }
  return undefined;
}

function checkEmptyRule( field ){
  return field['NN'] === true || 
         field['PK'] === true || 
         field['U']  === true;
}

// create a function genrate sha256 hash from the message
function sha256( message ){
  let hash = crypto.createHash('sha256');
  hash.update( message );
  return hash.digest('hex');
}

module.exports = application;
