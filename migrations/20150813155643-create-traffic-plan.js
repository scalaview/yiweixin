'use strict';
module.exports = {
  up: function(queryInterface, Sequelize) {
    return queryInterface.createTable('TrafficPlans', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      providerId: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      value: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      cost: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0.00
      },
      sortNum: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0
      },
      display: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
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
      queryInterface.sequelize.query("insert into TrafficPlans (providerId, name, value, cost, sortNum, createdAt, updatedAt) values (0, '30M', 30, 500, 0, CURTIME(), CURTIME())");
      queryInterface.sequelize.query("insert into TrafficPlans (providerId, name, value, cost, sortNum, createdAt, updatedAt) values (0, '70M', 70, 1000, 1, CURTIME(), CURTIME())");
      queryInterface.sequelize.query("insert into TrafficPlans (providerId, name, value, cost, sortNum, createdAt, updatedAt) values (0, '150M', 150, 2000, 2, CURTIME(), CURTIME())");
      queryInterface.sequelize.query("insert into TrafficPlans (providerId, name, value, cost, sortNum, createdAt, updatedAt) values (0, '200M', 200, 1400, 3, CURTIME(), CURTIME())");
      queryInterface.sequelize.query("insert into TrafficPlans (providerId, name, value, cost, sortNum, createdAt, updatedAt) values (0, '500M', 500, 3000, 4, CURTIME(), CURTIME())");
      queryInterface.sequelize.query("insert into TrafficPlans (providerId, name, value, cost, sortNum, createdAt, updatedAt) values (0, '1024M', 1024, 5000, 5, CURTIME(), CURTIME())");
      queryInterface.sequelize.query("insert into TrafficPlans (providerId, name, value, cost, sortNum, createdAt, updatedAt) values (0, '2048M', 2048, 7000, 6, CURTIME(), CURTIME())");

      queryInterface.sequelize.query("insert into TrafficPlans (providerId, name, value, cost, sortNum, createdAt, updatedAt) values (1, '30M', 30, 500, 0, CURTIME(), CURTIME())");
      queryInterface.sequelize.query("insert into TrafficPlans (providerId, name, value, cost, sortNum, createdAt, updatedAt) values (1, '70M', 70, 1000, 1, CURTIME(), CURTIME())");
      queryInterface.sequelize.query("insert into TrafficPlans (providerId, name, value, cost, sortNum, createdAt, updatedAt) values (1, '150M', 150, 2000, 2, CURTIME(), CURTIME())");
      queryInterface.sequelize.query("insert into TrafficPlans (providerId, name, value, cost, sortNum, createdAt, updatedAt) values (1, '200M', 200, 1400, 3, CURTIME(), CURTIME())");
      queryInterface.sequelize.query("insert into TrafficPlans (providerId, name, value, cost, sortNum, createdAt, updatedAt) values (1, '500M', 500, 3000, 4, CURTIME(), CURTIME())");
      queryInterface.sequelize.query("insert into TrafficPlans (providerId, name, value, cost, sortNum, createdAt, updatedAt) values (1, '1024M', 1024, 5000, 5, CURTIME(), CURTIME())");
      queryInterface.sequelize.query("insert into TrafficPlans (providerId, name, value, cost, sortNum, createdAt, updatedAt) values (1, '2048M', 2048, 7000, 6, CURTIME(), CURTIME())");

      queryInterface.sequelize.query("insert into TrafficPlans (providerId, name, value, cost, sortNum, createdAt, updatedAt) values (2, '30M', 30, 500, 0, CURTIME(), CURTIME())");
      queryInterface.sequelize.query("insert into TrafficPlans (providerId, name, value, cost, sortNum, createdAt, updatedAt) values (2, '70M', 70, 1000, 1, CURTIME(), CURTIME())");
      queryInterface.sequelize.query("insert into TrafficPlans (providerId, name, value, cost, sortNum, createdAt, updatedAt) values (2, '150M', 150, 2000, 2, CURTIME(), CURTIME())");
      queryInterface.sequelize.query("insert into TrafficPlans (providerId, name, value, cost, sortNum, createdAt, updatedAt) values (2, '200M', 200, 1400, 3, CURTIME(), CURTIME())");
      queryInterface.sequelize.query("insert into TrafficPlans (providerId, name, value, cost, sortNum, createdAt, updatedAt) values (2, '500M', 500, 3000, 4, CURTIME(), CURTIME())");
      queryInterface.sequelize.query("insert into TrafficPlans (providerId, name, value, cost, sortNum, createdAt, updatedAt) values (2, '1024M', 1024, 5000, 5, CURTIME(), CURTIME())");
      queryInterface.sequelize.query("insert into TrafficPlans (providerId, name, value, cost, sortNum, createdAt, updatedAt) values (2, '2048M', 2048, 7000, 6, CURTIME(), CURTIME())");

    });
  },
  down: function(queryInterface, Sequelize) {
    return queryInterface.dropTable('TrafficPlans');
  }
};