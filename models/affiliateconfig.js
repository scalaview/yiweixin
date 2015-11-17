'use strict';
module.exports = function(sequelize, DataTypes) {
  var AffiliateConfig = sequelize.define('AffiliateConfig', {
    level: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    percent: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    dataPlanId: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
      }
    }
  });
  return AffiliateConfig;
};