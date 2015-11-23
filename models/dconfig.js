'use strict';
module.exports = function(sequelize, DataTypes) {
  var DConfig = sequelize.define('DConfig', {
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    value: {
      type: DataTypes.STRING
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
  return DConfig;
};