const Sequelize = require('sequelize');

class Admin extends Sequelize.Model {
    static init(sequelize) {
        return super.init({
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement : true,
            },
            adminId: {
                type: Sequelize.STRING(45),
                allowNull : false,
            },
            adminPw: {
                type : Sequelize.STRING(45),
                allowNull : false,
            },
        }, {
            sequelize,
            timestamps: false,
            underscored: false,
            modelName: 'Admin',
            tableName: 'admins',
            paranoid: false,
            charset: 'utf8',
            collate: 'utf8_general_ci'
        });
    }
    static associate(db) {

    }
};

module.exports = Admin;