
module.exports = (sequelize,DataTypes)=>{
	return sequelize.define("permissionsFW", {
		client_id: {
			type: DataTypes.INTEGER,
			references: {
				model: 'clients',
				key: 'id'
			}
		},
		fwModel_id: {
			type: DataTypes.INTEGER,
			references: {
				model: 'fwModels',
				key: 'id'
			}
		}
	},
	{
		tableName: 'permissionsFW',
		freezeTableName: true
	})
}
