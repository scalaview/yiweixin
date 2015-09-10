'use strict';
module.exports = function(sequelize, DataTypes) {
  var Level = sequelize.define('Level', {
      name: {
        type: DataTypes.STRING
      },
      discount: {
        type: DataTypes.FLOAT,
        defaultValue: 1.00
      },
      extend: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      }
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
      }
    }
  });
  return Level;
};