const fs = require('fs');
const path = require('path');
const {Sequelize, DataTypes} = require("sequelize");
var sequelize;

var modelsPath = './models/';
var config = require('../config');

module.exports = {

   init : async ()=>{

      return new Promise((resolve,reject) => {

         sequelize = new Sequelize(
            config.mysqldb.name,
            config.mysqldb.user,
            config.mysqldb.pwd,
            {
               host: config.mysqldb.host,
               dialect: 'mysql'
            },
         );
         return resolve(sequelize);
      })
   },

   connect : async ()=>{

      return new Promise((resolve,reject) => {
         sequelize.authenticate().then(() => {
            console.log('Connection has been established successfully.');
            return resolve();
         }).catch((error) => {
            console.error('Unable to connect to the database: ', error);
            return reject();
         });
      });
   },

   load : async ()=>{

      return new Promise((resolve,reject) => {
         fs.readdirSync(modelsPath)
         .filter((file) => {
          // Exclude models.js and any non-js files
          return (file.indexOf('.') !== 0) && (file !== 'models.js') && (file.slice(-3) === '.js');
         })
         .forEach((file) => {
          const model = require(path.join(__dirname, file));
          model(sequelize, DataTypes);
         });
         return resolve();
      });
   },

   sync : async ()=>{

      return new Promise((resolve,reject) => {
         //sequelize.sync({alter:true,force:true}).then(() => {
         sequelize.sync({alter:true}).then( async () => {
            console.log('All tables were synced!');
            return resolve();
         }).catch((error) => {
            console.error('Unable to create table : ', error);
            return reject();
         });
      });
   },

   get: (modelName)=>{


      if(modelName != ""){
         if(sequelize.models[modelName]){
            const model = sequelize.models[modelName];
            const keys = Object.keys(model.rawAttributes);
            let obj = {}
            keys.map((key)=>{
               obj[key] = null;
            })
            return obj;
         }else return;
      }else{
         return models = Object.keys(sequelize.models).map(modelName => {
            const model = sequelize.models[modelName];
            const keys = Object.keys(model.rawAttributes);
            return {
               modelName,
               keys
            };
         });
      }

   },

   getUser : async (type)=>{

      return new Promise( async (resolve,reject) => {
         const user = await sequelize.models['users'].findOne({
             where: {
                 type: type
             }
         });
         return resolve(user);
      });
   },

   insertUser: async (type, password,level)=>{

      return new Promise( async (resolve,reject) => {
         // Insert a record if it doesn't exist
         const res = await sequelize.models['users'].findOrCreate({
           where: { type: type },
           defaults: {
               password: password,
               level: level
            }
         })
         .then(([user, created]) => {
            if (created) {
               console.log('New user created:', type);
            } else {
               console.log('User already exists:', type);
            }
            return resolve(user);
         })
         .catch(error => {
           console.error('Error:', error);
           return reject(error);
         });
      });
   },

   insertClient: async (nick, token, user_id)=>{

      return new Promise( async (resolve,reject) => {
         // Insert a record if it doesn't exist
         const res = await sequelize.models['clients'].findOrCreate({
           where: { nick: nick },
           defaults: {
               user_id: user_id,
               token: token
            }
         })
         .then(([client, created]) => {
            if (created) {
               console.log('New client created:', nick);
            } else {
               console.log('Client already exists:', nick);
            }
            return resolve(client);
         })
         .catch(error => {
           console.error('Error:', error);
         });

      });
   }


}

