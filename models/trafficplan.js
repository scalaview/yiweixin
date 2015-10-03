'use strict';

var request = require("request")
var async = require("async")
var helpers = require("../helpers")
var config = require("../config")
var crypto = require('crypto')

var DataSource = function(phone){
  this.phone = phone
  this.did = config.did
  this.key = config.umeolKey
  this.time = (new Date()).getTime()
  this.preMd5Str = this.phone + this.did + this.time + this.key

  this.options = {
    uri: config.umeolUrl,
    method: 'GET',
    qs: {
      tel: this.phone,
      did: this.did,
      timestamp: this.time,
      userkey: crypto.createHash('md5').update(this.preMd5Str).digest("hex")
    }
  }

  this.then = function(callback){
    this.successCallback = callback
    return this
  }

  this.catch = function(callback){
   this.errCallback = callback
   return this
  }

 this.do = function(){
  var inerSuccessCallback = this.successCallback;
  var inerErrCallback = this.errCallback;

  request(this.options, function (error, res) {
    if (!error && res.statusCode == 200) {
      if(inerSuccessCallback){
        var data = JSON.parse(res.body)
        inerSuccessCallback.call(this, res, data)
      }
     }else{
      if(inerErrCallback){
        inerErrCallback.call(this, error)
      }
     }
   });
   return this
 }
 return this
}

module.exports = function(sequelize, DataTypes) {
  var TrafficPlan = sequelize.define('TrafficPlan', {
    providerId: { type: DataTypes.INTEGER, allowNull: false },
    value: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    name: { type: DataTypes.STRING, allowNull: false },
    cost: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0.00 },
    sortNum: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
    display: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    type: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
    bid: { type: DataTypes.INTEGER, allowNull: true },
    trafficGroupId: { type: DataTypes.INTEGER, allowNull: true }
  }, {
    classMethods: {
      associate: function(models) {
        models.TrafficPlan.belongsTo(models.TrafficGroup, { foreignKey: 'trafficGroupId' });
      },
      syncDataSource: function(phone) {
        return new DataSource(phone)
      }
    },
    instanceMethods: {
      className: function(){
        return "TrafficPlan"
      },
      provider: function(){
        return TrafficPlan.ProviderName[this.providerId]
      }
    },
    scopes: {
      forSelect: {
        where: {
          providerId: 0
        },
        order: [
          ['sortNum']
        ]
      }
    }
  });

  TrafficPlan.Provider = {
    '中国移动': 0,
    '中国联通': 1,
    '中国电信': 2
  }

  TrafficPlan.ProviderName = {
    0: '中国移动',
    1: '中国联通',
    2: '中国电信'
  }
  TrafficPlan.TYPE = {
    '非正式' : 0,
    '正式' : 1
  }

  return TrafficPlan;
};