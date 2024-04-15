const _              = require('lodash');
const Fs             = require('fs');
const LanceDb        = require('vectordb');
const { app }        = require('electron');
const Path           = require('path');

const Settings = require(Path.resolve(__dirname, '../settings'));

/**
 * Get the base path to the db directory
 *
 * @returns {String}
 */
function GetDbBasePath() {
    const basePath = Path.join(
        Settings.getAppSetting('appDataFolder', app.getPath('userData')),
        'store/db'
    );

    if (!Fs.existsSync(basePath)) {
        Fs.mkdirSync(basePath, { recursive: true});
    }

    return basePath;
}

let DbTables = {};

/**
 *
 * @param {*} tableName
 * @returns
 */
async function GetTable(tableName) {
    if (_.isUndefined(DbTables[tableName])) {
        const db     = await LanceDb.connect(GetDbBasePath());
        const tables = await db.tableNames();

        if (tables.includes(tableName)) {
            DbTables[tableName] = await db.openTable(tableName);
        } else {
            // The schema for the table
            DbTables[tableName] = await db.createTable(tableName, [{
                vector: Array(1536),
                uuid: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxx'
            }]);
        }
    }

    return DbTables[tableName];
}

module.exports = {

    /**
     *
     * @param {String} uuid
     * @param {Array} embedding
     *
     * @returns {Void}
     */
    indexQuestion: async (uuid, embedding) => {
        const table = await GetTable('questions');

        // Store the question in the vector store
        await table.add([{
            vector: embedding,
            uuid
        }]);
    },

    /**
     *
     * @param {String} uuid
     *
     * @returns {Void}
     */
    deleteQuestion: async (uuid) => {
        const table = await GetTable('questions');

        // Store the question in the vector store
        await table.delete(`uuid="${uuid}"`);
    },

    /**
     *
     * @param {Array<number>} vector
     * @param {Number}        limit
     *
     * @returns {Promise<Object|Array<Object>>}
     */
    searchQuestions: async (vector, limit = 2) => {
        const db = await GetTable('questions');

        return db.search(vector).limit(limit).execute();
    },

}