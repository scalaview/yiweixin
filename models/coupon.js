'use strict';
module.exports = function(sequelize, DataTypes) {
  var Coupon = sequelize.define('Coupon', {
    name: {
      type: DataTypes.STRING
    },
    dataPlanId: {
      type: DataTypes.INTEGER
    },
    discount: {
      type: DataTypes.FLOAT,
      defaultValue: 1.00
    },
    extend: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    ignoreLevel: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    expiredAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
      }
    }
  });
  return Coupon;
};