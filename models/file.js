const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const File = sequelize.define('File', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    filename: { type: DataTypes.STRING, allowNull: false },
    origName: { type: DataTypes.STRING, allowNull: false },
    mime: { type: DataTypes.STRING },
    path: { type: DataTypes.STRING, allowNull: false }
  });

  return File;
};
