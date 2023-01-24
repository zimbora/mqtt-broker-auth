
var mysql = require('mysql2')
var db = require('../db/db.js')
var async = require('async')

var self = module.exports = {

  init : function(){
    //db.init();
    db.connect(()=>{
      console.log("MYSQL is connected");
    })
  },

  checkUser : async function(user,pwd){

    try{ rows = await getUser(user,pwd)}
    catch(err){ console.log(err); return false;}

    if(rows != null && rows.length == 1)
      return true
    else return false;

  },

  addClient : async function(clientID,user,pwd){

    let res = null;
    try{ res = await getAssociatedUser(clientID)}
    catch(err){ console.log(err);}

    if(res == null || res.length == 0){
      try{ res = await insertClientID(clientID,user,pwd)}
      catch(err){ console.log(err);}
    }else{
      try{ res = await updateClientID(clientID,user,pwd)}
      catch(err){ console.log(err);}
    }
    /*
    promise without await
    db.getConnection((err,conn)=>{
      if(err) return cb(err,false) ;
      else{
        getAssociatedUser(conn,clientID)
          .then(rows => console.log(rows))
          .catch(err => console.log(err))
        try{
          let res = await getAssociatedUser(conn,clientID);
          console.log(res)
        }catch(err) console.log(err);
      }

    })
    */
  },

  checkPublishAuthorization : async function(clientID, topic){

    if(topic.includes(clientID)) // if client is writting on own topic return true
      return true;

    let res = null;
    try{ res = await getAssociatedUserLevel(clientID)}
    catch(err){ console.log(err);}

    if(res != null && res.length > 0){
      if(res[0].level >= 4) // if client is admin allow everything
        return true;
    }

    // check if client is authorized to publish on topic
    if(!topic.includes("uid:"))
      return false;

    let index = topic.indexOf("uid:")
    let uid = topic.substr(index);
    index = uid.indexOf("/");
    uid = uid.substr(0,index);

    try{ res = await getPermission(clientID,uid)}
    catch(err){ console.log(err);}

    if(res != null && res.length > 0){
      if(res[0].level >= 3)
        return true;
    }
    return false;
  },

  checkSubscribeAuthorization : async function(clientID, topic){

    if(topic.includes(clientID)) // if client is writting on own topic return true
      return true;

    let res = null;
    try{ res = await getAssociatedUserLevel(clientID)}
    catch(err){ console.log(err);}

    if(res != null && res.length > 0){
      if(res[0].level >= 4) // if client is admin allow everything
        return true;
    }

    // check if client is authorized to publish on topic
    if(!topic.includes("uid:"))
      return false;

    let index = topic.indexOf("uid:")
    let uid = topic.substr(index);
    index = uid.indexOf("/");
    uid = uid.substr(0,index);

    try{ res = await getPermission(clientID,uid)}
    catch(err){ console.log(err);}

    if(res != null && res.length > 0){
      if(res[0].level >= 1)
        return true;
    }
    return false;
  },

};

// mqtt credentials
async function getUser(user,pwd){

  return new Promise((resolve,reject) => {

    db.getConnection((err,conn)=>{
      if(err) return reject(err);

      let query = "SELECT ?? FROM ?? where idusers = ? and password = ?";
      let table = ["level","users",user,pwd];

      query = mysql.format(query,table);
      conn.query(query,function(err,rows){
        db.close_db_connection(conn);
        if(err) return reject(err)
        else return resolve(rows);
      });
    });
  });
}

// mqtt clients
async function getAssociatedUser(clientID){

  return new Promise((resolve,reject) => {

    db.getConnection((err,conn)=>{
      if(err) return reject(err);

      let query = "SELECT ?? FROM ?? where idclients = ?";
      let table = ["users_idusers","clients",clientID];

      query = mysql.format(query,table);
      conn.query(query,function(err,rows){
        db.close_db_connection(conn);
        if(err) return reject(err)
        else return resolve(rows);
      });
    });
  });
}

async function getAssociatedUserLevel(clientID){

  return new Promise((resolve,reject) => {

    db.getConnection((err,conn)=>{
      if(err) return reject(err);

      let query = "select users.level from users inner join clients on clients.users_idusers = users.idusers and clients.idclients = ?";
      let table = [clientID];

      query = mysql.format(query,table);
      conn.query(query,function(err,rows){
        db.close_db_connection(conn);
        if(err) return reject(err)
        else return resolve(rows);
      });
    });
  });
}

async function insertClientID(clientID,user){

  return new Promise((resolve,reject) => {

    db.getConnection((err,conn)=>{
      if(err) return reject(err);

      let query = "INSERT INTO ?? (??,??) VALUES (?,?)";
      let table = ["clients","idclients","users_idusers",clientID,user];

      query = mysql.format(query,table);
      conn.query(query,function(err,rows){
        db.close_db_connection(conn);
        if(err) return reject(err)
        else return resolve(rows);
      });
    });
  });
}

async function updateClientID(clientID,user){

  return new Promise((resolve,reject) => {

    db.getConnection((err,conn)=>{
      if(err) return reject(err);

      let query = "UPDATE ?? set ?? = ? where ?? = ?";
      let table = ["clients","users_idusers",user,"idclients",clientID];

      query = mysql.format(query,table);
      conn.query(query,function(err,rows){
        db.close_db_connection(conn);
        if(err) return reject(err)
        else return resolve(rows);
      });
    });
  });
}

// mqtt permissions
async function getPermission(clientID,deviceID){

  return new Promise((resolve,reject) => {

    db.getConnection((err,conn)=>{
      if(err) return reject(err);

      let query = "SELECT ?? FROM ?? where ?? = ? and ?? = ?";
      let table = ["level","permissions","clients_idclients",clientID,"devices_uid",deviceID];

      query = mysql.format(query,table);
      conn.query(query,function(err,rows){
        db.close_db_connection(conn);
        if(err) return reject(err)
        else return resolve(rows);
      });
    });
  });
}

async function addPermission(clientID,deviceID,level){
  //INSERT into `mqtt-aedes`.permissions (`clients_idclients`,`devices_uid`,`level`) values ("mqtt-explorer-e64bb6e9","uid:34865d234520",3);
  return new Promise((resolve,reject) => {

    db.getConnection((err,conn)=>{
      if(err) return reject(err);

      let query = "INSERT INTO ?? (??,??,??) values(?,?,?)";
      let table = ["permissions","clients_idclients","devices_uid","level",clientID,deviceID,level];

      query = mysql.format(query,table);
      conn.query(query,function(err,rows){
        db.close_db_connection(conn);
        if(err) return reject(err)
        else return resolve(rows);
      });
    });
  });
}

async function updatePermission(clientID,deviceID,level){
  //INSERT into `mqtt-aedes`.permissions (`clients_idclients`,`devices_uid`,`level`) values ("mqtt-explorer-e64bb6e9","uid:34865d234520",3);
  return new Promise((resolve,reject) => {

    db.getConnection((err,conn)=>{
      if(err) return reject(err);

      let query = "UPDATE ?? set ?? = ? where ?? = ? and ?? = ?";
      let table = ["permissions","level",level,"clients_idclients",clientID,"devices_uid",deviceID];

      query = mysql.format(query,table);
      conn.query(query,function(err,rows){
        db.close_db_connection(conn);
        if(err) return reject(err)
        else return resolve(rows);
      });
    });
  });
}
