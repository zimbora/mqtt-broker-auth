const moment = require('moment');
var mysql = require('mysql2')
var md5 = require('md5');
const semver = require('semver')

parser = require('../aux/parser');
models = require("../../models/models");
db = require("../db/db");
var Device = require('../db/device.js');
var Project = require('../db/project.js');
var Model = require('../db/model.js');
var Firmware = require('../db/firmware.js');
var config = require('../../config');

var apps = config.apps;
var dev_models = config.devices["freeRTOS2"].models;

MACRO_UID_PREFIX          = "uid:"

// devices
MACRO_SLIMGW              = "SLIMGW"
MACRO_MEAGW               = "MEAGW"

// connectivity
MACRO_WIFI                = "WiFi"
MACRO_LTE                 = "LTE"

// TOPICS
MACRO_TOPIC_FW_SETTINGS   = "fw/settings"
MACRO_TOPIC_APP_SETTINGS  = "app/settings"
MACRO_TOPIC_FOTA_SET      = "fw/fota/update/set"
MACRO_TOPIC_AR            = "/ar"
MACRO_TOPIC_AR_SET        = "/ar/set"
MACRO_TOPIC_ALARM         = "/alarms"
MACRO_TOPIC_ALARM_SET     = "/alarms/set"
MACRO_TOPIC_JS_CODE_SET   = "/js/code/set"
MACRO_TOPIC_JS_CODE       = "/js/code"
MACRO_TOPIC_SETPOINTS_SET = "app/setpoints/set"

// FW KEYS
MACRO_KEY_FW_SETTINGS     = "fw_settings"
MACRO_KEY_FW_VERSION      = "fw_version"
MACRO_KEY_APP_VERSION     = "app_version"
MACRO_KEY_STATUS          = "status"
MACRO_KEY_MODEL           = "model"
MACRO_KEY_AR              = "ar"
MACRO_KEY_ALARM           = "alarms"
MACRO_KEY_JS_CODE         = "js_program"
MACRO_KEY_SETPOINTS       = "setpoints"

// APP KEYS
MACRO_KEY_APP_SETTINGS    = "app_settings"

let topics = { // topics to read
  fw : {
    settings : ["mqtt","keepalive","log"],
    wifi : ["wifi"],
    lte : ["modem"],
    files : ["ar","alarms","js_program"]
  }
}



