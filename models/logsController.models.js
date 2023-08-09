
module.exports = (sequelize,DataTypes)=>{
	return sequelize.define("logsController", {
		device_id: {
			type: DataTypes.INTEGER,
			references: {
				model: 'devices',
				key: 'id'
			}
		},
		version: {
			type: DataTypes.STRING,
			allowNull: true
		},
		ssid: {
			type: DataTypes.STRING,
			allowNull: true
		},
		rssi: {
			type: DataTypes.INTEGER,
			allowNull: true
		},
		channel: {
			type: DataTypes.INTEGER,
			allowNull: true
		},
		keepalive: {
			type: DataTypes.INTEGER,
			allowNull: true
		},
		ip: {
			type: DataTypes.STRING,
			allowNull: true
		},
		/*
		docker: {
			type: DataTypes.JSON,
			allowNull: true
		}
		*/
	},
	{
		tableName: 'logsController',
		freezeTableName: true
	})
}
