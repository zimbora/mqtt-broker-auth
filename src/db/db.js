var config = require('../../config');
var mysql = require('mysql2');

var pool;

var self = module.exports = {
  connect : (cb)=>{
    pool      =    mysql.createPool({
      connectionLimit : config.mysqldb.conn_limit,
      host     : config.mysqldb.host,
      port     : config.mysqldb.port,
      user     : config.mysqldb.user,
      password : config.mysqldb.pwd,
      database : config.mysqldb.name,
      debug    : false
    });
    pool.getConnection(function(err,connection){
        if(err) {
          console.log("ISSUE WITH MYSQL \n" + err);
          process.exit(1);
        } else {
          setInterval(function(){self.pingMySQL(connection);}, 3600000); // 1 hour
          connection.on('error', function(err) {
            console.log("Mysql error: "+err.code); // 'ER_BAD_DB_ERROR'
            process.exit(1);
          });
          cb();
        }
    });
  },

  getConnection : (cb)=>{
    pool.getConnection(function(err, connection) {
      cb(err,connection);
    });
  },

  pingMySQL : (connection)=>{
    connection.ping(function (err) {
      if (err) throw err;
      //console.log(String(Date.now())+'Server responded to ping');
    });
  },

  get_non_persistent_db_connection : (db_name,cb)=>{
    let pool2      =    mysql.createPool({
        connectionLimit : 100,
        host     : config.mysqldb.host,
        port     : config.mysqldb.port,
        user     : config.mysqldb.user,
        password : config.mysqldb.pwd,
        database : db_name,
        debug    :  false,
        multipleStatements: true
    });
    pool2.getConnection(function(err,connection){
      cb(err,connection);
    });
  },

  close_db_connection : (connection)=>{
    if(connection != null){
      connection.release();
    }
  },

  queryRow : async (query)=>{
    return new Promise((resolve,reject) => {

        self.getConnection((err,conn)=>{
          if(err) return reject(err);

          conn.query(query,function(err,rows){
            self.close_db_connection(conn);
            if(err) return reject(err)
            else return resolve(rows);
          });
        });
      });
  },

  insert : async(table,data)=>{

    return new Promise((resolve,reject) => {
      self.getConnection((err,conn)=>{
        if(err) return reject(err);

        let query = "";
        let values = [];

        if(typeof data === "object"){
          const keys = Object.keys(data);
          values = Object.values(data);
          const placeholders = values.map(() => '?').join(', ');
          query = `INSERT INTO ${mysql.escapeId(table)} (${keys.map(k => mysql.escapeId(k)).join(', ')}) VALUES (${placeholders})`;
        }else{
          return reject("data passed is not an object");
        }

        query = mysql.format(query,values);

        conn.query(query,function(err,rows){
          self.close_db_connection(conn);
          if(err) return reject(err)
          else return resolve(rows);
        });
      });
    });
  },

  update : async (table, data, filter) => {

    return new Promise((resolve, reject) => {
      self.getConnection((err, conn) => {
        if (err) return reject(err);

        let query = "";
        let values = [];

        if (typeof data === "object") {
          const keys = Object.keys(data);
          values = Object.values(data);
          query = `UPDATE ${mysql.escapeId(table)} SET ${keys.map(key => `${mysql.escapeId(key)} = ?`).join(', ')}`;
        } else {
          return reject("data passed is not an object");
        }

        if (typeof filter === "object") {
          const filterKeys = Object.keys(filter);
          const filterValues = Object.values(filter);
          query += ` WHERE ${filterKeys.map(key => `${mysql.escapeId(key)} = ?`).join(' AND ')}`;
          values.push(...filterValues);
        } else {
          return reject("filter passed is not an object");
        }

        query = mysql.format(query, values);

        conn.query(query, function (err, rows) {
          self.close_db_connection(conn);
          if (err) return reject(err);
          else return resolve(rows);
        });
      });
    });
  },

  updateJSON : async (table, column, data, filter) => {

    return new Promise((resolve, reject) => {
      self.getConnection((err, conn) => {
        if (err) return reject(err);

        let query = "";
        let values = [];

        if (typeof data === "object") {
          const keys = Object.keys(data);
          const escapedTable = mysql.escapeId(table);
          const escapedColumn = mysql.escapeId(column);
          query = `UPDATE ${escapedTable} SET ${escapedColumn} = `;
          for (let index = 0; index < keys.length; index++) {
            const key = keys[index];
            if (!/^[a-zA-Z0-9_]+$/.test(key)) {
              return reject(new Error(`Invalid JSON key: ${key}`));
            }
            query += `JSON_SET(${escapedColumn}, '$.${key}', ?)`;
            values.push(data[key]);
            if (index !== keys.length - 1) {
              query += ', ';
            }
          }
        } else {
          return reject("data passed is not an object");
        }

        if (typeof filter === "object") {
          const filterKeys = Object.keys(filter);
          const filterValues = Object.values(filter);
          query += ` WHERE ${filterKeys.map(key => `${mysql.escapeId(key)} = ?`).join(' AND ')}`;
          values.push(...filterValues);
        } else {
          return reject("filter passed is not an object");
        }

        query = mysql.format(query, values);

        conn.query(query, function (err, rows) {
          self.close_db_connection(conn);
          if (err) return reject(err);
          else return resolve(rows);
        });
      });
    });
  },

  delete : async(table,filter)=>{

    return new Promise((resolve,reject) => {

      self.getConnection((err,conn)=>{
        if(err) return reject(err);

        let query = "";
        if(typeof filter === "object"){
          let values = [];
          query = `DELETE FROM ${mysql.escapeId(table)} WHERE `;
          for (let key in filter){
            if(values.length > 0)
              query += " AND ";
            query += mysql.escapeId(key) + " = ?"
            values.push(filter[key]);
          }
          query = mysql.format(query,values);
        }else{
          return reject("filter passed is not an object");
        }

        conn.query(query,function(err,rows){
          self.close_db_connection(conn);
          if(err) return reject(err)
          else return resolve(rows);
        });
      });
    });
  },

  getFieldFromDeviceId : async (table,deviceId,field)=>{

    return new Promise((resolve,reject) => {

      self.getConnection((err,conn)=>{
        if(err) return reject(err);

        let query = "SELECT ?? FROM ?? where device_id = ?";
        let args = [field,table,deviceId];
        query = mysql.format(query,args);
        conn.query(query,function(err,rows){
          self.close_db_connection(conn);
          if(err) return reject(err)
          else{
            if(rows.length == 1 ){
              return resolve(rows[0][field]);
            }else return resolve(null);
          }
        });
      });
    });
  },

  getPropertyFromDeviceId : async(table,deviceId,field,key)=>{

    return new Promise((resolve,reject) => {

      self.getConnection((err,conn)=>{
        if(err) return reject(err);

        let query = "SELECT ?? FROM ?? where device_id = ?";
        let args = [field,table,deviceId];

        query = mysql.format(query,args);
        conn.query(query,function(err,rows){
          self.close_db_connection(conn);
          if(err) return reject(err)
          else{
            if(rows.length == 1 && rows[0]?.field && rows[0][field]?.key){
              return resolve(rows[0][field][key]);
            }else return resolve(null);
          }
        });
      });
    });
  }
}

