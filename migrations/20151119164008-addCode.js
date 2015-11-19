'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {
     return queryInterface.addColumn(
      'Levels',
      'code',
      {
        type: Sequelize.STRING,
        allowNull: true
      }
    ).then(function() {
      queryInterface.sequelize.query("update Levels set code = " + " 'normal' where name = '普通用户' " );
    })

  },

  down: function (queryInterface, Sequelize) {
    return queryInterface.removeColumn( "Level", "code")
  }
};
