'use strict';
module.exports = function(sequelize, DataTypes) {
  var ExtractOrder = sequelize.define('ExtractOrder', {
    state: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    exchanger: { type: DataTypes.STRING, allowNull: false },
    exchangerId: { type: DataTypes.INTEGER, allowNull: false },
    phone: {  type: DataTypes.STRING, allowNull: true },
    cost: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
    extend: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 }
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
      }
    }
  });

  ExtractOrder.STATE = {
    INIT: 0,
    SUCCESS: 1,
    FAIL: 2
  }
  return ExtractOrder;
};