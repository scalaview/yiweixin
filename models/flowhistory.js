'use strict';
var async = require("async")

module.exports = function(sequelize, DataTypes) {
  var FlowHistory = sequelize.define('FlowHistory', {
    customerId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    state: { type: DataTypes.INTEGER, allowNull: false },
    type: { type: DataTypes.STRING, allowNull: true },
    typeId: { type: DataTypes.INTEGER, allowNull: true },
    amount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    comment: { type: DataTypes.STRING, allowNull: false }
  }, {
    classMethods: {
      associate: function(models) {
        models.FlowHistory.belongsTo(models.Customer, { foreignKey: 'customerId' });
        models.FlowHistory.belongsTo(models.Order, {
          foreignKey: 'typeId',
          scope: {
            sourceable: 'Order'
          }
        }),
        models.FlowHistory.belongsTo(models.ExtractOrder, {
          foreignKey: 'typeId',
          scope: {
            sourceable: 'ExtractOrder'
          }
        })
      },
      histories: function(state, successCallBack, errCallBack){
        FlowHistory.scope(state).findAll().then(function(flowHistories) {
          async.map(flowHistories, function(flowHistory, next){
            if( state === 'income' ){
              flowHistory.getOrder().then(function(order) {
                flowHistory.source = order
                next(null, flowHistory)
              }).catch(function(err){
                next(err)
              })
            }else{
              flowHistory.getExtractOrder().then(function(extractOrder) {
                flowHistory.source = extractOrder
                next(null, flowHistory)
              }).catch(function(err){
                next(err)
              })
            }
          } , function(err, flowHistories){
            if(err){
              errCallBack(err)
            }else{
              successCallBack(flowHistories)
            }
          })
        })
      },
      incomeHistories: function(successCallBack, errCallBack){
        this.histories('income', successCallBack, errCallBack)
      },
      reduceHistories: function(successCallBack, errCallBack){
        this.histories('reduce', successCallBack, errCallBack)
      }
    },
    scopes: {
      income: {
        where: {
          state: 1
        },
        order: [
          ['createdAt', 'DESC']
        ]
      },
      reduce: {
        where: {
          state: 0
        },
        order: [
          ['createdAt', 'DESC']
        ]
      }
    }
  });
  FlowHistory.STATE = {
    ADD: 1,
    REDUCE: 0
  };
  return FlowHistory;
};