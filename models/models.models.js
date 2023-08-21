
module.exports = (sequelize,DataTypes)=>{
	return sequelize.define("models", {
		name: {
			type: DataTypes.STRING,
			unique: true
		},
		description: {
			type: DataTypes.STRING
		},
		model_table: {
			type: DataTypes.STRING,
			allowNull: true
		},
		logs_table: {
			type: DataTypes.STRING,
			allowNull: true
		},
	},
	{
		tableName: 'models',
		freezeTableName: true
	})
}
