
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

The default configuration uses ./config/env/development.js file
To use another configuration `NODE_ENV` variable has to be set with the respective filename

For example, in order to use docker-dev.js file
NODE_ENV = docker-dev
