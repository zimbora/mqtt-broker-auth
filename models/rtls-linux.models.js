
module.exports = (sequelize,DataTypes)=>{
	return sequelize.define("rtls-linux", {
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
	},
	{
		tableName: 'logsController',
		freezeTableName: true
	})
}
