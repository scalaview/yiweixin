'use strict';

var request = require("request")
var async = require("async")
var helpers = require("../helpers")
var config = require("../config")
var querystring = require("querystring");

var Recharger = function(phone, value, id, callbackUrl){
  this.phone = phone
  this.value = value
  this.id = id
  this.callbackUrl = callbackUrl
  this.options = {
    uri: config.yunma,
    method: 'GET',
    qs: {
      a: config.user,
      p: config.pwd,
      m: this.phone,
      t: this.value,
      d: this.id,
      n: querystring.escape(callbackUrl)
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
  var ExtractOrder = sequelize.define('ExtractOrder', {
    state: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    exchangerType: { type: DataTypes.STRING, allowNull: false },
    exchangerId: { type: DataTypes.INTEGER, allowNull: false },
    phone: {  type: DataTypes.STRING, allowNull: true },
    cost: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
    extend: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
    value: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    type: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
    bid: { type: DataTypes.INTEGER, allowNull: true }
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
        models.ExtractOrder.belongsTo(models.TrafficPlan, {
          foreignKey: 'exchangerId',
          scope: {
            sourceable: 'TrafficPlan'
          }
        });
        models.ExtractOrder.belongsTo(models.FlowTask, {
          foreignKey: 'exchangerId',
          scope: {
            sourceable: 'FlowTask'
          }
        });
      }
    },
    instanceMethods: {
      isDone: function() {
        return (this.state === ExtractOrder.STATE.SUCCESS)
      },
      className: function() {
        return "ExtractOrder";
      },
      getExchanger: function(conditions){
        return this['get' + this.exchangerType].call(this, conditions)
      },
      stateName: function(){
        if(this.state === ExtractOrder.STATE.INIT){
          return "待处理"
        }else if(this.state === ExtractOrder.STATE.SUCCESS){
          return "成功"
        }else if(this.state === ExtractOrder.STATE.FAIL){
          return "失败"
        }
      },
      autoRecharge: function(callbackUrl){
        return new Recharger(this.phone, this.value, this.id, callbackUrl)
      }
    }
  });

  ExtractOrder.STATE = {
    INIT: 0,
    SUCCESS: 1,
    FAIL: 2
  }
  return ExtractOrder;
};