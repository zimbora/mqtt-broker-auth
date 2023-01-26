module.exports = {
  env: 'development',
  web:{ // service to do firmware download
    protocol : "http://",
    domain: '192.168.1.108', // port 80 must be used, bcs of fw download
    fw_path : '/api/firmware/'
  },
  port:{
    mqtt : 1883,
    //mqtts : ,
    ws : 8888,
    //wss : ,
  },
  db: {
    host:'localhost',
    port: 3306,
    user:'user',
    pwd:'user_pwd',
    name:'mqtt-aedes',
  }
}
