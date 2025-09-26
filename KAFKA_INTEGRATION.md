# Kafka Integration

This MQTT broker now supports publishing all MQTT messages to a Kafka topic. This allows for message persistence, analytics, and integration with other systems.

## Configuration

The Kafka integration can be configured using environment variables:

| Environment Variable | Default Value | Description |
|---------------------|---------------|-------------|
| `KAFKA_ENABLED` | `false` | Enable/disable Kafka publishing |
| `KAFKA_BROKERS` | `localhost:9092` | Comma-separated list of Kafka brokers |
| `KAFKA_CLIENT_ID` | `mqtt-broker-auth` | Kafka client identifier |
| `KAFKA_TOPIC` | `mqtt-messages` | Kafka topic name for MQTT messages |

## Usage

### Enable Kafka Publishing

```bash
export KAFKA_ENABLED=true
export KAFKA_BROKERS=kafka1:9092,kafka2:9092
export KAFKA_TOPIC=iot-messages
node index.js
```

### Docker Compose Example

```yaml
version: '3.3'
services:
  mqtt:
    image: zimbora:mqtt-broker-auth
    environment:
      KAFKA_ENABLED: 'true'
      KAFKA_BROKERS: 'kafka:9092'
      KAFKA_CLIENT_ID: 'mqtt-broker-cluster'
      KAFKA_TOPIC: 'mqtt-messages'
    depends_on:
      - kafka
  
  kafka:
    image: confluentinc/cp-kafka:latest
    environment:
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092
    # ... other kafka configuration
```

## Message Format

When MQTT messages are published to Kafka, they are structured as JSON with the following format:

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "mqtt": {
    "topic": "sensors/temperature",
    "payload": "23.5",
    "qos": 1,
    "retain": false,
    "dup": false
  },
  "client": {
    "id": "sensor001",
    "username": "device"
  }
}
```

### Message Key

The Kafka message key is set to the MQTT topic name, which allows for proper partitioning and ordering of messages by topic.

## Features

- **System Topic Filtering**: Messages on system topics (starting with `$SYS/`) are automatically filtered out
- **Error Handling**: Failed Kafka publishing attempts are logged but don't affect MQTT functionality
- **Graceful Shutdown**: Kafka producer is properly disconnected on application shutdown
- **Configurable**: All Kafka settings can be configured via environment variables
- **Optional**: Kafka integration can be completely disabled without affecting MQTT functionality

## Monitoring

The application logs Kafka operations:
- `[KAFKA] Producer connected successfully` - Successful connection
- `[KAFKA] Published message to topic 'mqtt-messages'` - Successful message publishing
- `[KAFKA] Failed to publish message` - Publishing errors
- `[KAFKA] Kafka publishing is disabled` - When disabled via configuration

## Troubleshooting

1. **Connection Issues**: Ensure Kafka brokers are accessible and running
2. **Authentication**: If Kafka requires authentication, extend the configuration in `src/kafka/kafka.js`
3. **Performance**: For high-throughput scenarios, consider tuning Kafka producer settings
4. **Topic Creation**: Ensure the target Kafka topic exists or enable auto-topic creation