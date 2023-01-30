
# Aedes-MQTT-Broker

## Working mode
This program uses a mysql database to check users access and permissions

On table `users` are the authorized accounts to access MQTT broker
If an account is registered with level 5, that account has full access.
Otherwise the access must be checked through table `permissions`

On each mqtt-broker authentication a `clientId` is passed.
This `clientId` is used to check if a subscribe or a publish are authorized
for the respective topics.
A `clientId` will only be allowed to publish on a topic which contains an `uid:`.
This `uid:` identifies the device referred on the topic and is used to check if this
`clientId` has permission to write on the topic. Those privileges are defined in `permissions` table.
If the `level` of `clientId` is >= 3 publish and subscribe on the respective topic are granted
If the `level` of `clientId` is >= 1 and < 3 only subscribe on the respective topic is granted

## Dependencies

- mysql8.0 running with the following [db](https://github.com/zimbora/mgmt-iot-web/blob/master/mysql/schema.mwb)
- Node service running the following [project](https://github.com/zimbora/mgmt-iot-web)

## Configuration

The default configuration uses ./config/index.js file
To use another configuration define the respective variables before call the program

Use a docker-compose file to do that:
```
version: '3.9'
services:
  mqtt:
    build: ./mqtt-broker-auth
    image: mqtt:0.3.3
    command: node index.js
    environment:
      # web
      #- HTTP_PROTOCOL=http://
      - DOMAIN=192.168.1.108
      # MQTT && WebSocket
      - MQTT_PORT=1883
      #- MQTTS_PORT
      - WS_PORT=8888
      #- WSS_PORT
      # DataBase
      - DB_HOST=host.docker.internal
      #- DB_PORT=3306
      #- DB_USER=user
      #- DB_PWD=user_pwd
      #- DB_NAME=mqtt-aedes
    ports:
      - '1883:1883'
      - '8888:8888'
    expose:
      # Opens ports on the container
      - '1883'
      - '8888'
    volumes:
      - .:/usr/app/mqtt/
      - /usr/app/mqtt/node_modules
```
