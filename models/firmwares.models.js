
module.exports = (sequelize,DataTypes)=>{
	return sequelize.define("firmwares", {
		filename: {
			type: DataTypes.STRING,
			allowNull: true
		},
		originalname: {
			type: DataTypes.STRING,
			allowNull: true
		},
		fw_version: {
			type: DataTypes.STRING,
			allowNull: true
		},
		app_version: {
			type: DataTypes.STRING,
			allowNull: true
		},
		fw_release: {
			type: DataTypes.STRING,
			allowNull: true
		},
		fwModel_id: {
			type: DataTypes.INTEGER,
			references: {
				model: 'fwModels',
				key: 'id'
			}
		},
		token: {
			type: DataTypes.STRING,
			allowNull: true
		},
	},
	{
		tableName: 'firmwares',
		freezeTableName: true
	})
}
