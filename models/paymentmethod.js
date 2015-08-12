'use strict';
module.exports = function(sequelize, DataTypes) {
  var PayMentMethod = sequelize.define('PayMentMethod', {
    name: DataTypes.STRING
  }, {
    classMethods: {
      associate: function(models) {
        models.PayMentMethod.hasMany(models.Order, { foreignKey: 'paymentMethodId' } );
      }
    }
  });
  return PayMentMethod;
};