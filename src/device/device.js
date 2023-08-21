const moment = require('moment');
var mysql = require('mysql2')
var async = require('async')
var _ = require('lodash');

var config = require("../../config");
var db = require('../db/db.js');
var Device = require('../db/device.js');
var Project = require('../db/project.js');
var Model = require('../db/model.js');

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
        await Device.insert(uid);
        device = await Device.get(uid);
      }

      if(device.project_id == null){
        let res = await Project.getByName(project);
        let project_id = res?.id;

        if(project_id == null && devices[project]){
          let project_table = devices[project]?.project_table;
          let logs_table = devices[project]?.logs_table;
          Project.insert(project,project_table,logs_table);
        }

        Device.updateProject(uid,project_id);
      }

      if(topic.endsWith("status")){
        if(payload == "online" || payload == "offline")
          await Device.updateStatus(uid,payload);
      }else if(topic.endsWith("model")){

        let model = payload;
        let res = await Model.getByName(model);
        let model_id = res?.id;

        if(model_id == null && devices[project]){
          if(devices[project]?.models[payload]){
            let model_table = devices[project].models[payload]?.model_table;
            let logs_table = devices[project].models[payload]?.logs_table;
            Model.insert(model,model_table,logs_table);
            res = await Model.getByName(model);
            model_id = res?.model_id;
          }
        }
        Device.updateModel(uid,model_id);
      }

      if(devices[project]){
        //device['info'] = await Project.getDevice(project,device?.id);
        devices[project].module.parseMessage(client,project,device,topic,payload,()=>{});
      }
    }

  },

}

