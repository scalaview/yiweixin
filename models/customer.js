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
    remainingTraffic: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
    sex: { type: DataTypes.STRING, allowNull: true },
    city: { type: DataTypes.STRING, allowNull: true },
    province:  { type: DataTypes.STRING, allowNull: true },
    country: { type: DataTypes.STRING, allowNull: true },
    headimgurl: { type: DataTypes.STRING, allowNull: true },
    levelId: { type: DataTypes.INTEGER, allowNull: true },
    affiliateId: { type: DataTypes.INTEGER, allowNull: true },
    secondAffiliateId: { type: DataTypes.INTEGER, allowNull: true },
    thirdAffiliateId: { type: DataTypes.INTEGER, allowNull: true },
    isSubscribe: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    salary: { type: DataTypes.DECIMAL, allowNull: false, defaultValue: 0 },
    subscribeTime: { type: DataTypes.DATE, allowNull: true },
    ticket: { type: DataTypes.STRING, allowNull: true },
    ancestryDepth: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    ancestry: {
      type: DataTypes.STRING,
      allowNull: true,
      set: function(ancestryCustomer){
        if(ancestryCustomer){
          this.setDataValue('ancestry', ancestryCustomer.ancestry.push(ancestryCustomer.id).join('/'))
          this.setDataValue('ancestryDepth', parseInt(ancestryCustomer.ancestryDepth) + 1 )
        }
      }
    }
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
          customer.takeFlowHistory(models, order, order.dataPlan.value, "购买流量币", models.FlowHistory.STATE.ADD, function(flowHistory){
              successCallBack(customer, order, flowHistory)
            }, errCallBack)
        }], function(err){
          errCallBack(err)
        })
      },
      reduceTraffic: function(models, extractOrder, successCallBack, errCallBack) {
        var customer = this
        async.waterfall([function(next){
          extractOrder.getTrafficPlan().then(function(trafficPlan) {
            extractOrder.trafficPlan = trafficPlan
            next(null, extractOrder, trafficPlan)
          }).catch(function(err) {
            next(err)
          })
        }, function(extractOrder, trafficPlan, next){
          if(customer.remainingTraffic > trafficPlan.cost){
            customer.updateAttributes({
                remainingTraffic: customer.remainingTraffic - extractOrder.cost
              }).then(function(customer){
                next(null, customer, extractOrder, trafficPlan)
              }).catch(function(err) {
                next(err)
              })
          }else{
            next(new Error("剩余流量币不足"))
          }
        }, function(customer, extractOrder, trafficPlan, next){
          customer.takeFlowHistory(models, extractOrder, trafficPlan.cost, "提取流量" + trafficPlan.name + "至" + extractOrder.phone, models.FlowHistory.STATE.REDUCE, function(flowHistory){
              next(null, customer, extractOrder, trafficPlan, flowHistory)
            }, function(err){
              next(err)
            })
        }], function(err, customer, extractOrder, trafficPlan, flowHistory){
          if(err){
            errCallBack(err)
          }else{
            successCallBack(customer, extractOrder, trafficPlan, flowHistory)
          }
        })
      },
      refundTraffic: function(models, extractOrder, message,successCallBack, errCallBack) {
        var customer = this
        async.waterfall([function(next) {
          customer.updateAttributes({
            remainingTraffic: customer.remainingTraffic + extractOrder.cost
          }).then(function(customer) {
            next(null, customer, extractOrder)
          }).catch(function(err) {
            next(err)
          })
        }, function(customer, extractOrder, next) {
          extractOrder.getTrafficPlan().then(function(trafficPlan) {
            extractOrder.trafficPlan = trafficPlan
            next(null, customer, extractOrder, trafficPlan)
          }).catch(function(err) {
            next(err)
          })
        },function(customer, extractOrder, trafficPlan, next) {
          var msg = "提取" + trafficPlan.name + "至" + extractOrder.phone + "失败。原因：" + message + "。流量币已经退还账户，对你造成的不便我们万分抱歉"
          customer.takeFlowHistory(models, extractOrder, extractOrder.cost, msg, models.FlowHistory.STATE.ADD, function(flowHistory){
              next(null, customer, extractOrder, flowHistory)
            }, function(err) {
              next(err)
            })
        }], function(err, customer, extractOrder, flowHistory) {
          if(err){
            errCallBack(err)
          }else{
            successCallBack(customer, extractOrder, flowHistory)
          }
        })
      },
      takeFlowHistory: function(models, obj, amount, comment, state, successCallBack, errCallBack){
        var customer = this
        if(state !== models.FlowHistory.STATE.ADD && state !== models.FlowHistory.STATE.REDUCE){
          return errCallBack(new Error("Type Error"))
        }
        var params = {
          customerId: customer.id,
          state: state,
          amount: amount,
          comment: comment
        }
        if(obj !== undefined){
          _.merge(params, {
            type: obj.className(),
            typeId: obj.id
          })
        }
        models.FlowHistory.build(params).save().then(function(flowHistory){
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
            if(flowHistory.type){
              models[flowHistory.type].findById(flowHistory.typeId).then(function(source){
                if(source){
                  flowHistory.source = source
                }
                successCallBack(customer, flowHistory)
              }).catch(errCallBack)
            }else{
              successCallBack(customer, flowHistory)
            }
          }], function(err, result){
          })

        }else{
          errCallBack(new Error("FlowHistory state not include"))
        }
      },
      givenTo: function(models, otherone, amount, successCallBack, errCallBack){
        var customer = this

        if(customer.remainingTraffic < amount){
          errCallBack(new Error("not enough"))
          return
        }

        async.waterfall([function(next) {
          customer.updateAttributes({
            remainingTraffic: customer.remainingTraffic - amount
          }).then(function(customer) {
            next(null, customer)
          }).catch(function(err) {
            next(err)
          })
        }, function(customer, next) {
          customer.takeFlowHistory(models, otherone, amount, "向" + otherone.phone + "用户转赠流量" + amount +"E币", models.FlowHistory.STATE.REDUCE,
            function(flowHistory){
              next(null, customer, flowHistory)
            }, function(err) {
              next(err)
            })
        }, function(customer, flowHistory, next) {
          otherone.updateAttributes({
            remainingTraffic: otherone.remainingTraffic + amount
          }).then(function(otherone) {
            next(null, otherone)
          }).catch(function(err) {
            next(err)
          })
        }, function(otherone, next) {
          otherone.takeFlowHistory(models, otherone, amount, customer.phone + "向您转赠流量" + amount +"E币", models.FlowHistory.STATE.ADD,
            function(flowHistory){
              next(null, otherone, flowHistory)
            }, function(err) {
              next(err)
            })
        }], function(err) {
          if(err){
            errCallBack(err)
          }else{
            successCallBack()
          }
        })
      },
      getAncestry: function(){
        if(this.ancestry) {
          return this.ancestry.split('/')
        }else{
          return []
        }
      }
    }),
    scopes: {

    }
  });
  return Customer;
};