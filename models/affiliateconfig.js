'use strict';
module.exports = function(sequelize, DataTypes) {
  var AffiliateConfig = sequelize.define('AffiliateConfig', {
    level: DataTypes.INTEGER
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
      }
    }
  });
  return AffiliateConfig;
};