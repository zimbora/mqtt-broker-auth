const moment = require('moment');
var mysql = require('mysql2')
var db = require('../db/db.js');

var self = module.exports = {

	getLatestFWVersion : async (modelId,release)=>{

	  return new Promise((resolve,reject) => {

	    let query = "";
		let table = [];

		if(release == "stable"){
			query = `SELECT fw_version,filename,token FROM firmwares where model_id = ? and fw_release = ? ORDER BY CAST(SUBSTRING_INDEX(fw_version, '.', 1) AS UNSIGNED) DESC,
			 CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(fw_version, '.', 2), '.', -1) AS UNSIGNED) DESC,
			 CAST(SUBSTRING_INDEX(fw_version, '.', -1) AS UNSIGNED) DESC
			 LIMIT 1`;
			table = [modelId,release];
		}else{
			query = `SELECT fw_version,filename,token FROM firmwares where model_id = ? ORDER BY CAST(SUBSTRING_INDEX(fw_version, '.', 1) AS UNSIGNED) DESC,
			 CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(fw_version, '.', 2), '.', -1) AS UNSIGNED) DESC,
			 CAST(SUBSTRING_INDEX(fw_version, '.', -1) AS UNSIGNED) DESC
			 LIMIT 1`;
			table = [modelId];
		}

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

	getLatestAppVersion : async (modelId,release)=>{

	  return new Promise((resolve,reject) => {

	    let query = "";
		let table = [];

		if(release == "stable"){
			query = `SELECT app_version,filename,token FROM firmwares where model_id = ? and fw_release = ? ORDER BY CAST(SUBSTRING_INDEX(app_version, '.', 1) AS UNSIGNED) DESC,
			 CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(app_version, '.', 2), '.', -1) AS UNSIGNED) DESC,
			 CAST(SUBSTRING_INDEX(app_version, '.', -1) AS UNSIGNED) DESC
			 LIMIT 1`;
			table = [modelId,release];
		}else{
			query = `SELECT app_version,filename,token FROM firmwares where model_id = ? ORDER BY CAST(SUBSTRING_INDEX(app_version, '.', 1) AS UNSIGNED) DESC,
			 CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(app_version, '.', 2), '.', -1) AS UNSIGNED) DESC,
			 CAST(SUBSTRING_INDEX(app_version, '.', -1) AS UNSIGNED) DESC
			 LIMIT 1`;
			table = [modelId];
		}

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
}
