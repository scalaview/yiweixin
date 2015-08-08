'use strict';
var helpers = require('../helpers')
var config = require("../config")

module.exports = function(sequelize, DataTypes) {
  var FlowTask = sequelize.define('FlowTask', {
    title: { type: DataTypes.STRING, allowNull: false },
    cover: {
      type: DataTypes.STRING,
      allowNull: true,
      set: function(file) {
        var filename = helpers.fileUploadSync(file)
        this.setDataValue('cover', filename);
      },
      get: function(){
         var cover = this.getDataValue('cover');
         return '/uploads/' + cover
      }
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
    },
    scopes: {
      active: {
        where: {
          isActive: true
        }
      },
      defaultSort: {
        order: [['sortNum', 'DESC']]
      }
    }
  });
  return FlowTask;
};