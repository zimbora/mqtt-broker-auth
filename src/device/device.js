const semver = require('semver')
var mysql = require('mysql2')
var db = require('../db/db.js')
var async = require('async')
var md5 = require('md5');
var _ = require('lodash');

var self = module.exports = {

  checkDeviceFWVersion : async function(uid,cb){
    let res = null;
    let update = false;
    let err = null;

    try{ res = await getDevice(uid)}
    catch(err){ console.log(err);}

    if(res != null && res.length > 0){
      try{ rows = await getLatestFwVersion(res[0].model,res[0].fw_release)}
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


        let db_fw_version = "";
        try{
          let arr_version = rows[0].fw_version.split(".");
          arr_version.forEach((item, i) => {
            if(i==0)
            db_fw_version = Number(item);
            else
            db_fw_version += "."+Number(item);
          });
        }catch(e){
          return cb(e,null,null);
        }

        if(!semver.valid(fw_version)){
          let error = "fw_version not valid: "+fw_version;
          return cb(error,null,null);
        }
        //rows[0].version = semver.clean(rows[0].version)
        if(!semver.valid(db_fw_version)){
          let error = "db_fw_version not valid: "+db_fw_version;
          return cb(error,null,null);
        }

        try{
          if(semver.lt(fw_version, db_fw_version)){
            console.log("fw update version for device:",uid)
            return cb(null,res[0],rows[0]);
          }else{
            return cb(null,res[0],null);
          }
        }catch(e){
          console.log(e)
          return cb(e,null,null);
        }

      }
    }
  },

  checkDeviceAppVersion : async function(uid,cb){
    let res = null;
    let update = false;
    let err = null;

    try{ res = await getDevice(uid)}
    catch(err){ console.log(err);}

    if(res != null && res.length > 0){
      try{ rows = await getLatestAppVersion(res[0].model,res[0].fw_release)}
      catch(err){ return cb(err,null,null);}

      if(rows == 0){
        return cb(null,null,null);

      let fw_version = "";
      }else{
        try{
          let arr_app_version = res[0].app_version.split(".");
          arr_app_version.forEach((item, i) => {
            if(i==0)
            app_version = Number(item);
            else
            app_version += "."+Number(item);
          });
        }catch(e){
          return cb(e,null,null);
        }


        let db_app_version = "";
        try{
          let arr_version = rows[0].app_version.split(".");
          arr_version.forEach((item, i) => {
            if(i==0)
            db_app_version = Number(item);
            else
            db_app_version += "."+Number(item);
          });
        }catch(e){
          return cb(e,null,null);
        }

        if(!semver.valid(app_version)){
          let error = "app_version not valid: "+app_version;
          return cb(error,null,null);
        }
        //rows[0].version = semver.clean(rows[0].version)
        if(!semver.valid(db_app_version)){
          let error = "db_app_version not valid: "+db_app_version;
          return cb(error,null,null);
        }

        try{
          if(semver.lt(app_version, db_app_version)){
            console.log("update app version for device:",uid)
            return cb(null,res[0],rows[0]);
          }else{
            return cb(null,res[0],null);
          }
        }catch(e){
          console.log(e)
          return cb(e,null,null);
        }

      }
    }
  },

  updateDevice : async function(client,project,uid,field,value,cb){

    let res = null;
    let update = false;

    if(value == null || value == "")
      return;

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

  updateDeviceJSON : async function(client,project,uid,field,key,value){

    let res = null;
    let update = false;

    try{res = await getDevice(uid)}
    catch(err){ console.log(err);}

    if(res == null || res.length == 0){
      try{ res = await insertDevice(uid)}
      catch(err){ console.log(err);}

      if(res.affectedRows > 0)
        update = true;
    }else{
      if(client.id.startsWith("uid:")){
        update = false;
        // check if there is already a configuration on device.
        try{ res = await getDeviceProperty(uid,field,key)

          if(res != null){
            try{
              value = JSON.parse(value);
              //check if config on device is different from config on db
              //if(md5(res) != md5(value)){ // md5 doesn't work well bcs of the key order
              if(!_.isEqual(res,value)){
                // update config on device with config in db
                update = false;
                let route = "";
                if(field.startsWith("fw"))
                  route = "fw"
                else if(field.startsWith("app"))
                  route = "app"

                if(key != "wifi"){ // device has always preference on it, it can be extended to modem configs
                  let topic = project+"/"+uid+"/"+route+"/settings/"+key+"/set";
                  let payload = JSON.stringify(res);

                  let packet = {
                    topic : topic,
                    payload : payload
                  }
                  client.publish(packet,(err)=>{
                    if(err) console.log(err)
                  })
                }else
                  update = true;

              }
            }catch(err){
              console.log("!! struct in device is not in json format, fw has an error");
            }
          }else{
            try{ res = await updateDeviceJSON(uid,field,key,value)}
            catch(err){ console.log(err);}
          }
        }catch(err){ console.log(err);}

      }else update = true;
    }

    if(update){
      try{ res = await updateDeviceJSON(uid,field,key,value)}
      catch(err){ console.log(err);}
    }

  },

  checkMD5 : async function(uid,field,payload){

    return new Promise(async(resolve,reject) => {
      if(payload == null) resolve(null);

      try{
        payload = JSON.parse(payload)
      }catch(err){reject(err);}

      if(!payload.hasOwnProperty("md5"))
        resolve();

      try{
        res = await getDeviceField(uid,field);
        try{
          //res = JSON.stringify(res);
          if(md5(res) == payload.md5){
            resolve(null)
          }
          else{
            console.log("update file {} for uid {}",field,uid);
            resolve(res);
          }

        }catch(err){reject(err)};
      }catch(err){reject(err);}
    });
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

    if(value == "" || value == null)
      return resolve();

    db.getConnection((err,conn)=>{
      if(err) return reject(err);

      let query = "UPDATE ?? set ?? = ? where ?? = ?";
      let table = ["devices",field,value,"uid",uid];

      query = mysql.format(query,table);
      conn.query(query,function(err,rows){
        db.close_db_connection(conn);
        if(err){
          return reject(err)
        }
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
        query = `SELECT fw_version,filename,token FROM ?? where fwModel_name = ? and fw_release = ? ORDER BY CAST(SUBSTRING_INDEX(fw_version, '.', 1) AS UNSIGNED) DESC,
         CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(fw_version, '.', 2), '.', -1) AS UNSIGNED) DESC,
         CAST(SUBSTRING_INDEX(fw_version, '.', -1) AS UNSIGNED) DESC
         LIMIT 1`;
        table = ["firmwares",model,release];
      }else{
        query = `SELECT fw_version,filename,token FROM ?? where fwModel_name = ? ORDER BY CAST(SUBSTRING_INDEX(fw_version, '.', 1) AS UNSIGNED) DESC,
         CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(fw_version, '.', 2), '.', -1) AS UNSIGNED) DESC,
         CAST(SUBSTRING_INDEX(fw_version, '.', -1) AS UNSIGNED) DESC
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

async function getLatestAppVersion(model,release){

  return new Promise((resolve,reject) => {

    db.getConnection((err,conn)=>{
      if(err) return reject(err);

      let query = "";
      let table = [];

      if(release == "stable"){
        query = `SELECT app_version,filename,token FROM ?? where fwModel_name = ? and fw_release = ? ORDER BY CAST(SUBSTRING_INDEX(app_version, '.', 1) AS UNSIGNED) DESC,
         CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(app_version, '.', 2), '.', -1) AS UNSIGNED) DESC,
         CAST(SUBSTRING_INDEX(app_version, '.', -1) AS UNSIGNED) DESC
         LIMIT 1`;
        table = ["firmwares",model,release];
      }else{
        query = `SELECT app_version,filename,token FROM ?? where fwModel_name = ? ORDER BY CAST(SUBSTRING_INDEX(app_version, '.', 1) AS UNSIGNED) DESC,
         CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(app_version, '.', 2), '.', -1) AS UNSIGNED) DESC,
         CAST(SUBSTRING_INDEX(app_version, '.', -1) AS UNSIGNED) DESC
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

async function getDeviceField(uid,field){

  return new Promise((resolve,reject) => {

    db.getConnection((err,conn)=>{
      if(err) return reject(err);

      let query = "SELECT ?? FROM ?? where uid = ?";
      let table = [field,"devices",uid];
      query = mysql.format(query,table);
      conn.query(query,function(err,rows){
        db.close_db_connection(conn);
        if(err) return reject(err)
        else{
          if(rows.length == 1 ){
            return resolve(rows[0][field]);
          }else return resolve(null);
        }
      });
    });
  });
}

async function getDeviceProperty(uid,field,key){

  return new Promise((resolve,reject) => {

    db.getConnection((err,conn)=>{
      if(err) return reject(err);

      let query = "SELECT ?? FROM ?? where uid = ?";
      let table = [field,"devices",uid];

      query = mysql.format(query,table);
      conn.query(query,function(err,rows){
        db.close_db_connection(conn);
        if(err) return reject(err)
        else{
          if(rows.length == 1 && rows[0].hasOwnProperty(field) && rows[0][field].hasOwnProperty(key)){
            return resolve(rows[0][field][key]);
          }else return resolve(null);
        }
      });
    });
  });
}
