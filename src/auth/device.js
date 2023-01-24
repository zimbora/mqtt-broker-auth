const semver = require('semver')
var mysql = require('mysql2')
var db = require('../db/db.js')
var async = require('async')

var self = module.exports = {

  checkDeviceVersion : async function(uid,cb){
    let res = null;
    let update = false;
    let err = null;

    try{ res = await getDevice(uid)}
    catch(err){ console.log(err);}

    if(res != null && res.length > 0){
      try{ rows = await getLatestFwVersion(res[0].model,res[0].release)}
      catch(err){ return cb(err,null,null);}

      if(rows == 0){
        return cb(null,null,null);

      let fw_version = "";
      }else{
        try{
          let arr_fw_version = res[0].fw_version.split(".");
          arr_fw_version.forEach((item, i) => {
            if(i==0)
            fw_version = Number(item);
            else
            fw_version += "."+Number(item);
          });
        }catch(e){
          return cb(e,null,null);
        }


        let db_version = "";
        try{
          let arr_version = rows[0].version.split(".");
          arr_version.forEach((item, i) => {
            if(i==0)
            db_version = Number(item);
            else
            db_version += "."+Number(item);
          });
        }catch(e){
          return cb(e,null,null);
        }

        if(!semver.valid(fw_version)){
          let error = "fw_version not valid: "+fw_version;
          return cb(error,null,null);
        }
        //rows[0].version = semver.clean(rows[0].version)
        if(!semver.valid(db_version)){
          let error = "db_version not valid: "+db_version;
          return cb(error,null,null);
        }

        try{
          if(semver.lt(fw_version, db_version)){
            console.log("update version for device:",uid)
            return cb(null,res[0],rows[0]);
          }else{
            console.log("device already has the latest version:",uid)
            return cb(null,res[0],null);
          }
        }catch(e){
          console.log(e)
          return cb(e,null,null);
        }

      }
    }
  },

  updateDevice : async function(uid,field,value,cb){

    let res = null;
    let update = false;

    try{ res = await getDevice(uid)}
    catch(err){ console.log(err);}

    if(res == null || res.length == 0){
      try{ res = await insertDevice(uid)}
      catch(err){ console.log(err);}

      if(res.affectedRows > 0)
        update = true;
    }else update = true;

    if(update){
      try{ res = await updateDevice(uid,field,value)}
      catch(err){ console.log(err);}
    }

    return cb();

  },

  updateDeviceJSON : async function(uid,field,key,value){

    let res = null;
    let update = false;

    try{ res = await getDevice(uid)}
    catch(err){ console.log(err);}

    if(res == null || res.length == 0){
      try{ res = await insertDevice(uid)}
      catch(err){ console.log(err);}

      if(res.affectedRows > 0)
        update = true;
    }else update = true;

    if(update){
      try{ res = await updateDeviceJSON(uid,field,key,value)}
      catch(err){ console.log(err);}
    }

  }

}


// mqtt devices
async function getDevice(uid){

  return new Promise((resolve,reject) => {

    db.getConnection((err,conn)=>{
      if(err) return reject(err);

      let query = "SELECT uid,project,model,fw_version,app_version,fw_release,status FROM ?? where uid = ?";
      let table = ["devices",uid];

      query = mysql.format(query,table);
      conn.query(query,function(err,rows){
        db.close_db_connection(conn);
        if(err) return reject(err)
        else return resolve(rows);
      });
    });
  });
}

async function insertDevice(uid){

  return new Promise((resolve,reject) => {

    db.getConnection((err,conn)=>{
      if(err) return reject(err);

      let query = "INSERT INTO ?? (??) VALUES (?)";
      let table = ["devices","uid",uid];

      query = mysql.format(query,table);
      conn.query(query,function(err,rows){
        db.close_db_connection(conn);
        if(err) return reject(err)
        else return resolve(rows);
      });
    });
  });
}

async function updateDevice(uid,field,value){

  return new Promise((resolve,reject) => {

    try{
      value = JSON.parse(value);
    }catch{}

    db.getConnection((err,conn)=>{
      if(err) return reject(err);

      let query = "UPDATE ?? set ?? = ? where ?? = ?";
      let table = ["devices",field,value,"uid",uid];

      query = mysql.format(query,table);
      conn.query(query,function(err,rows){
        db.close_db_connection(conn);
        if(err) return reject(err)
        else return resolve(rows);
      });
    });
  });
}

async function updateDeviceJSON(uid,field,key,value){

  return new Promise((resolve,reject) => {

    try{
      value = JSON.parse(value);
    }catch{}

    db.getConnection((err,conn)=>{
      if(err) return reject(err);

      let query = "SELECT ?? from ?? where ?? = ?";
      let table = [field,"devices","uid",uid];
      query = mysql.format(query,table);
      conn.query(query,function(err,rows){
        if(err){
          db.close_db_connection(conn);
          return reject(err)
        }
        else{
          let doc = rows[0][field];
          if(doc == null)
            doc = {}
          doc[key] = value;

          let query = "UPDATE ?? set ?? = ? where ?? = ?";
          let table = ["devices",field,JSON.stringify(doc),"uid",uid];

          query = mysql.format(query,table);
          conn.query(query,function(err,rows){
            db.close_db_connection(conn);
            if(err)
              return reject(err)
            else
              return resolve(rows);
          });
        }
      });
    });
  });
}

async function getLatestFwVersion(model,release){

  return new Promise((resolve,reject) => {

    db.getConnection((err,conn)=>{
      if(err) return reject(err);

      let query = "";
      let table = [];


      if(release == "stable"){
        query = `SELECT version,filename,token FROM ?? where fwModel_name = ? and release = ? ORDER BY CAST(SUBSTRING_INDEX(version, '.', 1) AS UNSIGNED) DESC,
         CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(version, '.', 2), '.', -1) AS UNSIGNED) DESC,
         CAST(SUBSTRING_INDEX(version, '.', -1) AS UNSIGNED) DESC
         LIMIT 1`;
        table = ["firmwares",model,release];
      }else{
        query = `SELECT version,filename,token FROM ?? where fwModel_name = ? ORDER BY CAST(SUBSTRING_INDEX(version, '.', 1) AS UNSIGNED) DESC,
         CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(version, '.', 2), '.', -1) AS UNSIGNED) DESC,
         CAST(SUBSTRING_INDEX(version, '.', -1) AS UNSIGNED) DESC
         LIMIT 1`;
        table = ["firmwares",model];
      }

      query = mysql.format(query,table);
      conn.query(query,function(err,rows){
        db.close_db_connection(conn);
        if(err) return reject(err)
        else{
          return resolve(rows);
        }
      });
    });
  });
}
