
module.exports = (sequelize,DataTypes)=>{
	return sequelize.define("firmwares", {
		filename: {
			type: DataTypes.STRING,
			allowNull: true
		},
		originalname: {
			type: DataTypes.STRING,
			allowNull: true,
			unique: true
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
		model_id: { // deprecated
			type: DataTypes.INTEGER,
			references: {
				model: 'models',
				key: 'id'
			},
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
