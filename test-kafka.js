#!/usr/bin/env node

/**
 * Simple test script to validate Kafka integration
 * This creates a mock MQTT publish event to test the Kafka publishing functionality
 */

async function testKafkaIntegration() {
  console.log('Testing Kafka Integration...\n');
  
  // Test 1: Kafka disabled
  console.log('=== Test 1: Kafka Disabled ===');
  process.env.KAFKA_ENABLED = 'false';
  
  // Clear module cache
  Object.keys(require.cache).forEach(key => {
    if (key.includes('/src/kafka/') || key.includes('/config/')) {
      delete require.cache[key];
    }
  });
  
  const kafkaDisabled = require('./src/kafka/kafka.js');
  await kafkaDisabled.init();
  
  const mockPacketDisabled = {
    topic: 'test/topic',
    payload: Buffer.from('test message'),
    qos: 1,
    retain: false,
    dup: false
  };
  
  const mockClientDisabled = {
    id: 'test-client',
    username: 'test-user'
  };
  
  await kafkaDisabled.publishMessage(mockPacketDisabled, mockClientDisabled);
  await kafkaDisabled.disconnect();
  
  // Test 2: Kafka enabled (will attempt connection)
  console.log('\n=== Test 2: Kafka Enabled (Connection Test) ===');
  process.env.KAFKA_ENABLED = 'true';
  process.env.KAFKA_BROKERS = 'localhost:9092';
  process.env.KAFKA_TOPIC = 'mqtt-test-messages';
  process.env.KAFKA_CLIENT_ID = 'mqtt-test-client';
  
  // Clear module cache again
  Object.keys(require.cache).forEach(key => {
    if (key.includes('/src/kafka/') || key.includes('/config/')) {
      delete require.cache[key];
    }
  });
  
  const kafkaEnabled = require('./src/kafka/kafka.js');
  await kafkaEnabled.init();
  
  const mockPacketEnabled = {
    topic: 'sensors/temperature',
    payload: Buffer.from('25.3'),
    qos: 1,
    retain: false,
    dup: false
  };
  
  const mockClientEnabled = {
    id: 'sensor001',
    username: 'device'
  };
  
  await kafkaEnabled.publishMessage(mockPacketEnabled, mockClientEnabled);
  
  // Give some time for connection attempts
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  await kafkaEnabled.disconnect();
  
  console.log('\n=== Test Completed ===');
  console.log('If you saw connection attempts, the integration is working correctly.');
  console.log('For full testing, ensure Kafka is running and accessible.');
}

testKafkaIntegration().catch(console.error);