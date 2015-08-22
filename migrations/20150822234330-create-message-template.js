'use strict';
module.exports = {
  up: function(queryInterface, Sequelize) {
    return queryInterface.createTable('MessageTemplates', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING
      },
      content: {
        type: Sequelize.TEXT
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
      queryInterface.sequelize.query("insert into MessageTemplates (name, content, createdAt, updatedAt) values ('register message', '【易流量】 您的验证码：{{code}}，验证码30分钟内有效。http://yiliuliang.net/register', CURTIME(), CURTIME())");
    })
  },
  down: function(queryInterface, Sequelize) {
    return queryInterface.dropTable('MessageTemplates');
  }
};