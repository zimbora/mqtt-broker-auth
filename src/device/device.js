const moment = require('moment');
var mysql = require('mysql2')
var async = require('async')
var _ = require('lodash');

var config = require("../../config");
var db = require('../db/db.js');
var Device = require('../db/device.js');
var Project = require('../db/project.js');

var devices = config.devices;

var self = module.exports = {

  init : ()=>{

    Object.keys(devices).map( (name)=>{
      devices[name].module = require('./'+name+".js")
      devices[name].module.init();
    })
  },

  parseMessage : async (client,topic,payload)=>{

    let index = topic.indexOf(MACRO_UID_PREFIX);
    if(index == -1)
        return;
    let project = topic.substring(0,index-1);
    topic = topic.substring(index);
    index = topic.indexOf("/");
    if(index == -1)
        return;
    let uid = topic.substring(0,index);
    topic = topic.substring(index+1);

    if(uid.startsWith(MACRO_UID_PREFIX)){
      let device = await Device.get(uid);
      if(device == null){
        await Device.insert(uid,project);
        device = await Device.get(uid);
      }else if(topic.endsWith("status")){
        if(payload == "online")
          await Device.update(uid,project,payload);
        else if(payload == "offline")
          await Device.update(uid,project,payload);
      }

      if(devices[project]){
        device['info'] = await Project.getDevice(project,device?.id);
        devices[project].module.parseMessage(client,project,device,topic,payload,()=>{});
      }
    }

  },

}

