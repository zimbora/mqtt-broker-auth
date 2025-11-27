const { Kafka } = require('kafkajs');
const config = require('../../config');

class KafkaService {
  constructor() {
    this.kafka = null;
    this.producer = null;
    this.isConnected = false;
    this.enabled = config.kafka.enabled;
  }

  async init(workerId) {
    if (!this.enabled) {
      console.log('[KAFKA] Kafka publishing is disabled');
      return;
    }

    try {
      this.kafka = new Kafka({
        clientId: `${config.kafka.clientId}:${workerId}`,
        brokers: config.kafka.brokers,
        retry: {
            retries: 10000, // Number of retries
            initialRetryTime: 500, // Initial wait time (ms)
            maxRetryTime: 30000, // Maximum retry time (ms)
            factor: Math.floor(Math.random() * 5) + 1, // Exponential backoff factor
        },
      });

      // Add SASL/SSL auth if enabled
      if (config.kafka.auth && config.kafka.auth.enabled) {
        kafkaConfig.ssl = !!config.kafka.auth.ssl;
        kafkaConfig.sasl = {
          mechanism: config.kafka.auth.mechanism, // 'plain', 'scram-sha-256', etc.
          username: config.kafka.auth.username,
          password: config.kafka.auth.password,
        };
      }

      this.producer = this.kafka.producer();
      await this.producer.connect();
      this.isConnected = true;
      console.log('[KAFKA] Producer connected successfully to brokers:', config.kafka.brokers);

      for (const topic of config.kafka.topics) {
        if(topic === 'inlocMsgsSniffed')
          await this.createTopicWithRetention(topic, 2*60*1000); // 2 minutes
        else
          await this.createTopicWithRetention(topic, 2*60*60*1000); // 2 hours
      }

    } catch (error) {
      console.error('[KAFKA] Failed to connect producer:', error.message);
      this.isConnected = false;
    }
  }


  async createTopicWithRetention(topicName,retentionMs) {
    const admin = this.kafka.admin();
    await admin.connect();

    // Fetch the list of topics
    const topics = await admin.listTopics();

    // Check if the desired topic exists in the list
    const topicExists = topics.includes(topicName);

    if (topicExists) {
      console.log(`KAFKA Producer: Topic ${topicName} already exists.`);
      await admin.disconnect();
      return;
    }

    try{
      await admin.createTopics({
        topics: [{
          topic: topicName,
          numPartitions: 1,
          replicationFactor: 1,
          config: {
              'retention.ms': retentionMs.toString(),
          },
        }],
      });
      console.log(`KAFKA Producer: Topic ${topicName} created with retention of ${retentionMs} mSeconds.`);
    } catch (error) {
      console.error(`KAFKA Producer: Failed to create topic ${topicName}: ${error.message}`);
    } finally {
      await admin.disconnect(); // Ensure to disconnect after operations
    }
  }

  async publishMessage(mqttPacket, clientInfo = null) {

    if (!this.enabled || !this.isConnected || !this.producer) {
      return;
    }

    if(mqttPacket.dup){
      // the message is duplicate, ignore it for now
      return;
    }

    // Extract the first word (before "/") and the rest as key
    const topicParts = mqttPacket.topic.split('/');
    let kafkaTopic = topicParts[0];
    const kafkaKey = mqttPacket.topic.slice(kafkaTopic.length + 1); // Everything after first "/"

    if(kafkaTopic === "freeRTOS2" && topicParts[2] === "packets"){
      kafkaTopic = "inlocMsgsSniffed";
    }

    // Check if kafkaTopic is included in config.kafka.topics
    if (!config.kafka.topics.includes(kafkaTopic) || kafkaKey === '') {
      // Not a valid topic, do not publish
      return;
    }

    try {
      const messagePayload = {
        timestamp: new Date().toISOString(),
        mqtt: {
          topic: mqttPacket.topic,
          payload: mqttPacket.payload.toString(),
          qos: mqttPacket.qos,
          retain: mqttPacket.retain,
          dup: mqttPacket.dup,
        },
        client: clientInfo ? {
          id: clientInfo.id,
          username: clientInfo.username,
        } : null,
      };

      await this.producer.send({
        topic: kafkaTopic,
        messages: [{
          key: kafkaKey, // Use MQTT topic as Kafka message key for partitioning
          value: JSON.stringify(messagePayload),
        }],
      });

      //console.log(`[KAFKA] Published message to topic '${config.kafka.topic}' for MQTT topic '${mqttPacket.topic}'`);
    } catch (error) {
      console.error(`[KAFKA] Failed to publish message for MQTT topic '${mqttPacket.topic}':`, error.message);
    }
  }

  async disconnect() {
    if (this.producer && this.isConnected) {
      try {
        await this.producer.disconnect();
        console.log('[KAFKA] Producer disconnected');
      } catch (error) {
        console.error('[KAFKA] Error disconnecting producer:', error.message);
      }
    }
  }
}

module.exports = new KafkaService();