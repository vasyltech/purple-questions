const Fs             = require('fs');
const Path           = require('path');
const { app }        = require('electron');
const { v4: uuidv4 } = require('uuid');
const { parse }      = require('csv-parse');
const _              = require('lodash');

const OpenAiRepository = require(Path.resolve(__dirname, 'repository/openai'));
const Settings         = require(Path.resolve(__dirname, 'settings'));
const Questions        = require(Path.resolve(__dirname, 'questions'));

/**
 * Get the base path to the tuning directory
 *
 * @returns {String}
 */
function GetTuningBasePath(append = null) {
    const basePath = Path.join(
        Settings.getAppSetting('appDataFolder', app.getPath('userData')),
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
 *
 * @param {*} tuning
 * @returns
 */
function UuidListToQuestions(queue, tuningUuid) {
    const response = [];

    // Iterate over the list of questions and enrich the return value
    for(let i = 0; i < queue.length; i++) {
        const question = Questions.readQuestion(queue[i]);

        response.push({
            uuid: queue[i],
            text: question.text,
            answer: question.answer,
            allowToDelete: question.origin === `/tuning/${tuningUuid}`
        });
    }

    return response;
}

/**
 *
 * @param {*} queue
 * @param {*} uuid
 * @returns
 */
async function Offload(tuning) {
    return OpenAiRepository.createFineTuningJob(
        UuidListToQuestions(tuning.queue),
        {
            base_model: _.get(tuning, 'base_model'),
            n_epochs: _.get(tuning, 'n_epochs'),
            llm_suffix: _.get(tuning, 'llm_suffix')
        }
    );
}

/**
 *
 * @param {*} filepath
 * @returns
 */
async function ReadImportFile(filepath, skipFirstColumn) {
    return new Promise((resolve) => {
        const rows = [];

        Fs.createReadStream(filepath)
            .pipe(parse())
            .on('data', (data) => rows.push(data))
            .on('end', () => {
                resolve(skipFirstColumn ? rows.slice(1) : rows);
            });
    });
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

    /**
     *
     * @param {*} uuid
     */
    function Remove(uuid) {
        index = Read().filter(m => m.uuid !== uuid);

        Save();
    }

    return {
        get: Read,
        add: Add,
        update: Update,
        remove: Remove
    }
})();

/**
 *
 */
const Methods = {

    /**
     *
     * @param {*} page
     * @param {*} limit
     */
    getTuningList: async (page = 0, limit = 50) => {
        // Cloning the array to avoid issue with reverse
        const index = _.clone(TuningIndex.get(true));
        const start = page * limit;
        const list  = index.reverse().slice(start, start + limit);

        // If there is at least one job that has status queued, then fetch information
        // from OpenAI
        for(let i = 0; i < list.length; i++) {
            if (['queued', 'running'].includes(list[i].status)) {
                const tuning = Methods.readTuning(list[i].uuid, true);
                const res    = await OpenAiRepository.getFineTuningJob(
                    tuning.fine_tuning_job_id
                );

                list[i].status = res.status;

                TuningIndex.update(list[i].uuid, {
                    status: res.status
                });

                Methods.updateTuning(list[i].uuid, {
                    fine_tuning_job_status: res.status
                });
            }
        }

        return list;
    },

    /**
     *
     * @returns
     */
    createTuning: () => {
        const uuid     = uuidv4();
        const fullPath = GetTuningBasePath(uuid);

        Fs.writeFileSync(fullPath, JSON.stringify({
            queue: []
        }));

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
    readTuning: (uuid, raw = false) => {
        const tuning = JSON.parse(
            Fs.readFileSync(GetTuningBasePath(uuid)).toString()
        );

        if (raw === false) {
            // Enrich tuning job with more information
            tuning.queue = UuidListToQuestions(tuning.queue, uuid);

            // Determining if batch can be offloaded
            tuning.canOffload = !tuning.fine_tuning_job_id;

            // If we already have the fine tuning job, then it is pointless to modify
            // the batch
            tuning.isReadOnly = tuning.fine_tuning_job_id ? true : false;
        }

        return tuning;
    },

    /**
     *
     * @param {*} uuid
     * @returns
     */
    readTuningEvents: async (uuid) => {
        const tuning = Methods.readTuning(uuid, true);

        // If fine-tuning job was scheduled and completed, then make sure we have
        // all the events included
        if (['succeeded', 'failed', 'cancelled'].includes(tuning.fine_tuning_job_status)
            && !_.isArray(tuning.fine_tuning_events)
        ) {
            const res = await OpenAiRepository.getFineTuningJobEvents(
                tuning.fine_tuning_job_id
            );

            tuning.fine_tuning_events = _.get(res, 'data', []);

            Methods.updateTuning(uuid, {
                fine_tuning_events: tuning.fine_tuning_events
            });
        }

        return tuning.fine_tuning_events ? tuning.fine_tuning_events.map((e) => ({
            id: e.id,
            message: e.message,
            created_at: e.created_at
        })).reverse() : [];
    },

    /**
     *
     * @param {String}  uuid
     * @param {Boolean} deleteCurriculum
     *
     * @returns
     */
    deleteTuning: async (uuid, deleteCurriculum = false) => {
        // Delete all indexed questions first
        const tuning = JSON.parse(
            Fs.readFileSync(GetTuningBasePath(uuid)).toString()
        );

        // Unlink all curriculum and delete those that we created directly from
        // the batch
        for (let i = 0; i < tuning.queue.length; i++) {
            const question = Questions.readQuestion(tuning.queue[i]);

            if (question.origin === `/tuning/${uuid}`) {
                if (deleteCurriculum) {
                    await Questions.deleteQuestion(tuning.queue[i]);
                }
            } else { // Unlink the question from the batch
                Questions.updateQuestion(tuning.queue[i], {
                    ft_batch_uuid: undefined,
                    // Default back to lower tuning method. Keep in mind that the "deep"
                    // tuning, first indexes the curriculum in vector store (shallow) and
                    // queue curriculum for LLM fine-tuning
                    ft_method: 'shallow'
                });
            }
        }

        // Remove index first
        const result = TuningIndex.remove(uuid);

        // Remove a physical file. Should I?
        const filepath = GetTuningBasePath(uuid);

        if (Fs.existsSync(filepath)) {
            Fs.unlinkSync(filepath);
        }

        return result;
    },

    /**
     *
     * @param {*} uuid
     * @param {*} data
     * @returns
     */
    updateTuning: (uuid, data) => {
        // Read old content and merge it with incoming content
        const filepath   = GetTuningBasePath(uuid);
        const content    = JSON.parse(Fs.readFileSync(filepath).toString());
        const newContent = Object.assign({}, content, data);

        // Update tuning attributes
        const response = TuningIndex.update(uuid, {
            updatedAt: (new Date()).getTime(),
            queued: newContent.queue.length
        });

        // Update the actual file
        Fs.writeFileSync(GetTuningBasePath(uuid), JSON.stringify(newContent));

        return response;
    },

    /**
     *
     * @param {*} uuid
     * @param {*} filepath
     * @param {*} skipFirstColumn
     */
    bulkCurriculumUploadToTuning: async (uuid, filepath, skipFirstColumn = true) => {
        const tuning = Methods.readTuning(uuid, true);
        const list   = await ReadImportFile(filepath, skipFirstColumn);

        const res1 = await OpenAiRepository.prepareQuestionListEmbedding(
            _.uniq(list.map(r => r[0])) // Take only unique list of subjects
        );

        // Prepare the complete list for storing
        const map = {};

        // Why are we doing this? To eliminate rows that a duplicates
        _.forEach(res1.output, (e) => {
            if (_.isUndefined(map[e.text])) {
                map[e.text] = Object.assign({}, e, {
                    answer: _.first(list.filter(r => r[0] === e.text))[1],
                    origin: `/tuning/${uuid}`
                });
            }
        });

        const final = Object.values(map);

        // Finally, store all the questions
        for(let i = 0; i < final.length; i++) {
            const q = await Questions.createQuestion(final[i]);

            tuning.queue.push(q.uuid);
        }

        Methods.updateTuning(uuid, {
            queue: tuning.queue
        });
    },

    /**
     *
     * @param {*} uuid
     * @param {*} curriculum
     * @returns
     */
    addCurriculumToTuning: async (uuid, curriculum) => {
        const tuning    = Methods.readTuning(uuid, true);
        const embedding = await OpenAiRepository.prepareTextEmbedding(
            curriculum.text
        );

        // Creating new question
        const q = await Questions.createQuestion({
            text: curriculum.text,
            answer: curriculum.answer,
            origin: `/tuning/${uuid}`,
            embedding
        });

        tuning.queue.push(q.uuid);

        Methods.updateTuning(uuid, {
            queue: tuning.queue
        });

        return Object.assign({}, q, { answer: curriculum.answer });
    },

    /**
     *
     * @param {*} uuid
     * @param {*} curriculum
     * @param {*} del
     */
    deleteCurriculumFromTuning: async (uuid, curriculum, del = false) => {
        const tuning = Methods.readTuning(uuid, true);

        // Let's remove the curriculum from batch
        tuning.queue = _.filter(tuning.queue, (c) => c !== curriculum);

        Methods.updateTuning(uuid, {
            queue: tuning.queue
        });

        // If we also need to delete the actual question, then to it as well
        if (del === true) {
            await Questions.deleteQuestion(curriculum);
        }
    },

    /**
     *
     * @param {*} uuid
     */
    queue: async (uuid) => {
        const batches   = await Methods.getTuningList(0, 1);
        const maxSize   = Settings.getAppSetting('fineTuningBatchSize', 500);
        let latestBatch = _.first(batches);

        if (!_.isObject(latestBatch) || latestBatch.queued >= maxSize) {
            latestBatch = Methods.createTuning();
        }

        // Add the task to the queue
        const tuning = Methods.readTuning(latestBatch.uuid, true);

        tuning.queue.push(uuid);

        Methods.updateTuning(latestBatch.uuid, {
            queue: tuning.queue
        });

        return latestBatch.uuid;
    },

    /**
     *
     * @param {*} uuid
     * @returns
     */
    offloadBatch: async (uuid) => {
        const result = await Offload(Methods.readTuning(uuid, true));

        // Set the current status in the index
        TuningIndex.update(uuid, {
            updatedAt: (new Date()).getTime(),
            status: result.status
        })

        if (_.get(result, 'status') !== 'failed') {
            Methods.updateTuning(uuid, result);
        } else {
            console.log(JSON.stringify(result));
        }
    }

}

module.exports = Methods;