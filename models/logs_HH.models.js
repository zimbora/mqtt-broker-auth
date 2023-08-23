
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
			type: DataTypes.DOUBLE,
			allowNull: true
		},
		oxygen: {
			type: DataTypes.DOUBLE,
			allowNull: true
		},
		pulse: {
			type: DataTypes.DOUBLE,
			allowNull: true
		},
		systolic: {
			type: DataTypes.DOUBLE,
			allowNull: true
		},
		diastolic: {
			type: DataTypes.DOUBLE,
			allowNull: true
		},
		sph_pulse: {
			type: DataTypes.DOUBLE,
			allowNull: true
		},
		weight: {
			type: DataTypes.DOUBLE,
			allowNull: true
		},
		visceralfat: {
			type: DataTypes.DOUBLE,
			allowNull: true
		},
		bodyfat: {
			type: DataTypes.DOUBLE,
			allowNull: true
		},
		water: {
			type: DataTypes.DOUBLE,
			allowNull: true
		},
		calories: {
			type: DataTypes.DOUBLE,
			allowNull: true
		},
		bonemass: {
			type: DataTypes.DOUBLE,
			allowNull: true
		},
		musclemass: {
			type: DataTypes.DOUBLE,
			allowNull: true
		},
	},
	{
		tableName: 'logs_HH',
		freezeTableName: true
	})
}