module.exports = {

    init : ()=>{
    console.log("Init freeRTOS2 module");

    seq = models.init();
    models.load();

    Object.keys(apps).map( (name)=>{
      apps[name].module = require('../app/'+name+".js")
      apps[name].module.init();
    })
  },

  parseMessage : async (client, project, device, topic, payload, cb)=>{

    // The next two lines updates dB with received data
    Project.update(project,device.id,topic,payload);
    Project.addLog("logs_"+project,device.id,topic,payload);

    // get device configuration
    if(topic == "model"){
      if(dev_models[topic]){
      }
      checkConfigs(project,device.uid,payload,client);
    }

    switch(topic){
      case 'fw_version':{
        console.log("check fw version");

        checkDeviceFWVersion(device.uid,(err,dev,fw)=>{
          if(err) console.log(err);
          else if(fw != null){
            console.log("update: "+device.uid+ " fw for:",fw.fw_version);
            let topic = dev.project+"/"+device.uid+ "/" +MACRO_TOPIC_FOTA_SET;
            let payload = {
              url : config.web.protocol+config.web.domain+config.web.fw_path+fw.filename+"/download?token="+fw.token
            }
            let packet = {
              topic : topic,
              payload : JSON.stringify(payload)
            }
            client.publish(packet,(err)=>{
              if(err) console.log(err)
            })
          }
        });

        break;
      }
      case 'app_version':{
        console.log("check app version");

        checkDeviceAppVersion(device.uid,(err,dev,fw)=>{
          if(err) console.log(err);
          else if(fw != null){
            console.log("update "+device.uid+" app for:",fw);
            let topic = dev.project+"/"+device.uid+"/"+MACRO_TOPIC_FOTA_SET;
            let payload = {
              url : config.web.protocol+config.web.domain+config.web.fw_path+fw.filename+"/download?token="+fw.token
            }
            let packet = {
              topic : topic,
              payload : JSON.stringify(payload)
            }
            client.publish(packet,(err)=>{
              if(err) console.log(err)
            })
          }
        });

        break;
      }
    }

    if(topic.startsWith("fw/")){
      topic = topic.substring(3);

      // adds new configurations set by user
      if(topic.endsWith("/set")){
        if(payload == "" || payload == null)
          return cb();
        let index = topic.indexOf("/");
        let field = topic.substring(0,index);
        topic = topic.substring(index+1);
        if(topic == "set"){
          Project.update(project,device.id,field,payload);
        }else{
          index = topic.indexOf("/");
          let key = topic.substring(0,index);
          let data = {}
          data[key] = payload;
          let filter = {
            device_id : device.id
          };
          db.updateJSON(project,field,data,filter);
        }

      }else{

        // check received configurations from device
        switch(topic){
          case 'settings/log':{
            let stored = await db.getPropertyFromDeviceId(project,device.id,"settings","log");
            updateFwSetting(client, project, device.uid, "settings/mqtt", stored, payload);
            break;
          }
          case 'settings/keepalive':{
            let stored = await db.getPropertyFromDeviceId(project,device.id,"settings","keepalive");
            updateFwSetting(client, project, device.uid, "settings/mqtt", stored, payload);
            break;
          }
          case 'settings/mqtt':{
            let stored = await db.getPropertyFromDeviceId(project,device.id,"settings","mqtt");
            updateFwSetting(client, project, device.uid, "settings/mqtt", stored, payload);
            break;
          }
          case 'js/code':{
            let stored = await db.getFieldFromDeviceId(project,device.id,"js_program");
            try{
              res = await checkMD5(project,device.uid,MACRO_KEY_JS_CODE,payload);
              if(res){
                topic += "/set";
                let packet = {
                  topic : topic,
                  payload : res
                }
                client.publish(packet,(err)=>{
                  if(err) console.log(err)
                })
              }
            }catch(err){console.log(err);}
            break;
          }
          case 'ar' : {

            let stored = await db.getFieldFromDeviceId(project,device.id,"ar");
            try{
              res = await checkMD5(project,device.uid,'ar',payload);
              if(res){
                topic += "/set";
                let packet = {
                  topic : topic,
                  payload : res
                }
                client.publish(packet,(err)=>{
                  if(err) console.log(err)
                })
              }
            }catch(err){console.log(err);}
            break;
          }
          case 'alarm':{
            let stored = await db.getFieldFromDeviceId(project,device.id,"alarms");
            try{
              res = await checkMD5(project,device.uid,MACRO_KEY_AR,payload);
              if(res){
                topic += "/set";
                let packet = {
                  topic : topic,
                  payload : res
                }
                client.publish(packet,(err)=>{
                  if(err) console.log(err)
                })
              }
            }catch(err){console.log(err);}
            break;
          }

        }

      }

    }

    if(topic.startsWith("app/")){
      topic = topic.substring(4);
      let index = topic.indexOf("/");

      let app_name = "";
      if(index > -1) app_name = topic.substring(0,index);
      else  return cb();

      topic = topic.substring(index+1);
      if(apps[app_name]){
        Project.addLog("logs_"+app_name,device.id,topic,payload);
        apps[app_name].module.parseMessage(client, device, topic, payload, ()=>{});
      }
    }

  },
}

async function checkConfigs(project,uid,payload,client){
  if(payload.includes(MACRO_WIFI)){
    // check db configs
    topics.fw.wifi.forEach(async(item, i) => {
      await getFWConfig(project,uid,item,client);
    });
  }else if(payload.includes(MACRO_LTE)){
    // check db configs
    topics.fw.lte.forEach(async(item, i) => {
      await getFWConfig(project,uid,item,client);
    });
  }

  topics.fw.settings.forEach(async(item, i) => {
    setTimeout(async ()=>{
      await getFWConfig(project,uid,item,client);
    },i*5000);
  });


  topics.fw.files.forEach(async(item, i) => {
    setTimeout(async ()=>{
      await getMD5File(project,uid,item,client);
    },30000+i*5000);
  });
}

async function getMD5File(project,uid,filename,client){
  return new Promise((resolve,reject)=>{
    let topic = project+"/"+uid+"/fw/"+filename+"/get";
    let payload = "";
    let packet = {
      topic : topic,
      payload : payload
    }
    client.publish(packet,(err)=>{
      if(err) return reject(err)
      else return resolve();
    })
  })
}

async function checkMD5(project,device,field,payload){

    return new Promise(async(resolve,reject) => {
      if(payload == null) resolve(null);

      try{
        payload = JSON.parse(payload)
      }catch(err){reject(err);}

      if(!payload.hasOwnProperty("md5"))
        resolve();

      try{
        res = await db.getFieldFromDeviceId(project,device.id,field);
        if(res != "" && res != null){
          if(md5(res) == payload.md5){
            resolve(null)
          }
          else{
            console.log("update file {} for uid {}",field,device.uid);
            resolve(res);
          }
        }
      }catch(err){reject(err);}
    });
  }

