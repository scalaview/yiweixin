'use strict';
var crypto = require('crypto')

module.exports = function(sequelize, DataTypes) {
  var User = sequelize.define('User', {
    username: { type: DataTypes.STRING, allowNull: false},
    password_hash: { type: DataTypes.STRING, allowNull: false},
    password: {
      type: DataTypes.VIRTUAL,
      set: function (val) {
        this.setDataValue('password', val);
        this.setDataValue('salt', this.makeSalt())
        this.setDataValue('password_hash', this.encryptPassword(this.password));
      },
      validate: {
         isLongEnough: function (val) {
           if (val.length < 7) {
             throw new Error("Please choose a longer password")
          }
       }
      }
    },
    salt: { type: DataTypes.STRING, allowNull: false}
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
      },
      authorization: function(username, password, callback) {
        this.find({ where: {username: username} }).on('success', function(user) {
          if(user.verifyPassword(password)){
            callback(user)
          }
        }).on('error', function(error) {
          callback(error)
        })
      },
      encryptPassword: function(password, salt) {
        return crypto.createHmac('sha1', salt).update(password).digest('hex');
      }
    },
    instanceMethods: {
      resetPassword: function(password) {
        this.password = password
        return this.save()
      },
      verifyPassword: function(password) {
        return this.encryptPassword(password) == this.password_hash
      },
      makeSalt: function(){
        return Math.round((new Date().valueOf() * Math.random())) + '';
      },
      encryptPassword: function(password) {
        return User.encryptPassword(password, this.salt)
      }
    }
  });

  return User;
};