module.exports = {
  version : "1.1.4",
  dev : process.env.dev || "true",
  mq : process.env.MQ || "redis", // redis or mongo
  persistence : process.env.PERSISTENCE || "mongo", //"redis or mongo",
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
  },
  kafka: {
    brokers: process.env.KAFKA_BROKERS ? process.env.KAFKA_BROKERS.split(',') : ['localhost:9092'],
    clientId: process.env.KAFKA_CLIENT_ID || 'mqtt-broker-auth',
    topic: process.env.KAFKA_TOPIC || 'mqtt-messages',
    enabled: process.env.KAFKA_ENABLED === 'true' || false,
  },
  workers: process.env.WORKERS || 3
}
