'use strict';
module.exports = function(sequelize, DataTypes) {
  var DataPlan = sequelize.define('DataPlan', {
    name: { type: DataTypes.STRING, allowNull: false },
    value: { type: DataTypes.INTEGER, allowNull: false },
    price: { type: DataTypes.DECIMAL, allowNull: true, defaultValue: 0 }
  }, {
    classMethods: {
      associate: function(models) {
        models.DataPlan.hasMany(models.Order, { foreignKey: 'dataPlanId' })
      },
      allOptions: function(successCallBack, errCallBack) {
        DataPlan.findAll().then(successCallBack).catch(errCallBack)
      }
    }
  });
  return DataPlan;
};