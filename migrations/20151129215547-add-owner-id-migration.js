'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface.addColumn(
      'FlowHistories',
      'ownerId',
      {
        type: Sequelize.INTEGER,
        allowNull: true
      }
    );
  },

  down: function (queryInterface, Sequelize) {
    return queryInterface.removeColumn("FlowHistories", "ownerId")
  }
};
