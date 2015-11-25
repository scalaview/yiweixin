'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface.addColumn(
      'FlowHistories',
      'trafficType',
      {
        type: Sequelize.String,
        allowNull: false,
        defaultValue: "remainingTraffic"
      }
    );
  },

  down: function (queryInterface, Sequelize) {
    return queryInterface.removeColumn( "FlowHistories", "trafficType")
  }
};
