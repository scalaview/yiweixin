'use strict';
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
      }
    }
  });
  return FlowHistory;
};