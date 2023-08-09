
module.exports = (sequelize,DataTypes)=>{
	return sequelize.define("logs_HH", {
		device_id: {
			type: DataTypes.INTEGER,
			references: {
				model: 'devices',
				key: 'id'
			}
		},
		debug: {
			type: DataTypes.STRING,
			allowNull: true
		},
		temperature: {
			type: DataTypes.INTEGER,
			allowNull: true
		},
		oxygen: {
			type: DataTypes.INTEGER,
			allowNull: true
		},
		pulse: {
			type: DataTypes.INTEGER,
			allowNull: true
		},
		systolic: {
			type: DataTypes.INTEGER,
			allowNull: true
		},
		diastolic: {
			type: DataTypes.INTEGER,
			allowNull: true
		},
		sph_pulse: {
			type: DataTypes.INTEGER,
			allowNull: true
		},
		weight: {
			type: DataTypes.INTEGER,
			allowNull: true
		},
		visceralfat: {
			type: DataTypes.INTEGER,
			allowNull: true
		},
		bodyfat: {
			type: DataTypes.INTEGER,
			allowNull: true
		},
		water: {
			type: DataTypes.INTEGER,
			allowNull: true
		},
		calories: {
			type: DataTypes.INTEGER,
			allowNull: true
		},
		bonemass: {
			type: DataTypes.INTEGER,
			allowNull: true
		},
		musclemass: {
			type: DataTypes.INTEGER,
			allowNull: true
		},
	},
	{
		tableName: 'logs_HH',
		freezeTableName: true
	})
}

