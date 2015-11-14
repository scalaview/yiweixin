'use strict';
module.exports = function(sequelize, DataTypes) {
  var Withdrawal = sequelize.define('Withdrawal', {
    name: DataTypes.STRING
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
      }
    }
  });
  return Withdrawal;
};