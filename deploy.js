var models = require('./models/models');

async function init(){

	await models.init();
	await models.connect();
	await models.load();
	await models.sync();

	let user = await models.insertUser("admin","admin",5); // ads user
	let user_id = user.dataValues.id;
	await models.insertUser("device","device",3);
	await models.insertUser("client","client_pwd",3);
	await models.insertClient("admin","admin",user_id); // ads client with credentials admin@admin
	//console.log(user);
}

init();
