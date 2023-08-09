
module.exports = (sequelize,DataTypes)=>{
	return sequelize.define("users", {
		type: {
			type: DataTypes.STRING(32),
			unique: true
		},
		password: {
			type: DataTypes.STRING
		},
		level: {
			type: DataTypes.INTEGER
		}
	},
	{
		tableName: 'users',
		freezeTableName: true
	})
}
