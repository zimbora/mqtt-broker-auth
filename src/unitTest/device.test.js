
var auth = require('../auth/auth.js');
var device = require('../device/device.js');

let topics = [
  "freeRTOS2/uid:ac67b2403178/status",
  "freeRTOS2/uid:ac67b2403178/model",
]

let payloads = [
  "offline",
  "HH_GW_WIFI",
];

let client = {
  publish : (packet,cb)=>{
    return cb();
  }
};

auth.init();
device.init();

topics.forEach((topic,counter)=>{

  console.log("\ntest:",counter);

  let payload = payloads[counter];
  console.log("topic:",topic);
  console.log("payload:",payload);
  if(topic.includes("uid:")){
    device.parseMessage(client,topic,payload);
  }


})

