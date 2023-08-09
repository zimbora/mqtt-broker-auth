const moment = require('moment');
var mysql = require('mysql2')
var db = require('../db/db.js');

var self = module.exports = {

	getId : async (model)=>{

	  return new Promise((resolve,reject) => {

	    let query = "SELECT id FROM fwModels where name = ?";
	    let table = [model];
	    query = mysql.format(query,table);

	    db.queryRow(query)
	    .then( rows => {
	      if(rows.length > 0)
	        return resolve(rows[0].id);
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
