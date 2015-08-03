'use strict';
var helper = require('../helpers')
module.exports = function(sequelize, DataTypes) {
  var FlowTask = sequelize.define('FlowTask', {
    title: { type: DataTypes.STRING, allowNull: false },
    cover: {
      type: DataTypes.STRING,
      allowNull: true
    },
    content: { type: DataTypes.TEXT, allowNull: true },
    finishTime: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    expiredAt: { type: DataTypes.DATE, allowNull: false },
    sortNum: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
      }
    }
  });
  return FlowTask;
};