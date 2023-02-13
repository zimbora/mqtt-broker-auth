// mqtt
const cluster = require('cluster')
const Aedes = require('aedes');
const { createServer } = require('net');
const { cpus } = require('os')

var config = require('./config');

var auth = require('./src/auth/auth.js');
var device = require('./src/device/device.js');

// websocket
const httpServer = require('http').createServer()
const ws = require('websocket-stream')

// best configuration mqemitter-reds + aedes-persistence-mongodb
const mq = process.env.MQ === 'redis'
  ? require('mqemitter-redis')({
    port: process.env.REDIS_PORT || 6379
  })
  : require('mqemitter-mongodb')({
    url: config.mongodb.url
  })

const persistence = process.env.PERSISTENCE === 'redis'
  ? require('aedes-persistence-redis')({
    port: process.env.REDIS_PORT || 6379
  })
  : require('aedes-persistence-mongodb')({
    url: config.mongodb.url
  })

function startAedes(){

  const aedes = Aedes({
    id: 'BROKER_' + cluster.worker.id,
    mq,
    persistence
  })

 const server = createServer(aedes.handle)

  // mqtt
  server.listen(config.port.mqtt, function () {
      console.log(`MQTT Broker running on port: ${config.port.mqtt}`);
  });

  server.on('error', function (err) {
     console.log('Server error', err)
     process.exit(1)
   })

  // websocket
  ws.createServer({ server: httpServer }, aedes.handle)
  httpServer.listen(config.port.ws, function () {
    console.log('websocket server listening on port ', config.port.ws)
  })

  auth.init();

  // authenticate the connecting client
  aedes.authenticate = async (client, username, password, callback) => {

      if(Buffer.isBuffer(password) || typeof password === 'string')
        password = Buffer.from(password, 'base64').toString();
      else{
        console.log("Uncapable to parse password:",password);
        return callback("Uncapable to parse password", false);
      }

      let authorized = await auth.checkUser(username,password);
      if(authorized){
        console.log(`client ${client.id} authorized`);
        await auth.addClient(client.id,username,password);
        return callback(null, true);
      }else{
        console.log('Error ! Authentication failed.')
        const error = new Error('Authentication Failed!! Invalid user credentials.');
        return callback(error, false);
      }
  }

  // authorizing client to subscribe on a message topic
  aedes.authorizeSubscribe = async (client, sub, callback) => {

      let authorized = await auth.checkSubscribeAuthorization(client.id,sub.topic)
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
      let authorized = await auth.checkPublishAuthorization(client.id,packet.topic)
      if(authorized){
        return callback(null);
      }else{
        console.log(`${client.id} not authorized to publish on topic: ${packet.topic}`);
        return callback(new Error('You are not authorized to publish on this message topic.'));
      }
  }

  // emitted when a client connects to the broker
  aedes.on('client', function (client) {
      console.log(`[CLIENT_CONNECTED] Client ${(client ? client.id : client)} connected to broker ${aedes.id}`)
  })

  aedes.on('clientError', function (client, err) {
    console.log('client error', client.id, err.message, err.stack)
  })

  aedes.on('connectionError', function (client, err) {
    console.log('client error', client, err.message, err.stack)
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
      if (client) {
        let topic = packet.topic;
        let payload = String(packet.payload);
        if(topic.includes("uid:")){
          let index = topic.indexOf("uid:")
          let project = topic.substr(0,index-1);
          let uid = topic.substr(index);
          index = uid.indexOf("/");
          uid = uid.substr(0,index);

          let field = "", key = "";
          if(topic.endsWith("/fw_version"))
            field = "fw_version";
          else if(topic.endsWith("/app_version")){
            field = "app_version";
          }else if(topic.endsWith("/status")){
            field = "status";
            device.updateDevice(uid,"project",project,()=>{});
          }else if(topic.endsWith("/model")){
            field = "model";
          }else if(topic.endsWith("/ar/set")){
            field = "autorequests"
            payload = JSON.stringify(payload);
          }else if(topic.endsWith("/alarm/set")){
            field = "alarms"
            payload = JSON.stringify(payload);
          }else if(topic.endsWith("/js/code/set")){
            field = "js_program"
          }else if(topic.endsWith("app/setpoints/set")){
            field = "setpoints"
            payload = JSON.stringify(payload);
          }else if(topic.includes("fw/settings")){
            if(payload != null && payload != "" && typeof payload != "undefined"){
              field = "fw_settings";
              let subtopic = "fw/settings/"
              let index = topic.indexOf(subtopic)
              subtopic = topic.substring(index+subtopic.length);
              index = subtopic.indexOf("/");
              if(index > -1)
                key = subtopic.substring(0,index);
              else
                key = subtopic
            }
          }else if(topic.includes("app/settings")){
            if(payload != null && payload != "" && typeof payload != "undefined"){
              field = "app_settings";
              let subtopic = "app/settings/"
              let index = topic.indexOf(subtopic)
              subtopic = topic.substring(index+subtopic.length);
              index = subtopic.indexOf("/");
              if(index > -1)
                key = subtopic.substring(0,index);
              else
                key = subtopic
            }
          }

          if(field != "" && payload != "" && key != "") // use it update json key
            device.updateDeviceJSON(uid,field,key,payload);
          else if(field != "" && payload != "")
            device.updateDevice(uid,field,payload,()=>{

              if(field == "fw_version"){
                // check if fw upload is needed
                device.checkDeviceFWVersion(uid,(err,dev,fw)=>{
                  if(err)
                    console.log(err);
                  else if(fw != null){
                    console.log("update: "+uid+" for:",fw);
                    let topic = dev.project+"/"+uid+"/fw/fota/update/set";
                    let payload = {
                      url : config.web.protocol+config.web.domain+config.web.fw_path+fw.filename+"/download?token="+fw.token
                    }
                    let packet = {
                      topic : topic,
                      payload : JSON.stringify(payload)
                    }
                    client.publish(packet,(err)=>{
                      if(err) console.log(err)
                    })
                  }
                });
              }else if(field == "app_version"){
                // check if fw upload is needed
                device.checkDeviceAppVersion(uid,(err,dev,fw)=>{
                  if(err)
                    console.log(err);
                  else if(fw != null){
                    console.log("update: "+uid+" for:",fw);
                    let topic = dev.project+"/"+uid+"/fw/fota/update/set";
                    let payload = {
                      url : config.web.protocol+config.web.domain+config.web.fw_path+fw.filename+"/download?token="+fw.token
                    }
                    let packet = {
                      topic : topic,
                      payload : JSON.stringify(payload)
                    }
                    client.publish(packet,(err)=>{
                      if(err) console.log(err)
                    })
                  }
                });
              }

            });
        }
        //console.log(`[MESSAGE_PUBLISHED] Client ${(client ? client.id : 'BROKER_' + aedes.id)} has published message on ${packet.topic} to broker ${aedes.id}`)
      }
  })
}

if (cluster.isMaster) {
  console.log(config)
  //const numWorkers = cpus().length
  const numWorkers = config.mongodb.workers
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
