const moment = require('moment');
var mysql = require('mysql2')
var db = require('../db/db.js');

var self = module.exports = {

	get : async (uid)=>{
		return new Promise((resolve,reject) => {

			let query = "SELECT id,uid,project_id,model_id,status FROM ?? where uid = ?";
		    let table = ["devices",uid];
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

	insert : async(uid)=>{

		return new Promise((resolve,reject) => {
			let obj = {
				uid : uid,
				createdAt : moment().format('YYYY-MM-DD HH:mm:ss'),
				updatedAt : moment().format('YYYY-MM-DD HH:mm:ss')
			}

		    db.insert("devices",obj)
		    .then (rows => {
		      return resolve(rows[0]);
		    })
		    .catch(error => {
		      return reject(error);
		    });
		});
  	},

  	updateStatus : async(uid,status)=>{
		return new Promise((resolve,reject) => {

		    let obj = {
		      status : status,
		      updatedAt : moment().format('YYYY-MM-DD HH:mm:ss')
		    };

		    let filter = {
		      uid : uid,
		    };

		    db.update("devices",obj,filter)
		    .then (rows => {
		      return resolve(rows);
		    })
		    .catch(error => {
		      return reject(error);
			});
	  });
  	},

  	updateProject : async(uid,project_id)=>{
		return new Promise((resolve,reject) => {

		    let obj = {
		      project_id : project_id,
		      updatedAt : moment().format('YYYY-MM-DD HH:mm:ss')
		    };

		    let filter = {
		      uid : uid,
		    };

		    db.update("devices",obj,filter)
		    .then (rows => {
		      return resolve(rows);
		    })
		    .catch(error => {
		      return reject(error);
			});
	  });
  	},

  	updateModel : async(uid,model_id)=>{
		return new Promise((resolve,reject) => {

		    let obj = {
		      model_id : model_id,
		      updatedAt : moment().format('YYYY-MM-DD HH:mm:ss')
		    };

		    let filter = {
		      uid : uid,
		    };

		    db.update("devices",obj,filter)
		    .then (rows => {
		      return resolve(rows);
		    })
		    .catch(error => {
		      return reject(error);
			});
	  });
  	},
}
