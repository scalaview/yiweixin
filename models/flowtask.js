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
        if(file.size > 0){
          var filename = helpers.fileUploadSync(file)
          this.setDataValue('cover', filename);
        }
      },
      get: function(){
         var cover = this.getDataValue('cover');
        if(cover) return '/uploads/' + cover
        return
      }
    },
    content: { type: DataTypes.TEXT, allowNull: true },
    finishTime: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    expiredAt: { type: DataTypes.DATE, allowNull: false },
    sortNum: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    actionUrl: { type: DataTypes.STRING, allowNull: true },
    seller_id: { type: DataTypes.INTEGER, allowNull: false },
    trafficPlanId: { type: DataTypes.INTEGER, allowNull: false }
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
        models.FlowTask.belongsTo(models.Seller, { foreignKey: 'seller_id' });
      }
    },
    scopes: {
      active: {
        where: {
          isActive: 0
        }
      },
      defaultSort: {
        order: [['sortNum', 'DESC']]
      }
    },
    instanceMethods: {
      className: function(){
        return "FlowTask"
      }
    }
  });
  return FlowTask;
};