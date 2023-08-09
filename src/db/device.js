const moment = require('moment');
var mysql = require('mysql2')
var db = require('../db/db.js');

var self = module.exports = {

	get : async (uid)=>{
		return new Promise((resolve,reject) => {

			let query = "SELECT id,uid,project,status FROM ?? where uid = ?";
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

	insert : async(uid, project)=>{

		return new Promise((resolve,reject) => {
			let obj = {
				uid : uid,
				project : project,
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

  	update : async(uid,project,status)=>{
		return new Promise((resolve,reject) => {

		    let obj = {
		      project : project,
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


}
