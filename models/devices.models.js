
module.exports = (sequelize,DataTypes)=>{
	return sequelize.define("devices", {
		uid: {
			type: DataTypes.STRING,
			unique: true
		},
		project: { // deprecated
			type: DataTypes.STRING,
			allowNull: true
		},
		status: {
			type: DataTypes.STRING,
			allowNull: true
		},
		project_id: {
			type: DataTypes.INTEGER,
			references: {
				model: 'projects',
				key: 'id'
			}
		},
		model_id: {
			type: DataTypes.INTEGER,
			references: {
				model: 'models',
				key: 'id'
			}
		},
	},
	{
		tableName: 'devices',
		freezeTableName: true
	})
}
