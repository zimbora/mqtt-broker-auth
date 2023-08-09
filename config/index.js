module.exports = {
  version : "1.0.3",
  dev : process.env.dev || "true",
  mq : process.env.MQ || "redis", // redis or mongo
  persistence : process.env.PERSISTENCE || "mongo", //"redis or mongo",
  web:{
    protocol : process.env.HTTP_PROTOCOL  || "http://",
    domain: process.env.DOMAIN            || '192.168.1.101',
    fw_path : '/api/firmware/'
  },
  port:{
    mqtt : process.env.MQTT_PORT    || 1883,
    mqtts : process.env.MQTTS_PORT  || 8883,
    ws : process.env.WS_PORT        || 8888,
    wss : process.env.WSS_PORT      || 443,
  },
  mysqldb: {
    conn_limit: process.env.DB_CONN_LIMIT || 15,
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'user',
    pwd: process.env.DB_PWD   || 'user_pwd',
    name: process.env.DB_NAME || 'mqtt-aedes',
  },
  redis: {
    //url : process.env.REDIS_URL || 'redis://127.0.0.1:55457'
    url : process.env.REDIS_URL || 'redis://127.0.0.1:6379'
  },
  mongodb: {
    url: process.env.MONGO_URL || 'mongodb://127.0.0.1/aedes-clusters',
    workers: process.env.WORKERS || 3
  },
  devices: {
    "rtls-linux" : {},
    "freeRTOS2" : {}
  },
  apps: {
    "HH" : {},
  }
}
