'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {
    queryInterface.changeColumn(
      'ExtractOrders',
      'taskid',
      {
        type: Sequelize.STRING,
        allowNull: true
      }
    )
  },

  down: function (queryInterface, Sequelize) {
  }
};
