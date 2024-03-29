
# Aedes-MQTT-Broker

MQTT broker working in cluster mode. Number of workers can be set using WORKERS var env.

## TODO
- MQTTS

## Working mode

### Users
This program uses a mysql database to check users access and permissions

On table `users` are the authorized accounts to access MQTT broker.\
If an account is registered with level 4/5, that account has full access.\
Otherwise, the access must be checked through table `permissions`

### Devices and Clients
The registered `clientId` is used to check if a subscription or a publish are authorized for the respective topics.\
A `device` will only be allowed to publish on it's own topic and it must contains `uid:`.
This `uid:` identifies the device referred on the topic and is used to check if a
`clientId` has permission to write on the topic. Those privileges are defined in `permissions` table.\
If the `level` of `clientId` is >= 3 publish and subscribe on the respective topic are granted\
If the `level` of `clientId` is >= 1 and < 3 only subscribe on the respective topic is granted

## Dependencies

- mysql8.0
- mongodb
- redis
- [mqtt-devices-parser](https://github.com/zimbora/mgmt-iot-web/blob/master/mysql/schema.mwb)

## Front end
- Node service running the following [project](https://github.com/zimbora/mgmt-iot-web)

## Problems
!! messages with retain flag should be published with qos=2

## Configuration

The default configuration uses ./config/index.js file\
To use another configuration define the respective variables before call the program

Use a docker-compose file to do that:
```
version: '3.3'
services:
  redis:
    image: 'redis:latest'
    ports:
      - '6379:6379'
    expose:
      - '6379'
    volumes:
      - 'redis_data_container:/data'
  mongodb:
    image: mongo:latest
    #environment:
      #MONGO_INITDB_ROOT_USERNAME: root
      #MONGO_INITDB_ROOT_PASSWORD: rootpassword
    ports:
      - 27017:27017
    volumes:
      - mongodb_data_container:/data/db
  db:
    image: mysql:8.0
    restart: always
    environment:
      MYSQL_DATABASE: 'mqtt-aedes'
      # So you don't have to use root, but you can if you like
      MYSQL_USER: 'user'
      # You can use whatever password you like
      MYSQL_PASSWORD: 'user_pwd'
      # Password for root access
      MYSQL_ROOT_PASSWORD: 'root_pwd'
    ports:
      # <Port exposed> : < MySQL Port running inside container>
      - '3306:3306'
    expose:
      # Opens port 3306 on the container
      - '3306'
      # Where our data will be persisted
    volumes:
      - my-db:/var/lib/mysql
  mqtt:
    #build: ./mqtt-broker-auth
    image: zimbora:mqtt-broker-auth
    restart: unless-stopped
    command: node index.js
    environment:
      dev: true
      MQ: 'redis'
      PERSISTENCE: 'mongo'
      # MQTT && WebSocket
      MQTT_PORT: '1883'
      #MQTTS_PORT
      WS_PORT: '8888'
      #WSS_PORT
      # DataBase
      DB_CONN_LIMIT: 15
      DB_HOST: 'db'
      DB_PORT: '3306'
      DB_USER: 'user'
      DB_PWD: 'user_pwd'
      DB_NAME: 'mqtt-aedes'
      #CLUSTER
      WORKERS: 3
      # REDIS
      REDIS_URL: 'mongodb://127.0.0.1/aedes-clusters'
      # MONGO
      MONGO_URL: 'mongodb://127.0.0.1/aedes-clusters'
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
    depends_on:
      - db
      - mongodb
      - redis
      - mqtt-devices-parser
# Names our volume
volumes:
  my-db:
  mongodb_data_container:
  redis_data_container:

```
