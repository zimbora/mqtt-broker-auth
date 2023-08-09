const moment = require('moment');
var mysql = require('mysql2')

const models = require("../../models/models");
const Project = require('../db/project.js');

module.exports = {

  init : ()=>{
    console.log("Init HH module");

    seq = models.init();
    models.load();

  },

  parseMessage : async (client,device, topic, payload, cb)=>{

    index = topic.lastIndexOf("/");
    let property =  topic.substring(index+1);
    Project.addLog("logs_HH",device.id,property,payload);
  },
}
