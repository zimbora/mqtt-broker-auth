
module.exports = (sequelize,DataTypes)=>{
	return sequelize.define("permissions", {
		client_id: {
			type: DataTypes.INTEGER,
			references: {
				model: 'clients',
				key: 'id'
			}
		},
		device_id: {
			type: DataTypes.INTEGER,
			references: {
				model: 'devices',
				key: 'id'
			}
		},
		level: {
			type: DataTypes.INTEGER,
		}
	},
	{
		tableName: 'permissions',
		freezeTableName: true
	})
}
