// mqtt
const cluster = require('cluster')
const Aedes = require('aedes');
const { createServer } = require('net');
const { cpus } = require('os')

var config = require('./config');

var auth = require('./src/auth/auth.js');
var device = require('./src/device/device.js');
var freeRTOS2 = require('./src/device/freeRTOS2.js');

// websocket
const httpServer = require('http').createServer()
const ws = require('websocket-stream')

// best configuration mqemitter-reds + aedes-persistence-mongodb
const mq = config.mq === 'redis'
  ? require('mqemitter-redis')({
    port: config.redis.port || 6379
  })
  : require('mqemitter-mongodb')({
    url: config.mongodb.url
  })

const persistence = config.persistence === 'redis'
  ? require('aedes-persistence-redis')({
    port: config.redis.port
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
      if(topic.includes(MACRO_UID_PREFIX)){
        let index = topic.indexOf(MACRO_UID_PREFIX)
        let project = topic.substr(0,index-1);
        let uid = topic.substr(index);
        index = uid.indexOf("/");
        uid = uid.substr(0,index);

        let field = "", key = "";
        if(topic.endsWith(MACRO_KEY_FW_VERSION))
          field = MACRO_KEY_FW_VERSION;
        else if(topic.endsWith(MACRO_KEY_APP_VERSION)){
          field = MACRO_KEY_APP_VERSION;
        }else if(topic.endsWith(MACRO_KEY_STATUS)){
          field = MACRO_KEY_STATUS;
          device.updateDevice(client,project,uid,"project",project,()=>{});
        }else if(topic.endsWith(MACRO_KEY_MODEL)){
          field = MACRO_KEY_MODEL;
        }else if(topic.endsWith(MACRO_TOPIC_AR_SET)){
          field = MACRO_KEY_AR
          if(payload != "" && payload != null)
            payload = JSON.stringify(payload);
        }else if(topic.endsWith(MACRO_TOPIC_ALARM_SET)){
          field = MACRO_KEY_ALARM
          if(payload != "" && payload != null)
            payload = JSON.stringify(payload);
        }else if(topic.endsWith(MACRO_TOPIC_JS_CODE_SET)){
          if(payload != "" && payload != null)
            field = MACRO_KEY_JS_CODE
        }else if(topic.endsWith(MACRO_TOPIC_SETPOINTS_SET)){
          field = MACRO_KEY_SETPOINTS
          if(payload != "" && payload != null)
            payload = JSON.stringify(payload);
        }else if(topic.includes(MACRO_TOPIC_FW_SETTINGS)){
          if(payload != null && payload != "" && typeof payload != "undefined"){
            field = MACRO_KEY_FW_SETTINGS;
            let subtopic = MACRO_TOPIC_FW_SETTINGS+"/";
            let index = topic.indexOf(subtopic)
            subtopic = topic.substring(index+subtopic.length);
            index = subtopic.indexOf("/");
            if(index > -1)
              key = subtopic.substring(0,index);
            else
              key = subtopic
          }
        }else if(topic.includes(MACRO_TOPIC_APP_SETTINGS)){
          if(payload != null && payload != "" && typeof payload != "undefined"){
            field = MACRO_KEY_APP_SETTINGS;
            let subtopic = MACRO_TOPIC_APP_SETTINGS+"/";
            let index = topic.indexOf(subtopic)
            subtopic = topic.substring(index+subtopic.length);
            index = subtopic.indexOf("/");
            if(index > -1)
              key = subtopic.substring(0,index);
            else
              key = subtopic
          }
        }else if(topic.endsWith(MACRO_TOPIC_JS_CODE)){
          try{
            res = await device.checkMD5(uid,MACRO_KEY_JS_CODE,payload);
            if(res){
              topic += "/set";
              let packet = {
                topic : topic,
                payload : res
              }
              client.publish(packet,(err)=>{
                if(err) console.log(err)
              })
            }
          }catch(err){console.log(err);}
        }else if(topic.endsWith(MACRO_TOPIC_AR)){
          try{
            res = await device.checkMD5(uid,MACRO_KEY_AR,payload);
            if(res){
              topic += "/set";
              let packet = {
                topic : topic,
                payload : res
              }
              client.publish(packet,(err)=>{
                if(err) console.log(err)
              })
            }
          }catch(err){console.log(err);}
        }else if(topic.endsWith(MACRO_TOPIC_ALARM)){
          try{
            res = await device.checkMD5(uid,MACRO_KEY_ALARM,payload);
            if(res){
              topic += "/set";
              let packet = {
                topic : topic,
                payload : res
              }
              client.publish(packet,(err)=>{
                if(err) console.log(err)
              })
            }
          }catch(err){console.log(err);}
        }

        if(field != "" && payload != "" && key != "") // use it to update json key
          device.updateDeviceJSON(client,project,uid,field,key,payload);
        else if(field != "" && payload != ""){
          device.updateDevice(client,project,uid,field,payload,()=>{

            if(field == MACRO_KEY_FW_VERSION){
              // check if fw upload is needed
              device.checkDeviceFWVersion(uid,(err,dev,fw)=>{
                if(err) console.log(err);
                else if(fw != null){
                  console.log("update: "+uid+ " fw for:",fw);
                  let topic = dev.project+"/"+uid+ "/" +MACRO_TOPIC_FOTA_SET;
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
            }else if(field == MACRO_KEY_APP_VERSION){
              // check if fw upload is needed
              device.checkDeviceAppVersion(uid,(err,dev,fw)=>{
                if(err) console.log(err);
                else if(fw != null){
                  console.log("update "+uid+" app for:",fw);
                  let topic = dev.project+"/"+uid+"/"+MACRO_TOPIC_FOTA_SET;
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

          if(field == MACRO_KEY_MODEL){
            // if db is empty, ask for configs
            if(payload.includes(MACRO_WIFI)){
              // check db configs
              freeRTOS2.topics.fw.wifi.forEach(async(item, i) => {
                await getFWConfig(project,uid,item,client);
              });
            }else if(payload.includes(MACRO_LTE)){
              // check db configs
              freeRTOS2.topics.fw.lte.forEach(async(item, i) => {
                await getFWConfig(project,uid,item,client);
              });
            }

            freeRTOS2.topics.fw.settings.forEach(async(item, i) => {
              await getFWConfig(project,uid,item,client);
            });

            if(payload.includes(MACRO_SLIMGW)){
              setTimeout(async ()=>{
                freeRTOS2.topics.app.slimgw.forEach(async(item, i) => {
                  await getAppConfig(project,uid,item,client);
                });
              },10000);
            }else if(payload.includes(MACRO_MEAGW)){
              setTimeout(async ()=>{
                freeRTOS2.topics.app.slimgw.forEach(async(item, i) => {
                  await getAppConfig(project,uid,item,client);
                });
              },10000);
            }

            setTimeout(async ()=>{
              freeRTOS2.topics.fw.files.forEach(async(item, i) => {
                await getMD5File(project,uid,item,client);
              });
            },20000);
          }
        }
      }
      //console.log(`[MESSAGE_PUBLISHED] Client ${(client ? client.id : 'BROKER_' + aedes.id)} has published message on ${packet.topic} to broker ${aedes.id}`)
}
  })
}

async function getFWConfig(project,uid,property,client){
  return new Promise((resolve,reject)=>{
    let topic = project+"/"+uid+"/fw/settings/"+property+"/get";
    let payload = "";
    let packet = {
      topic : topic,
      payload : payload
    }
    client.publish(packet,(err)=>{
      if(err) return reject(err)
      else return resolve();
    })
  })
}

async function getAppConfig(project,uid,property,client){
  return new Promise((resolve,reject)=>{
    let topic = project+"/"+uid+"/app/settings/"+property+"/get";
    let payload = "";
    let packet = {
      topic : topic,
      payload : payload
    }
    client.publish(packet,(err)=>{
      if(err) return reject(err)
      else return resolve();
    })
  })
}

async function getMD5File(project,uid,filename,client){
  return new Promise((resolve,reject)=>{
    let topic = project+"/"+uid+"/fw/"+filename+"/get";
    let payload = "";
    let packet = {
      topic : topic,
      payload : payload
    }
    client.publish(packet,(err)=>{
      if(err) return reject(err)
      else return resolve();
    })
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
