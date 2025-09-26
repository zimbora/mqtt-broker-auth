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
        brokers: ['localhost:29093'],
        retry: {
            retries: 5, // Number of retries
            initialRetryTime: 500, // Initial wait time (ms)
            maxRetryTime: 30000, // Maximum retry time (ms)
            factor: Math.floor(Math.random() * 5) + 1, // Exponential backoff factor
        },
      });

      this.producer = this.kafka.producer();
      await this.producer.connect();
      this.isConnected = true;
      console.log('[KAFKA] Producer connected successfully to brokers:', config.kafka.brokers);

      this.createTopicWithRetention(config.kafka.topic,604800000); // 7 days

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
        topic: config.kafka.topic,
        messages: [{
          key: mqttPacket.topic, // Use MQTT topic as Kafka message key for partitioning
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