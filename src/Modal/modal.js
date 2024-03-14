const mysql = require('mysql');

const con = mysql.createConnection({
    host: process.env.DB_HOSTNAME || "localhost",
    user: process.env.DB_USERNAME || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "glitzo"
});

// Mysql methods
const getData = (tableName, columnName = '*', where = '', callback) => {
    let query = `SELECT ${columnName} FROM ${tableName}`
    if (where != '') {
        query += ` WHERE ${where}`
    }

    con.query(`${query}`, function (err, result, fields) {
        if (err) throw err;
        callback(result[0])
    });
}

const insertData = (tableName, columnName, values, callback) => {
    let query = `INSERT INTO ${tableName} (${columnName}) VALUES (${values})`;
    con.query(query, function (err, result) {
        if (err) { callback(err, null); }
        const lastInsertId = result.insertId;
        callback(null, lastInsertId);
    });
}

const updateData = (tableName, dataUpdate, where = '', order = '') => {
    let sql = `UPDATE ${tableName} SET ${dataUpdate}`;
    if (where != '') {
        sql += `  WHERE ${where}`
    }

    if (order != '') {
        sql += ` ORDER BY ${order}`
    }

    con.query(sql, function (err, result) {
        if (err) throw err;
        console.log(result.affectedRows + " record(s) updated");
    });
}

module.exports = { getData, insertData, updateData };
