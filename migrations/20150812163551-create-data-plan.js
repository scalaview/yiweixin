'use strict';
module.exports = {
  up: function(queryInterface, Sequelize) {
    return queryInterface.createTable('DataPlans', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      value: {
        type: Sequelize.STRING,
        allowNull: false
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    }).then(function(){
      queryInterface.sequelize.query("insert into DataPlans (name, value) values ('100流量币', 100)");
      queryInterface.sequelize.query("insert into DataPlans (name, value) values ('1000流量币', 100)");
      queryInterface.sequelize.query("insert into DataPlans (name, value) values ('5000流量币', 100)");
      queryInterface.sequelize.query("insert into DataPlans (name, value) values ('', 100)");
      queryInterface.sequelize.query("insert into DataPlans (name, value) values ('', 100)");
      done();
    });
  },
  down: function(queryInterface, Sequelize) {
    return queryInterface.dropTable('DataPlans');
  }
};