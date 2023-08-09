const moment = require('moment');

parser = require('../aux/parser');
models = require("../../models/models");

MACRO_UID_PREFIX          = "uid:"

module.exports = {

  init : ()=>{
    console.log("Init rtls-linux module");

    seq = models.init();
    models.load();
  },

  parseMessage : async (uid, project, topic, payload, cb)=>{

    if(!payload) return cb();

    let data = null;
    // check if data is in JSON format
    try{
      data = JSON.parse(payload);
    }catch(e){
      data = payload;
    }

    let obj = {
      uid : uid,
      createdAt : moment().format('YYYY-MM-DD HH:mm:ss'),
      updatedAt : moment().format('YYYY-MM-DD HH:mm:ss')
    }

    let db_columns = models.get(project);

    let index = topic.indexOf("/");

    if(index > -1){ // check if topic has subtopics
      let key = topic.substring(0,index);
      topic = topic.substring(index+1);

      if(db_columns.hasOwnProperty(key)){ // check if db has a column for this key
        // create JSON struct with the remaining topic
        // dev_type is the table
        // key is the column

        // build object with the remaining topic and respective data
        if(typeof data === "object")
          obj[key] = JSON.stringify(parser.pathIntoObject(topic,JSON.stringify(data)))
        else
          obj[key] = JSON.stringify(parser.pathIntoObject(topic,data));

        db.insert(dev_type,obj);
      }
    }else{

      let key = topic;
      if(db_columns.hasOwnProperty(key)){ // check if db has a column for this key
        // build object with respective data
        if(typeof data === "object")
          obj[key] = JSON.stringify(data);
        else
          obj[key] = data;

        db.insert(dev_type,obj);
      }
    }
    return cb("published");

  }


}
