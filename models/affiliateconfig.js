'use strict';

var config = require("../config")
var async = require("async")
var maxDepth = config.max_depth

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
      },
      loadConfig: function(models, dataPlan, successCallBack, errCallBack) {
        async.waterfall([function(next) {
          models.AffiliateConfig.count({
            where: {
              dataPlanId: dataPlan.id
            }
          }).then(function(c) {
            if(c > 0){
              var params = {
                              dataPlanId: dataPlan.id,
                              level: {
                                $lt: maxDepth
                              }
                            }
            }else{
              var params = {
                              dataPlanId: {
                                $eq: null
                              },
                              level: {
                                $lte: maxDepth
                              }
                            }
            }
            next(null, params)
          })
        }, function(params, next) {
          models.AffiliateConfig.findAll({
            where: params,
            order: [
              ['level']
            ]
          }).then(function(configs) {
            next(null, configs)
          }).catch(function(err) {
            next(err)
          })
        }], function(err, configs) {
          if(err){
            errCallBack(err)
          }else{
            successCallBack(configs)
          }
        })
      }
    }
  });
  return AffiliateConfig;
};