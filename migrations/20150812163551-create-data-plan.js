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
        type: Sequelize.INTEGER,
        allowNull: false
      },
      price: {
        type: Sequelize.DECIMAL,
        allowNull: true,
        defaultValue: 0
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
      queryInterface.sequelize.query("insert into DataPlans (price, name, value, createdAt, updatedAt) values (1, '100流量币', 100, CURTIME(), CURTIME())");
      queryInterface.sequelize.query("insert into DataPlans (price, name, value, createdAt, updatedAt) values (10, '1000流量币', 1000, CURTIME(), CURTIME())");
      queryInterface.sequelize.query("insert into DataPlans (price, name, value, createdAt, updatedAt) values (50, '5000流量币', 5000, CURTIME(), CURTIME())");
      queryInterface.sequelize.query("insert into DataPlans (price, name, value, createdAt, updatedAt) values (100, '10000流量币', 10000, CURTIME(), CURTIME())");
      queryInterface.sequelize.query("insert into DataPlans (price, name, value, createdAt, updatedAt) values (500, '50000流量币', 50000, CURTIME(), CURTIME())");
      queryInterface.sequelize.query("insert into DataPlans (price, name, value, createdAt, updatedAt) values (2000, '200000流量币', 200000, CURTIME(), CURTIME())");
    });
  },
  down: function(queryInterface, Sequelize) {
    return queryInterface.dropTable('DataPlans');
  }
};