async function getFWConfig(project,uid,property,client){
  return new Promise((resolve,reject)=>{
    let topic = project+"/"+uid+"/fw/settings/"+property+"/get";
    let payload = "";
    let packet = {
      topic : topic,
      payload : payload
    }
    client.publish(packet,(err)=>{
      if(err) return reject(err)
      else return resolve();
    })
  })
}

async function getAppConfig(project,uid,property,client){
  return new Promise((resolve,reject)=>{
    let topic = project+"/"+uid+"/app/settings/"+property+"/get";
    let payload = "";
    let packet = {
      topic : topic,
      payload : payload
    }
    client.publish(packet,(err)=>{
      if(err) return reject(err)
      else return resolve();
    })
  })
}

async function checkDeviceFWVersion(uid,cb){
  let res = null;
  let update = false;
  let err = null;

  let fw_version = "";
  let db_fw_version = "";
  let project = null;
  let model = null;

  try{ device = await Device.get(uid)}
  catch(err){ console.log(err);}

  try{ project = await Project.getById(device.project_id)}
  catch(err){ console.log(err);}

  try{ model = await Model.getById(device.model_id)}
  catch(err){ console.log(err);}

  if(project == null || model == null)
    return cb(null,null,null);

  try{ latestfw_version = await getLatestFwVersion(model.name,project.fw_release)}
  catch(err){ return cb(err,null,null);}

  if(latestfw_version == null)
    return cb(null,null,null);

  try{
    let arr_fw_version = project.fw_version.split(".");
    arr_fw_version.forEach((item, i) => {
      if(i==0)
        fw_version = Number(item);
      else
        fw_version += "."+Number(item);
    });
  }catch(e){
    return cb(e,null,null);
  }

  try{
    let arr_version = latestfw_version.fw_version.split(".");
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
      return cb(null,device,latestfw_version);
    }else{
      return cb(null,device,null);
    }
  }catch(e){
    console.log(e)
    return cb(e,null,null);
  }

}

async function checkDeviceAppVersion(uid,cb){
  let res = null;
  let update = false;
  let err = null;

  let app_version = "";
  let db_app_version = "";
  let project = null;
  let model = null;

  try{ device = await Device.get(uid)}
  catch(err){ console.log(err);}

  try{ project = await Project.getById(device.project_id)}
  catch(err){ console.log(err);}

  try{ model = await Model.getById(device.model_id)}
  catch(err){ console.log(err);}

  if(project == null || model == null)
    return cb(null,null,null);

  try{ latestapp_version = await getLatestAppVersion(model.name,project.app_release)}
  catch(err){ return cb(err,null,null);}

  if(latestapp_version == null)
    return cb(null,null,null);

  try{
    let arr_app_version = project.app_version.split(".");
    arr_app_version.forEach((item, i) => {
      if(i==0)
        app_version = Number(item);
      else
        app_version += "."+Number(item);
    });
  }catch(e){
    return cb(e,null,null);
  }

  try{
    let arr_version = latestapp_version.app_version.split(".");
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
      console.log("app update version for device:",uid)
      return cb(null,device,latestapp_version);
    }else{
      return cb(null,device,null);
    }
  }catch(e){
    console.log(e)
    return cb(e,null,null);
  }

}

async function getLatestFwVersion(model,release){

  return new Promise( async (resolve,reject) => {

    let modelId = 0;
    try{ modelId = await Model.getById(model)}
    catch(err){ console.log(err);}

    if(modelId == null)
      resolve(null);

    try{
      let lastestfw = await Firmware.getLatestFWVersion(modelId,release)
      resolve(lastestfw);
    }catch(err){
      console.log(err);
      resolve(null);
    }
  });
}

async function getLatestAppVersion(model,release){

  return new Promise( async (resolve,reject) => {

    let modelId = 0;
    try{ modelId = await Model.getById(model)}
    catch(err){ console.log(err);}

    if(modelId == null)
      resolve(null);

    try{
      let latestfw = await Firmware.getLatestAppVersion(modelId,release)
      resolve(latestfw);
    }catch(err){
      console.log(err);
      resolve(null);
    }
  });
}
async function updateFwSetting(client,project,uid,setting,data,payload){
  return new Promise((resolve,reject)=>{

    if(data == null || data == "")
      return resolve();

    if(md5(data) == md5(payload))
        return resolve();

    let topic = project+"/"+uid+"/"+"fw"+"/"+setting+"/set";
    let packet = {
      topic : topic,
      payload : data
    }
    client.publish(packet,(err)=>{
      if(err) console.log(err)
      return resolve();
    })
  })
}
