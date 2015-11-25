'use strict';
module.exports = function(sequelize, DataTypes) {
  var SalaryHistory = sequelize.define('SalaryHistory', {
    customerId: DataTypes.INTEGER
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
      }
    }
  });
  return SalaryHistory;
};