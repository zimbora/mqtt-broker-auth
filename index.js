// mqtt
const cluster = require('cluster')
const Aedes = require('aedes');
const { createServer } = require('net');
const { cpus } = require('os')

var config = require('./config');
var auth = require('./src/auth/auth.js');
var kafka = require('./src/kafka/kafka.js');
//var device = require('./src/device/device.js');

// websocket
const httpServer = require('http').createServer()
const ws = require('websocket-stream')

// best configuration mqemitter-redis + aedes-persistence-mongodb
const mq = config.mq === 'redis'
  ? require('mqemitter-redis')({
    connectionString: config.redis.url
  })
  : require('mqemitter-mongodb')({
    url: config.mongodb.url
  })

const persistence = config.persistence === 'redis'
  ? require('aedes-persistence-redis')({
    connectionString: config.redis.url
  })
  : require('aedes-persistence-mongodb')({
    url: config.mongodb.url,
    ttl: {
      packets: {
        incoming: 100,
        outgoing: 100,
        will: -1,
        retained: -1
      }, // Number of seconds
      subscriptions: -1,
    }
  })

function startAedes(){

  const aedes = Aedes({
    id: 'BROKER_' + cluster.worker.id,
    mq,
    persistence
  })

  // Initialize services
  const initServices = async () => {
    auth.init();
    await kafka.init(cluster.worker.id);
    //device.init();
  };

  initServices().catch(console.error);

  // authenticate the connecting client
  aedes.authenticate = async (client, user_type, password, callback) => {

    if(Buffer.isBuffer(password) || typeof password === 'string'){
      if(Buffer.isBuffer(password))
        password = Buffer.from(password, 'base64').toString();
    }else{
      console.log("Uncapable to parse password:",password);
      const error = new Error('Authentication Failed!! Uncapable to parse password.');
      return callback(error, false);
    }

    let authorized = await auth.checkUser(user_type,password);
    if(authorized){

      if(user_type == 'device'){
        // password can be used here to validate device

        // check if device is registered
        const registeredDevice = await auth.checkDevice(client.id);
        if(registeredDevice){
          console.log(`device ${client.id} authorized`);
          return callback(null, true);
        }else{
          console.log(`device ${client.id} not registered`);
          return callback(null, true);
        }
      }

      if(user_type == 'client'){
        // password can be used here to validate client

        // check if client is registered
        const registeredClient = await auth.checkClient(client.id);
        if(registeredClient){
          console.log(`client ${client.id} authorized`);
          return callback(null, true);
        }else{
          console.log(`client ${client.id} not registered`);
          return callback(null, true);
        }
      }

      if(authorized.level >= 4){
        // user is always authorized to access mqtt broker
        return callback(null, true);
      }

    }else{
      console.log('Error ! Authentication failed.')
      const error = new Error('Authentication Failed!! Invalid user credentials: '+user_type+'@'+password);
      return callback(error, false);
    }
  }

  // authorizing client to subscribe on a message topic
  aedes.authorizeSubscribe = async (client, sub, callback) => {

    const clientId = client.id;
    const user = client?._parser?.settings?.username;
    const pwd = client?._parser?.settings?.password?.toString();
    
    let authorized = await auth.checkSubscribeAuthorization(clientId,user,pwd,sub.topic)
    if(authorized){
      return callback(null,sub);
    }else{
      console.log(`${client.id} not authorized to subscribe topic: ${sub.topic}`);
      return callback(new Error('You are not authorized to subscribe on this message topic.'));
    }
  }

  // authorizing client to publish on a message topic
  aedes.authorizePublish = async (client, packet, callback) => {
    if (packet.topic.startsWith("$SYS")) {
      return callback(new Error("$SYS" + ' topic is reserved'))
    }

    const clientId = client?.id;
    const user = client?._parser?.settings?.username;
    const pwd = client?._parser?.settings?.password?.toString();

    if(!clientId || !user || !pwd)
      return;

    let authorized = await auth.checkPublishAuthorization(clientId,user,pwd,packet.topic)
    if(authorized){
      return callback(null);
    }else{
      console.log(`${client.id} not authorized to publish on topic: ${packet.topic}`);
      //sreturn callback(new Error('You are not authorized to publish on this message topic.'));
    }
    
  }

  // emitted when a client connects to the broker
  aedes.on('client', function (client) {
    console.log(`[CLIENT_CONNECTED] Client ${(client ? client.id : client)} connected to broker ${aedes.id}`)
  })

  aedes.on('clientError', function (client, err) {
    console.log('client error', client.id, err.message, err.stack)
  })

  aedes.on('connectionError', function (connection, err) {
    console.log('connection error', connection.id, err.message, err.stack)
  })

  // emitted when a client disconnects from the broker
  aedes.on('clientDisconnect', function (client) {
    console.log(`[CLIENT_DISCONNECTED] Client ${(client ? client.id : client)} disconnected from the broker ${aedes.id}`)
  })

  // emitted when a client subscribes to a message topic
  aedes.on('subscribe', function (subscriptions, client) {
    console.log(`[TOPIC_SUBSCRIBED] Client ${(client ? client.id : client)} subscribed to topics: ${subscriptions.map(s => s.topic).join(',')} on broker ${aedes.id}`)
  })

  // emitted when a client unsubscribes from a message topic
  aedes.on('unsubscribe', function (subscriptions, client) {
    console.log(`[TOPIC_UNSUBSCRIBED] Client ${(client ? client.id : client)} unsubscribed to topics: ${subscriptions.join(',')} from broker ${aedes.id}`)
  })

  // emitted when a client publishes a message packet on the topic
  aedes.on('publish', async function (packet, client) {

    // Skip system topics from being published to Kafka
    if (packet.topic.startsWith('$SYS/')) {
      return;
    }

    try {
      // Prepare client information for Kafka message
      const clientInfo = client ? {
        id: client.id,
        username: client._parser?.settings?.username || null,
      } : null;

      // Publish to Kafka
      await kafka.publishMessage(packet, clientInfo);
    } catch (error) {
      console.error(`[MQTT_PUBLISH] Error publishing to Kafka for topic '${packet.topic}':`, error.message);
    }

    /*
    let topic = packet.topic;
    let payload = String(packet.payload);

    if (client) {

      if(topic.includes("uid:")){
        device.parseMessage(client,topic,payload);
      }

    }
    */
  })


  const server = createServer(aedes.handle)

  // mqtt

  server.on('error', function (err) {
    console.log('Server error', err)
    process.exit(1)
  })

  server.listen(config.port.mqtt, function () {
    console.log(`MQTT Broker running on port: ${config.port.mqtt}`);
  });

  // websocket
  ws.createServer({ server: httpServer }, aedes.handle)
  httpServer.listen(config.port.ws, function () {
    console.log('websocket server listening on port ', config.port.ws)
  })

}


process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // exit with failure code
  if(config.dev)
    process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await kafka.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await kafka.disconnect();
  process.exit(0);
});

if (cluster.isMaster) {
  console.log(config)
  //const numWorkers = cpus().length
  const numWorkers = config.workers
  for (let i = 0; i < numWorkers; i++) {
    cluster.fork()
  }

  cluster.on('online', function (worker) {
    console.log('Worker ' + worker.process.pid + ' is online')
  })

  cluster.on('exit', function (worker, code, signal) {
    console.log('Worker ' + worker.process.pid + ' died with code: ' + code + ', and signal: ' + signal)
    console.log('Starting a new worker')
    cluster.fork()
  })
} else {
  startAedes()
}
