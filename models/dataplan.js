'use strict';
module.exports = function(sequelize, DataTypes) {
  var DataPlan = sequelize.define('DataPlan', {
    name: DataTypes.STRING
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