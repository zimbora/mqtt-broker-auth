
module.exports = (sequelize,DataTypes)=>{
	return sequelize.define("devices", {
		uid: {
			type: DataTypes.STRING,
			allowNull: true
		},
		project: {
			type: DataTypes.STRING,
			allowNull: true
		},
		status: {
			type: DataTypes.STRING,
			allowNull: true
		},
	},
	{
		tableName: 'devices',
		freezeTableName: true
	})
}
