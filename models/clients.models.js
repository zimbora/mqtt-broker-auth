
module.exports = (sequelize,DataTypes)=>{
	return sequelize.define("clients", {
		user_id: {
			type: DataTypes.INTEGER,
			references : {
				model: 'users',
				key: 'id'
			}
		},
		nick: {
			type: DataTypes.STRING(64),
			unique: true
		},
		token: {
			type: DataTypes.STRING,
			allowNull: true
		},
		api_token: {
			type: DataTypes.STRING,
			allowNull: true
		},
		gmail: {
			type: DataTypes.STRING(64),
			unique: true,
			allowNull: true
		},
		name: {
			type: DataTypes.STRING,
			allowNull: true
		},
		avatar: {
			type: DataTypes.STRING,
			allowNull: true
		},
	},
	{
		tableName: 'clients',
		freezeTableName: true
	})
}
