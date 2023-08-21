
module.exports = (sequelize,DataTypes)=>{
	return sequelize.define("freeRTOS2", {
		device_id: {
			type: DataTypes.INTEGER,
			unique: true,
			references: {
				model: 'devices',
				key: 'id'
			}
		},
		fw_version: {
			type: DataTypes.STRING,
			allowNull: true
		},
		app_version: {
			type: DataTypes.STRING,
			allowNull: true
		},
		model: {
			type: DataTypes.STRING,
			allowNull: true
		},
		logs_table: {
			type: DataTypes.STRING,
			allowNull: true
		},
		settings: {
			type: DataTypes.JSON,
			allowNull: true
		},
		ar: {
			type: DataTypes.JSON,
			allowNull: true
		},
		alarms: {
			type: DataTypes.JSON,
			allowNull: true
		},
		js_program: {
			type: DataTypes.TEXT,
			allowNull: true
		},
		setpoints: {
			type: DataTypes.JSON,
			allowNull: true
		},
		fw_release: {
			type: DataTypes.STRING,
			allowNull: true
		},
	},
	{
		tableName: 'freeRTOS2',
		freezeTableName: true
	})
}

