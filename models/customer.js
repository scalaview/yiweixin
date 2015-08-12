'use strict';
var _ = require('lodash')

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
      }
    }),
    instanceMethods: _.merge(concern.instanceMethods, {
      addTraffic: function(order, successCallBack, errCallBack) {
        var customer = this
        if(order.isPaid()){
          order.getDataPlan().then(function(dataPlan) {
            customer.updateAttributes({
              remainingTraffic: customer.remainingTraffic + dataPlan.value
            }).then(successCallBack).catch(errCallBack)
          })
        }else{
          errCallBack()
        }
      }
    }),
    scopes: {

    }
  });
  return Customer;
};