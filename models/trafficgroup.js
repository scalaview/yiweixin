'use strict';
module.exports = function(sequelize, DataTypes) {
  var TrafficGroup = sequelize.define('TrafficGroup', {
    name: DataTypes.STRING,
    providerId: DataTypes.INTEGER,
    sortNum: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    }
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
      }
    }
  });

  TrafficGroup.Provider = {
    '中国移动': 0,
    '中国联通': 1,
    '中国电信': 2
  }

  TrafficGroup.ProviderName = {
    0: '中国移动',
    1: '中国联通',
    2: '中国电信'
  }
  return TrafficGroup;
};