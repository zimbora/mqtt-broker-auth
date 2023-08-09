
module.exports = (sequelize,DataTypes)=>{
	return sequelize.define("logs_freeRTOS2", {
		device_id: {
			type: DataTypes.INTEGER,
			references: {
				model: 'devices',
				key: 'id'
			}
		},
		status: {
			type: DataTypes.STRING,
			allowNull: true
		},
		uptime: {
			type: DataTypes.INTEGER,
			allowNull: true
		},
		rssi: {
			type: DataTypes.INTEGER,
			allowNull: true
		},
		tech: {
			type: DataTypes.STRING,
			allowNull: true
		},
	},
	{
		tableName: 'logs_freeRTOS2',
		freezeTableName: true
	})
}

