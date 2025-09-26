const { Kafka } = require('kafkajs');
const config = require('../../config');

class KafkaService {
  constructor() {
    this.kafka = null;
    this.producer = null;
    this.isConnected = false;
    this.enabled = config.kafka.enabled;
  }

  async init() {
    if (!this.enabled) {
      console.log('[KAFKA] Kafka publishing is disabled');
      return;
    }

    try {
      this.kafka = new Kafka({
        clientId: config.kafka.clientId,
        brokers: config.kafka.brokers,
      });

      this.producer = this.kafka.producer();
      await this.producer.connect();
      this.isConnected = true;
      console.log('[KAFKA] Producer connected successfully to brokers:', config.kafka.brokers);
    } catch (error) {
      console.error('[KAFKA] Failed to connect producer:', error.message);
      this.isConnected = false;
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

      console.log(`[KAFKA] Published message to topic '${config.kafka.topic}' for MQTT topic '${mqttPacket.topic}'`);
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