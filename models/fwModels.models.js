
module.exports = (sequelize,DataTypes)=>{
	return sequelize.define("fwModels", {
		name: {
			type: DataTypes.STRING(64),
			unique: true
		},
		description: {
			type: DataTypes.STRING
		},
		createdBy: {
			type: DataTypes.STRING,
			allowNull: true
		}
	},
	{
		tableName: 'fwModels',
		freezeTableName: true
	})
}
