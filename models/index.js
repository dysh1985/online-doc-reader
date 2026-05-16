const { Sequelize } = require('sequelize');
const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL || '';

let sequelize;
if (DATABASE_URL) {
  sequelize = new Sequelize(DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
  });
} else {
  const storage = path.join(__dirname, '..', 'database.sqlite');
  sequelize = new Sequelize({ dialect: 'sqlite', storage, logging: false });
}

const User = require('./user')(sequelize);
const File = require('./file')(sequelize);

User.hasMany(File, { foreignKey: 'uploaderId' });
File.belongsTo(User, { foreignKey: 'uploaderId' });

module.exports = { sequelize, User, File };
