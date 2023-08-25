const _              = require('lodash');
const Fs             = require('fs');
const LanceDb        = require('vectordb');
const { Vector, Type }     = require('apache-arrow');
const { app }        = require('electron');
const Path           = require('path');

/**
 * Get the base path to the db directory
 *
 * @returns {String}
 */
function GetDbBasePath() {
    const basePath = Path.join(app.getPath('userData'), 'store', 'db');

    if (!Fs.existsSync(basePath)) {
        Fs.mkdirSync(basePath, { recursive: true});
    }

    return basePath;
}

// class VectorDb {

//     async connect(tableName = 'questions') {
//         this._db     = await LanceDb.connect(GetDbBasePath());


//         return this;
//     }

//     async add(record) {
//         return this._table.add([record]);
//     }


//     async search(vector, limit = 2) {
//         return this._table.search(vector).limit(limit).execute();
//     }

// }

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
                document: 'table/partition-number/uuid',
                question: 'uui'
            }]);
        }
    }

    return DbTables[tableName];
}

export default {

    /**
     *
     * @param {String} document
     * @param {String} question
     * @param {Array} embedding
     *
     * @returns {Void}
     */
    indexQuestion: async (document, question, embedding) => {
        const table = await GetTable('questions');

        // Store the question in the vector store
        await table.add([{
            vector: embedding,
            document,
            question
        }]);
    },

    /**
     *
     * @param {Array<number>} vector
     * @param {Number}        limit
     * @param {Number}        minSimilarityScore
     *
     * @returns {Promise<Object|Array<Object>>}
     */
    searchQuestion: async (vector, limit = 2, minSimilarityScore = 0.25) => {
        const db       = await GetTable('questions');
        const results  = await db.search(vector).limit(limit).execute();
        const filtered = _.filter(results, (r) => r._distance <= minSimilarityScore);

        return limit === 1 ? _.first(filtered) : filtered;
    },

}