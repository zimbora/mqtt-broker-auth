
module.exports = (sequelize,DataTypes)=>{
	return sequelize.define("projects", {
		name: {
			type: DataTypes.STRING,
			unique: true
		},
		description: {
			type: DataTypes.STRING
		},
		project_table: {
			type: DataTypes.STRING,
			allowNull: true
		},
		logs_table: {
			type: DataTypes.STRING,
			allowNull: true
		},
	},
	{
		tableName: 'projects',
		freezeTableName: true
	})
}
