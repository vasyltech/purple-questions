const Fs             = require('fs');
const Path           = require('path');
const { app }        = require('electron');
const { v4: uuidv4 } = require('uuid');
const _              = require('lodash');

import OpenAiRepository from './repository/openai';
import Settings from './settings';

/**
 * Get the base path to the tuning directory
 *
 * @returns {String}
 */
function GetTuningBasePath(append = null) {
    const basePath = Path.join(
        Settings.getSetting('appDataFolder', app.getPath('userData')),
        'store/tuning'
    );

    if (!Fs.existsSync(basePath)) {
        Fs.mkdirSync(basePath, { recursive: true});

        // Create the message index
        Fs.writeFileSync(Path.join(basePath, '.index'), '[]');
    }

    return append ? Path.join(basePath, append) : append;
}

/**
 * Tunning index
 */
const TuningIndex = (() => {

    let index = null;

    /**
     *
     * @returns
     */
    function Read(reload = false) {
        if (_.isNull(index) || reload) {
            const filePath = GetTuningBasePath('.index');

            if (Fs.existsSync(filePath)) {
                index = JSON.parse(Fs.readFileSync(filePath).toString());
            } else {
                index = [];
            }
        }

        return index;
    }

    /**
     *
     */
    function Save() {
        Fs.writeFileSync(GetTuningBasePath('.index'), JSON.stringify(index));
    }

    /**
     *
     * @param {*} batch
     */
    function Add(batch) {
        Read().push(batch);

        Save();

        return batch;
    }

    /**
     *
     * @param {*} uuid
     * @param {*} data
     * @returns
     */
    function Update(uuid, data) {
        let response;

        const list = Read();

        for (let i = 0; i < list.length; i++) {
            if (list[i].uuid === uuid) {
                list[i]  = Object.assign({}, list[i], data);
                response = list[i];

                break;
            }
        }

        Save();

        return response;
    }

    return {
        get: Read,
        add: Add,
        update: Update
    }
})();

const Methods = {

    /**
     *
     * @param {*} page
     * @param {*} limit
     */
    getTunings: (page = 0, limit = 500) => {
        // Cloning the array to avoid issue with reverse
        const index = _.clone(TuningIndex.get(true));
        const start = page * limit;

        return index.reverse().slice(start, start + limit);
    },

    /**
     *
     * @returns
     */
    createTuning: () => {
        const uuid     = uuidv4();
        const fullPath = GetTuningBasePath(uuid);

        Fs.writeFileSync(fullPath, JSON.stringify([]));

        return TuningIndex.add({
            uuid,
            createdAt: (new Date()).getTime(),
            status: 'preparing',
            queued: 0
        });
    },

    /**
     *
     * @param {*} uuid
     * @returns
     */
    readTuning: async (uuid) => {
        return JSON.parse(Fs.readFileSync(GetTuningBasePath(uuid)).toString());
    },

    /**
     *
     * @param {*} uuid
     */
    queue: async (uuid) => {
        // TODO - if we exposing this setting on the UI, we need to cover the scenario
        // when the queue size changed from higher to lower and offload the pending
        // queue before creating a new one
        const maxSize = Settings.getSetting('fineTuningBatchSize', 10);
        let batch     = Methods.getTunings(0, 1);

        if (!_.isArray(batch) || batch.queued >= maxSize) {
            batch = Methods.createTuning();
        }

        // Add the task to the queue
        const tuning = Methods.readTuning(batch.uuid);
        tuning.push(uuid);

        // tuning.push([
        //     {
        //         role: 'system',
        //         content: Settings.getSetting(
        //             'fineTuningSystemPrompt',
        //             'You are an invaluable virtual customer support representative.'
        //         )
        //     },
        //     {
        //         role: 'user',
        //         'content': input
        //     },
        //     {
        //         role: 'assistant',
        //         content: output
        //     }
        // ]);

        // Saving the queue
        Fs.writeFileSync(GetTuningBasePath(uuid), JSON.stringify(tuning));

        // Offloading the queue if we hit the limit
        // if (tuning.length >= maxSize) {
        //     const result = await OpenAiRepository.createFineTuningJob(
        //         Methods.readTuning(batch.uuid)
        //     );

        //     if (_.get(result, 'status') !== 'failed') {
        //         TuningIndex.update(batch.uuid, Object.assign({}, {
        //             updatedAt: (new Date()).getTime(),
        //             queued: tuning.length
        //         }, result));
        //     } else {
        //         console.log(result);
        //     }
        // }

        return batch.uuid;
    },

    /**
     *
     * @param {*} uuid
     * @returns
     */
    updateMessageStatus: (uuid, status) => MessageIndex.update(uuid, {
        status,
        updatedAt: (new Date()).getTime()
    })

}

export default Methods;