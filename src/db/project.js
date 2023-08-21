const moment = require('moment');
var mysql = require('mysql2')
var db = require('../db/db.js');

var self = module.exports = {

	getById : async (projectId)=>{

	  return new Promise((resolve,reject) => {

	    let query = "SELECT * FROM ?? where id = ?";
	    let table = ["projects",projectId];
	    query = mysql.format(query,table);

	    db.queryRow(query)
	    .then( rows => {
	      if(rows.length > 0)
	        return resolve(rows[0]);
	      else
	        return resolve(null);
	    })
	    .catch( err => {
	      console.log(err);
	      return resolve(null);
	    });
	  });
	},

	getByName : async (project)=>{

	  return new Promise((resolve,reject) => {

	    let query = "SELECT * FROM ?? where name = ?";
	    let table = ["projects",project];
	    query = mysql.format(query,table);

	    db.queryRow(query)
	    .then( rows => {
	      if(rows.length > 0)
	        return resolve(rows[0]);
	      else
	        return resolve(null);
	    })
	    .catch( err => {
	      console.log(err);
	      return resolve(null);
	    });
	  });
	},

	getAll : async ()=>{

	  return new Promise((resolve,reject) => {

	    let query = "SELECT id,name FROM ??";
	    let table = ["projects"];
	    query = mysql.format(query,table);

	    db.queryRow(query)
	    .then( rows => {
		  return resolve(rows);
	    })
	    .catch( err => {
	      console.log(err);
	      return resolve(null);
	    });
	  });
	},

	insert : async(project, project_table, logs_table)=>{

		return new Promise((resolve,reject) => {
			let obj = {
				name : project,
				project_table : project_table,
				logs_table : logs_table,
				createdAt : moment().format('YYYY-MM-DD HH:mm:ss'),
				updatedAt : moment().format('YYYY-MM-DD HH:mm:ss')
			}

		    db.insert("projects",obj)
		    .then (rows => {
		      return resolve(rows[0]);
		    })
		    .catch(error => {
		      return reject(error);
		    });
		});
  	},

	update : async (project, deviceId, topic, payload)=>{

		return new Promise( async (resolve,reject) => {

			if(!payload) return resolve();

			let data = null;
			// check if data is in JSON format
			try{
				data = JSON.parse(payload);
			}catch(e){
				data = payload;
			}

			let obj = {
				updatedAt : moment().format('YYYY-MM-DD HH:mm:ss')
			}

			let db_columns = models.get(project);
			if(db_columns == null) return resolve();

			let index = topic.indexOf("/");

			if(index > -1){ // check if topic has subtopics
				let key = topic.substring(0,index);
				topic = topic.substring(index+1);

				if(db_columns.hasOwnProperty(key)){ // check if db has a column for this key
				  // create JSON struct with the remaining topic
				  // project is the table
				  // key is the column

				  // build object with the remaining topic and respective data
				  if(typeof data === "object")
				    obj[key] = JSON.stringify(parser.pathIntoObject(topic,JSON.stringify(data)))
				  else
				    obj[key] = JSON.stringify(parser.pathIntoObject(topic,data));

				  let exists = await self.getById(deviceId);

				  if(!exists){
				    obj['device_id'] = deviceId;
				    obj['createdAt'] = moment().format('YYYY-MM-DD HH:mm:ss');
				    db.insert(project,obj);
				  }else{
				    let filter = {
				      device_id : deviceId
				    }
				    db.update(project,obj,filter)
				    .then((rows)=>{
				    	return resolve(rows);
				    })
				    .catch((err)=>{
				    	console.log(err);
				    })
				  }

				}
			}else{

				let key = topic;
				if(db_columns.hasOwnProperty(key)){ // check if db has a column for this key
					// build object with respective data
					  if(typeof data === "object")
					obj[key] = JSON.stringify(data);
					else
					obj[key] = data;

					let exists = await self.getById(deviceId);
					if(!exists){
						obj['device_id'] = deviceId;
						obj['createdAt'] = moment().format('YYYY-MM-DD HH:mm:ss');
						db.insert(project,obj)
						.then((rows)=>{
							return resolve(rows);
						})
						.catch((err)=>{
							console.log(err);
							return resolve(null);
						})
						}else{
						let filter = {
						  device_id : deviceId
						}

						db.update(project,obj,filter)
						.then((rows)=>{
							return resolve(rows);
						})
						.catch((err)=>{
							console.log(err);
							return resolve(null);
						})
					}
				}else return resolve();
			}
		})
	},

	addLog : async (table, deviceId, topic, payload)=>{

	  return new Promise((resolve,reject) => {

	    if(!payload) return resolve();

	      let data = null;
	      // check if data is in JSON format
	      try{
	        data = JSON.parse(payload);
	      }catch(e){
	        data = payload;
	      }

	      let obj = {
	        updatedAt : moment().format('YYYY-MM-DD HH:mm:ss')
	      }

	      let db_columns = models.get(table);
	      if(db_columns == null)
	        return resolve();

	      let index = topic.indexOf("/");

	      if(index > -1){ // check if topic has subtopics
	        let key = topic.substring(0,index);
	        topic = topic.substring(index+1);

	        if(db_columns.hasOwnProperty(key)){ // check if db has a column for this key
	          // create JSON struct with the remaining topic
	          // key is the column

	          // build object with the remaining topic and respective data
	          if(typeof data === "object")
	            obj[key] = JSON.stringify(parser.pathIntoObject(topic,JSON.stringify(data)))
	          else
	            obj[key] = JSON.stringify(parser.pathIntoObject(topic,data));

	          obj['device_id'] = deviceId;
	          obj['createdAt'] = moment().format('YYYY-MM-DD HH:mm:ss');
	          db.insert(table,obj);

	        }
	      }else{

	        let key = topic;
	        if(db_columns.hasOwnProperty(key)){ // check if db has a column for this key
	          // build object with respective data
	          if(typeof data === "object")
	            obj[key] = JSON.stringify(data);
	          else
	            obj[key] = data;

	          obj['device_id'] = deviceId;
	          obj['createdAt'] = moment().format('YYYY-MM-DD HH:mm:ss');
	          db.insert(table,obj);
	        }
	      }
	    })
	    return resolve();
	},

}
