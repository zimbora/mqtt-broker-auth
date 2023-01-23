var config = require('../../config/env');
var mysql = require('mysql2');

var pool;

function connect(cb){
    pool      =    mysql.createPool({
      connectionLimit : 100,
      host     : config.db.host,
      port     : config.db.port,
      user     : config.db.user,
      password : config.db.pwd,
      database : config.db.name,
      debug    : false
  });
  pool.getConnection(function(err,connection){
      if(err) {
        console.log("ISSUE WITH MYSQL \n" + err);
        process.exit(1);
      } else {
        setInterval(function(){pingMySQL(connection);}, 3600000); // 1 hour
        connection.on('error', function(err) {
          console.log("Mysql error: "+err.code); // 'ER_BAD_DB_ERROR'
        });
        cb();
      }
  });
}

function getConnection(cb){
  pool.getConnection(function(err, connection) {
    cb(err,connection);
  });
}

function pingMySQL(connection){
  connection.ping(function (err) {
    if (err) throw err;
    //console.log(String(Date.now())+'Server responded to ping');
  });
}

function get_non_persistent_db_connection(db_name,cb){
  let pool2      =    mysql.createPool({
      connectionLimit : 100,
      host     : config.db.host,
      user     : config.db.user,
      password : config.db.pwd,
      database : db_name,
      debug    :  false,
      multipleStatements: true
  });
  pool2.getConnection(function(err,connection){
    cb(err,connection);
  });
}

function close_db_connection(connection){
  if(connection != null){
    connection.destroy();
  }
}


module.exports =  {connect,getConnection,get_non_persistent_db_connection,close_db_connection};
