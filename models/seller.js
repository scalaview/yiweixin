'use strict';
var crypto = require('crypto');

module.exports = function(sequelize, DataTypes) {
  var Seller = sequelize.define('Seller', {
    name: { type: DataTypes.STRING, allowNull: false },
    accessToken: { type: DataTypes.STRING, allowNull: false }
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
      }
    },
    instanceMethods: {
      generatAccessToken: function() {
        var token = crypto.createHmac('sha1', Math.round((new Date().valueOf() * Math.random())) + '').update('accessToken').digest('hex');
        this.setDataValue('accessToken', token)
        return token
      }
    }
  });
  return Seller;
};