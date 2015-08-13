'use strict';
var _ = require('lodash')
var async = require("async")

module.exports = function(sequelize, DataTypes) {
  var concern = require('./concerns/profile_attributes')
  var Customer = sequelize.define('Customer', {
    username: {type: DataTypes.STRING, allowNull: false},
    password_hash: {type: DataTypes.STRING, allowNull: false},
    password: {
      type: DataTypes.VIRTUAL,
      set: function(val){
        this.setDataValue('password', val);
        this.setDataValue('salt', this.makeSalt())
        this.setDataValue('password_hash', this.encryptPassword(this.password));
      },
      validate: {
         isLongEnough: function (val) {
           if (val.length < 7) {
             throw new Error("Please choose a longer password")
          }
       }
      }
    },
    salt: { type: DataTypes.STRING, allowNull: false },
    wechat: { type: DataTypes.STRING, allowNull: true },
    phone: { type: DataTypes.STRING, allowNull: false },
    lastLoginAt: { type: DataTypes.DATE, allowNull: true },
    remainingTraffic: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 }
  }, {
    classMethods: _.merge(concern.classMethods, {
      associate: function(models) {
        models.Customer.hasMany(models.FlowHistory, { foreignKey: 'customerId' })
        models.Customer.hasMany(models.Order, { foreignKey: 'customerId' })
      }
    }),
    instanceMethods: _.merge(concern.instanceMethods, {
      className: function(){
        return 'Customer'
      },
      addTraffic: function(models, order, successCallBack, errCallBack) {
        var customer = this
        async.waterfall([function(next){
          if(order.isPaid()){
            order.getDataPlan().then(function(dataPlan) {
              order.dataPlan = dataPlan
              next(null, order)
            })
          }else{
            errCallBack()
          }
        }, function(order, next){
          customer.updateAttributes({
              remainingTraffic: customer.remainingTraffic + order.dataPlan.value
            }).then(function(customer){
              next(null, customer, order)
            }).catch(errCallBack)
        }, function(customer, order, next){
          customer.takeFlowHistory(models, order, order.dataPlan.value, "购买流量币", function(flowHistory){
              successCallBack(customer, order, flowHistory)
            }, errCallBack)
        }], function(err){
          errCallBack(err)
        })
      },
      takeFlowHistory: function(models, obj, amount, comment, successCallBack, errCallBack){
        var customer = this
        models.FlowHistory.build({
          customerId: customer.id,
          state: models.FlowHistory.STATE.ADD,
          type: obj.className(),
          typeId: obj.id,
          amount: amount,
          comment: comment
        }).save().then(function(flowHistory){
          successCallBack(flowHistory)
        }).catch(function(err){
          errCallBack(err)
        })
      },
      getLastFlowHistory: function(models, state, successCallBack, errCallBack){
        var customer = this
        if(state === undefined){
          this.getFlowHistories().then(function(flowHistories){
            if(flowHistories.length > 0){
              successCallBack(flowHistories[flowHistories.length - 1])
            }else{
              successCallBack()
            }
          }).catch(errCallBack)
        }else if( (state === models.FlowHistory.STATE.ADD) || (state === models.FlowHistory.STATE.REDUCE) ){
          async.waterfall([function(next){
            models.FlowHistory.findOne({ where: {
                customerId: customer.id,
                state: state
              }, order: [
                ['createdAt', 'DESC']
              ]
            }).then(function(flowHistory){
              if(flowHistory){
                customer.lastFlowHistory = flowHistory
                next(null, customer)
              }else{
                successCallBack(customer)
              }
            }).catch(errCallBack)
          }, function(customer, next){
            var flowHistory = customer.lastFlowHistory
            models[flowHistory.type].findById(flowHistory.typeId).then(function(source){
              if(source){
                flowHistory.source = source
              }
              successCallBack(customer, flowHistory)
            }).catch(errCallBack)
          }], function(err, result){

          })

        }else{
          errCallBack(new Error("FlowHistory state not include"))
        }
      }
    }),
    scopes: {

    }
  });
  return Customer;
};