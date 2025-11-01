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
    brokers: (process.env.KAFKA_BROKERS || 'localhost:29092').split(','),
    clientId: process.env.KAFKA_CLIENT_ID || 'mqtt-broker-auth',
    topics: (process.env.KAFKA_TOPICS || 'inlocMsgsSniffed,freeRTOS2,lwm2m').split(','),
    enabled: process.env.KAFKA_ENABLED === 'true' || true,
    auth: {
      enabled: process.env.KAFKA_AUTH_ENABLED === 'true' || false,
      mechanism: 'scram-sha-256', // or 'scram-sha-256', 'scram-sha-512', etc.
      username: process.env.KAFKA_AUTH_USER,
      password: process.env.KAFKA_AUTH_PWD,
      ssl: false // set to true if your Kafka requires SSL
    }
  },
  workers: process.env.WORKERS || 3
}
