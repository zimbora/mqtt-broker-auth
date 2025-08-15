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

  checkDevice : async function(uid){

    try{ device = await getDevice(uid)}
    catch(err){ console.log(err); return null;}

    return device;
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

  checkPublishAuthorization : async function(nick, username, pwd, topic){

    // :project/:uid/
    const topicObj = parseMqttTopic(topic);
    const user = await getUserLevel(username);
    if(!user?.level) return false;

    switch(user.level){
      case 5:
        return true;
        break;
      case 4:
        try{
          const client = await getClient(nick);
          const project = await getProject(topicObj?.project);
          return await clientHasAccessToProject(client.id,project.id);
        }catch(err){
          console.log(err);
          return false;
        }
        break;
    }

    if(username == 'device'){
      const project = await getProject(topicObj?.project);
      const uid = topicObj?.uid;
      if( project && uid && uid.startsWith(project?.uidPrefix) && uid.length == project?.uidLength){ // not necessary here - only in publish mode
        const device = await getDevice(topicObj?.uid);
        if(device) return true; // device is subscribing to own topic  
        else return false; 
      }else{
        return false; // device is not subscribing to project that is assigned
      } 
    }
    else if(username == 'client'){
      try{ 
        const client = await getClient(nick);
        level = await getPermission(client.client_id,topicObj?.uid)
        if(level != null && level > 1)
          return true;
        else
          return false;
      }catch(err){ 
        console.log(err);
        return false;
      } 
    }

    return false; // no condition was met
  },

  checkSubscribeAuthorization : async function(nick, username, pwd, topic){

    // :project/:uid/
    const topicObj = parseMqttTopic(topic);
    const user = await getUserLevel(username);
    if(!user?.level) return false;

    switch(user.level){
      case 5:
        return true;
        break;
      case 4:
        try{
          const client = await getClient(nick);
          const project = await getProject(topicObj?.project);
          return await clientHasAccessToProject(client.id,project.id);
        }catch(err){
          console.log(err);
          return false;
        }
        break;
    }

    if(username == 'device'){
      const project = await getProject(topicObj?.project);
      const uid = topicObj?.uid;
      if( project && uid && uid.startsWith(project?.uidPrefix) && uid.length == project?.uidLength){ // not necessary here - only in publish mode
        const device = await getDevice(topicObj?.uid);
        if(device) return true; // device is subscribing to own topic  
        else return false; 
      }else{
        return false; // device is not subscribing to project that is assigned
      } 
    }
    else if(username == 'client'){
      try{ 
        const client = await getClient(nick);
        level = await getPermission(client.client_id,topicObj?.uid)
        if(level != null && level > 0)
          return true;
        else
          return false;
      }catch(err){ 
        console.log(err);
        return false;
      } 
    }

    return false; // no condition was met
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

async function getUserLevel(user){

  return new Promise((resolve,reject) => {

    let query = "SELECT level FROM ?? where type = ?";
    let table = ["users",user];
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

// projects
async function getProject(projectName){

  return new Promise((resolve,reject) => {

    let query = "SELECT id,uidPrefix,uidLength FROM projects where name = ?";
    let table = [projectName];
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

    let query = "SELECT id as client_id,user_id,gmail,name FROM clients where nick = ?";
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

async function getDevice(uid){

  return new Promise((resolve,reject) => {

    let query = "SELECT id,uid,psk FROM devices where uid = ?";
    let table = [uid];
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

// mqtt permissions
async function clientHasAccessToProject(clientId,projectId){

  return new Promise((resolve,reject) => {

    let query = "SELECT * FROM projectPermissions where clientId = ? and project_id = ?";
    let table = [clientId,projectId];
    query = mysql.format(query,table);

    db.queryRow(query)
    .then( rows => {
      if(rows.length > 0)
        return resolve(true);
      else return resolve(false);
    })
    .catch( error => {
      return reject(error);
    })
  });
}

async function getPermission(clientID,deviceID){

  return new Promise((resolve,reject) => {

    let query = "SELECT level FROM permissions as p inner join devices as d where d.id = p.device_id and p.client_id = ? and d.uid = ?";
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

// utils
function parseMqttTopic(topic) {
  // Split the topic into parts based on '/'
  const parts = topic.split('/');

  // Optional: You can return an object with parts
  return {
    hierarchy: parts,
    // Example: access specific parts:
    project: parts[0],
    uid: parts[1],
  };
}