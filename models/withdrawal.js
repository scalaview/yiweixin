'use strict';
module.exports = function(sequelize, DataTypes) {
  var Withdrawal = sequelize.define('Withdrawal', {
    name: {
      type: DataTypes.STRING
    },
    customerId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    account: {
      type: DataTypes.STRING,
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    state: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    phone:  {
      type: DataTypes.STRING,
      allowNull: true
    },
    comment:{
      type: DataTypes.TEXT,
      allowNull: true
    },
    remark: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    cost: {
        type: DataTypes.DECIMAL,
        allowNull: false,
        defaultValue: 0.00
    }
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
      }
    }
  });
  Withdrawal.STATUS = {
    APPLY: 0,
    SUCCESS: 1,
    FAIL: 2
  }
  return Withdrawal;
};