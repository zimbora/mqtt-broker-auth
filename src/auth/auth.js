const moment = require('moment');
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

    try{ user = await getUser(user,pwd)}
    catch(err){ console.log(err); return false;}

    return user;

  },

  checkClient : async function(nick){

    try{ client = await getClient(nick)}
    catch(err){ console.log(err); return null;}

    return client;
  },

  addClient : async function(nick,user_type,pwd){

    let user = await getUser(user_type,pwd);
    let client = await getClient(nick);

    if(!client){
      try{
        res = await insertClient(nick,user.id)
        return;
      }
      catch(err){
        console.log(err);
        return;
      }
    }else{
      try{
        res = await updateClient(nick,user.id)
        return;
      }
      catch(err){
        console.log(err);
        return;
      }
    }
  },

  checkPublishAuthorization : async function(nick, topic){

    if(topic.includes(nick)) // if client is writting on own topic return true
      return true;

    let res = null;
    try{ res = await getAssociatedUserByNick(nick)}
    catch(err){ console.log(err);}

    let clientID;
    if(res != null){
       clientID = res.client_id;
      if(res.level >= 4) // if client is admin allow everything
        return true;
    }

    // check if client is authorized to publish on topic
    if(topic.includes("uid:")){
      let index = topic.indexOf("uid:")
      let uid = topic.substr(index);
      index = uid.indexOf("/");
      uid = uid.substr(0,index);

      try{ level = await getPermission(clientID,uid)}
      catch(err){ console.log(err);}

      if(level != null && level >= 3)
        return true;

      return false;
    }else{
      return true;
    }

  },

  checkSubscribeAuthorization : async function(nick, topic){

    if(topic.includes(nick)) // if client is writting on own topic return true
      return true;

    try{ user = await getAssociatedUserByNick(nick)}
    catch(err){ console.log(err);}

    let clientID;
    if(user != null){
      //clientID = user[0].user_id;
      if(user.level >= 4) // if client is admin allow everything
        return true;
    }

    // check if client is authorized to subscribe on topic
    // Clients are only authorized to subscribe on devices topics, unless they have high level permissions
    if(!topic.includes("uid:"))
      return false;

    let index = topic.indexOf("uid:")
    if(index > -1){
      let uid = topic.substr(index);
      index = uid.indexOf("/");
      uid = uid.substr(0,index);

      try{ level = await getPermission(user.client_id,uid)}
      catch(err){ console.log(err);}

      if(level != null && level >= 1)
        return true;

      return false;
    }
    else{
      return true;
    }
  },

};

// mqtt credentials
async function getUser(user,pwd){

  return new Promise((resolve,reject) => {

    let query = "SELECT level,id FROM ?? where type = ? and password = ?";
    let table = ["users",user,pwd];
    query = mysql.format(query,table);

    db.queryRow(query)
    .then( rows => {
      if(rows.length > 0)
        return resolve(rows[0]);
      else return resolve(null);
    })
    .catch( error => {
      return reject(error);
    })
  });
}

// mqtt clients
async function getAssociatedUserByNick(nick){

  return new Promise((resolve,reject) => {

    let query = "select users.id,users.level,users.type,clients.id as client_id from users inner join clients on clients.user_id = users.id and clients.nick = ?";
    let table = [nick];
    query = mysql.format(query,table);

    db.queryRow(query)
    .then( rows => {
      if(rows.length > 0)
        return resolve(rows[0]);
      else
        return null;
    })
    .catch( error => {
      return reject(error);
    })
  });
}

async function getAssociatedUserById(clientId){

  return new Promise((resolve,reject) => {

    let query = "select users.id,users.level,users.type from users inner join clients on clients.user_id = users.id and clients.id = ?";
    let table = [clientId];
    query = mysql.format(query,table);

    db.queryRow(query)
    .then( rows => {
      return resolve(rows);
    })
    .catch( error => {
      return reject(error);
    })
  });
}

// mqtt credentials
async function getClient(nick){

  return new Promise((resolve,reject) => {

    let query = "SELECT id as client_id,user_id,gmail,name,avatar FROM clients where nick = ?";
    let table = [nick];
    query = mysql.format(query,table);

    db.queryRow(query)
    .then( rows => {
      if(rows.length > 0)
        return resolve(rows[0]);
      else return resolve(null);
    })
    .catch( error => {
      return reject(error);
    })
  });
}

async function insertClient(nick,userId){

  return new Promise((resolve,reject) => {

    let obj = {
      user_id : userId,
      nick : nick,
      createdAt : moment().utc().format('YYYY-MM-DD HH:mm:ss'),
      updatedAt : moment().utc().format('YYYY-MM-DD HH:mm:ss')
    }

    db.insert("clients",obj)
    .then( rows => {
      return resolve(rows);
    })
    .catch( error => {
      return reject(error);
    })
  });
}

async function updateClient(nick,userId){

  return new Promise((resolve,reject) => {

    let obj = {
      user_id : userId,
      updatedAt : moment().utc().format('YYYY-MM-DD HH:mm:ss')
    };

    let filter = {
      nick : nick
    };

    db.update("clients",obj,filter)
    .then( rows => {
      return resolve(rows);
    })
    .catch( error => {
      return reject(error);
    })
  });
}

// mqtt permissions
async function getPermission(clientID,deviceID){

  return new Promise((resolve,reject) => {

    let query = "SELECT level FROM permissions as p inner join devices as d where d.id = p.device_id and p.client_id =  ? and d.uid = ?";
    let table = [clientID,deviceID];
    query = mysql.format(query,table);

    db.queryRow(query)
    .then( rows => {
      if(rows.length > 0)
        return resolve(rows[0]?.level);
      else return null;
    })
    .catch( error => {
      return reject(error);
    })
  });
}

async function addPermission(clientID,deviceID,level){

  return new Promise((resolve,reject) => {

    let obj = {
      client_id : clientId,
      device_id : clientID,
      level : level,
      createdAt : moment().utc().format('YYYY-MM-DD HH:mm:ss'),
      updatedAt : moment().utc().format('YYYY-MM-DD HH:mm:ss')
    }

    db.insert("permissions",obj)
    .then( rows => {
      return resolve(rows);
    })
    .catch( error => {
      return reject(error);
    })
  });
}

async function updatePermission(clientID,deviceID,level){

  return new Promise((resolve,reject) => {

    let obj = {
      level : level,
      updatedAt : moment().utc().format('YYYY-MM-DD HH:mm:ss')
    };

    let filter = {
      client_id : clientId,
      device_id : deviceId
    };

    db.update("permissions",obj,filter)
    .then( rows => {
      return resolve(rows);
    })
    .catch( error => {
      return reject(error);
    })
  });
}
