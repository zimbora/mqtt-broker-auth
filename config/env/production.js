module.exports = {
  env: 'production',
  web:{
    protocol : "http://",
    domain: '192.168.1.108',
    fw_path : '/api/firmware/download/'
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
