<template>
    <v-container class="fill-height">
        <v-app-bar color="deep-purple-lighten-1">
            <template v-slot:prepend>
                <v-icon icon="mdi-tune-variant"></v-icon>
            </template>

            <v-app-bar-title>
                <v-breadcrumbs :items="breadcrumb" density="compact" class="pl-0">
                    <template v-slot:title="{ item }">
                        <span class="clickable" @click="navigateTo(item.node)">{{ item.title }}</span>
                    </template>
                </v-breadcrumbs>
            </v-app-bar-title>

            <v-spacer></v-spacer>

            <v-tooltip v-if="!currentTuning" text="Add New Batch" location="bottom">
                <template v-slot:activator="{ props }">
                    <v-btn icon v-bind="props" @click="createNewBatch">
                        <v-icon>mdi-plus-box</v-icon>
                    </v-btn>
                </template>
            </v-tooltip>

            <v-tooltip v-if="currentTuning && currentTuningData.canOffload" text="Offload Batch" location="bottom">
                <template v-slot:activator="{ props }">
                    <v-btn icon v-bind="props" @click="showOffloadModal = true">
                        <v-icon>mdi-progress-upload</v-icon>
                    </v-btn>
                </template>
            </v-tooltip>

            <v-tooltip v-if="currentTuning" text="Save Tuning" location="bottom">
                <template v-slot:activator="{ props }">
                    <v-btn icon v-bind="props" @click="saveCurrentTuning">
                        <v-icon>mdi-content-save</v-icon>
                    </v-btn>
                </template>
            </v-tooltip>

            <v-tooltip v-if="currentTuning" text="Delete Tuning" location="bottom">
                <template v-slot:activator="{ props }">
                    <v-btn icon v-bind="props" @click="showDeleteTuningModal = true">
                        <v-icon>mdi-trash-can</v-icon>
                    </v-btn>
                </template>
            </v-tooltip>
        </v-app-bar>

        <v-responsive class="align-left fill-height">
            <v-container v-if="!currentTuning">
                <v-card>
                    <v-virtual-scroll v-if="tuningList.length" :items="tuningList" item-height="96">
                        <template v-slot:default="{ item }">
                            <v-list-item @click="openTuning(item)" lines="two">
                                <template v-slot:prepend>
                                    <v-icon size="large" :icon="getTuningStatusIcon(item)"></v-icon>
                                </template>
                                <v-list-item-title>{{ item.uuid }}</v-list-item-title>
                                <v-list-item-subtitle>Queued Questions: {{ item.queued }}</v-list-item-subtitle>
                            </v-list-item>
                        </template>
                    </v-virtual-scroll>

                    <v-sheet v-else class="d-flex align-center justify-center flex-wrap text-center mx-auto px-4"
                        elevation="1" height="200" rounded width="100%" color="grey-lighten-3">
                        <div>
                            <p class="text-body-2">
                                There are no queued fine-tuning jobs at the moment.
                            </p>
                        </div>
                    </v-sheet>
                </v-card>
            </v-container>

            <v-container v-else>
                <div class="text-overline">Batch ID (read-only)</div>
                <v-text-field :value="currentTuning.uuid" readonly variant="outlined"></v-text-field>

                <v-expansion-panels>
                    <v-expansion-panel title="Fine-Tuning Batch Attributes">
                        <v-expansion-panel-text>
                            <div class="text-overline">Base LLM Model</div>
                            <v-select
                                v-model="currentTuningData.base_model"
                                :readonly="currentTuningData.isReadOnly"
                                return-object
                                variant="outlined"
                                :items="supportedFineTuningModels"
                            ></v-select>

                            <div class="text-overline">Number of Training Cycles (n_epochs)</div>
                            <v-text-field
                                v-model="currentTuningData.n_epochs"
                                :readonly="currentTuningData.isReadOnly"
                                variant="outlined"
                                hint="The number of epochs to train the model for. An epoch refers to one full cycle through the training dataset. Default is auto."
                            ></v-text-field>

                            <div v-if="currentTuningData.base_model && currentTuningData.base_model.indexOf('ft:') !==0">
                                <div class="text-overline">Custom Model Suffix</div>
                                <v-text-field
                                    v-model="currentTuningData.llm_suffix"
                                    :readonly="currentTuningData.isReadOnly"
                                    variant="outlined"
                                    hint="A string of up to 18 characters that will be added to your fine-tuned model name. Default is lowercased persona's name."
                                ></v-text-field>
                            </div>
                        </v-expansion-panel-text>
                    </v-expansion-panel>
                </v-expansion-panels>

                <v-toolbar density="compact" class="mt-10">
                    <v-toolbar-title class="text-overline font-weight-medium">Curriculum</v-toolbar-title>
                    <v-spacer></v-spacer>

                    <v-tooltip v-if="currentTuning && !currentTuningData.isReadOnly" text="Import Curriculum" location="bottom">
                        <template v-slot:activator="{ props }">
                            <v-btn icon v-bind="props" @click="showImportCurriculumModal = true">
                                <v-icon>mdi-import</v-icon>
                            </v-btn>
                        </template>
                    </v-tooltip>

                    <v-tooltip v-if="currentTuning && !currentTuningData.isReadOnly" text="Add New Curriculum" location="bottom">
                        <template v-slot:activator="{ props }">
                            <v-btn icon v-bind="props" @click="showAddCurriculumModal = true">
                                <v-icon>mdi-plus-box</v-icon>
                            </v-btn>
                        </template>
                    </v-tooltip>
                </v-toolbar>

                <v-list lines="false" v-if="currentTuningData.queue.length > 0">
                    <v-list-item
                        v-for="(curriculum, index) in currentTuningData.queue"
                        :key="index"
                        :title="curriculum.text"
                        @click="selectCurriculumForEditing(curriculum)"
                    >
                        <template v-slot:prepend>
                            <v-badge :content="index + 1" inline></v-badge>
                        </template>
                        <template v-slot:append>
                            <v-tooltip v-if="!currentTuningData.isReadOnly" text="Remove Curriculum" location="bottom">
                                <template v-slot:activator="{ props }">
                                <v-btn icon variant="plain" v-bind="props" @click.stop="selectCurriculumForDeletion(curriculum)">
                                    <v-icon>mdi-minus-circle</v-icon>
                                </v-btn>
                                </template>
                            </v-tooltip>
                        </template>
                    </v-list-item>
                </v-list>
                <v-sheet v-else class="d-flex align-center justify-center flex-wrap text-center rounded-0 mx-auto px-4" elevation="0"
                    height="200" rounded width="100%" color="grey-lighten-3">
                        <div>
                            <p class="text-body-2 mb-4">
                                There is no curriculum queued for this batch.
                            </p>
                            <v-btn @click="showAddCurriculumModal = true">Create First Curriculum</v-btn>
                        </div>
                </v-sheet>

                <v-table
                    fixed-header
                    v-if="currentTuningData.fine_tuning_events && currentTuningData.fine_tuning_events.length > 0"
                    class="mt-6"
                    height="300px"
                >
                    <thead>
                        <tr>
                            <th class="text-left table-bg">
                                Event
                            </th>
                            <th class="text-left table-bg">
                                Created At
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr
                            v-for="event in currentTuningData.fine_tuning_events"
                            :key="event.id"
                        >
                            <td>{{ event.message }}</td>
                            <td>
                                {{ (new Date(event.created_at)).toLocaleDateString(
                                'en-us',
                                {
                                    weekday:"long",
                                    year:"numeric",
                                    month:"short",
                                    day:"numeric",
                                    hour: "numeric",
                                    minute: "numeric",
                                    second: "numeric"
                                }) }}
                            </td>
                        </tr>
                    </tbody>
                </v-table>

                <v-snackbar v-model="showSuccessMessage" :timeout="2000">
                    {{ successMessage }}

                    <template v-slot:actions>
                        <v-btn variant="text" @click="showSuccessMessage = false">
                            Close
                        </v-btn>
                    </template>
                </v-snackbar>
            </v-container>

            <v-dialog v-if="currentTuning && !currentTuningData.isReadOnly" v-model="showImportCurriculumModal" transition="dialog-bottom-transition" width="550">
                <v-card>
                    <v-toolbar color="grey-darken-4" title="Import Curriculum"></v-toolbar>
                    <v-card-text>
                        <v-alert type="info" prominent variant="outlined" color="deep-purple-darken-4">
                            Imported curriculum will be automatically indexed as factual learning and added to the queue for new skill tuning.
                        </v-alert>

                        <v-file-input
                            v-model="selectedCsvFile"
                            label="Select CSV file"
                            class="mt-6"
                            variant="outlined"
                            accept=".csv"
                            :rules="[inputValidationRules.required]"
                            persistent-hint
                            hint="Select .csv file that has two columns: subject and answer"
                        ></v-file-input>

                        <v-checkbox hide-details v-model="skipFirstColumn" label="Ignore the first column in the CSV because it is a header" />
                    </v-card-text>
                    <v-card-actions class="justify-end">
                        <v-btn variant="text" :disabled="uploadingCurriculum" @click="uploadBulkCurriculum">{{ uploadingCurriculum ? 'Uploading...' : 'Upload' }}</v-btn>
                        <v-btn variant="text" @click="showImportCurriculumModal = false">Close</v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>

            <v-dialog v-if="currentTuning && !currentTuningData.isReadOnly" v-model="showAddCurriculumModal" transition="dialog-bottom-transition" width="800">
                <v-card>
                    <v-toolbar color="grey-darken-4" title="Add New Curriculum"></v-toolbar>
                    <v-card-text>
                        <v-text-field
                            label="Subject"
                            v-model="stagedCurriculum.text"
                            variant="outlined"
                            :rules="[inputValidationRules.required]"
                        ></v-text-field>

                        <v-textarea
                            class="mt-4"
                            label="Answer"
                            v-model="stagedCurriculum.answer"
                            auto-grow
                            variant="outlined"
                            :rules="[inputValidationRules.required]"
                        ></v-textarea>
                    </v-card-text>
                    <v-card-actions class="justify-end">
                        <v-btn
                            v-if="stagedCurriculum.answer && stagedCurriculum.text"
                            variant="text"
                            :disabled="addingCurriculum"
                            @click="addNewCurriculum"
                        >{{ addingCurriculum ? 'Adding...' : 'Add' }}</v-btn>
                        <v-btn variant="text" @click="showAddCurriculumModal = false">Close</v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>

            <v-dialog v-if="currentTuning" v-model="showEditCurriculumModal" transition="dialog-bottom-transition" width="800">
                <v-card>
                    <v-toolbar color="grey-darken-4" title="Edit Curriculum"></v-toolbar>
                    <v-card-text>
                        <v-text-field
                            label="Subject (read-only)"
                            v-model="stagedCurriculum.text"
                            readonly
                            variant="outlined"
                            :rules="[inputValidationRules.required]"
                        ></v-text-field>

                        <v-textarea
                            class="mt-4"
                            label="Answer"
                            :readonly="currentTuningData.isReadOnly"
                            v-model="stagedCurriculum.answer"
                            auto-grow
                            variant="outlined"
                            :rules="[inputValidationRules.required]"
                        ></v-textarea>
                    </v-card-text>
                    <v-card-actions class="justify-end">
                        <v-btn
                            v-if="stagedCurriculum.answer && !currentTuningData.isReadOnly"
                            variant="text"
                            :disabled="updatingCurriculum"
                            @click="updateSelectedCurriculum"
                        >{{ updatingCurriculum ? 'Updating...' : 'Update' }}</v-btn>
                        <v-btn variant="text" @click="showEditCurriculumModal = false">Close</v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>

            <v-dialog v-if="currentTuning" v-model="showDeleteTuningModal" transition="dialog-bottom-transition" width="600">
                <v-card>
                    <v-toolbar color="red-darken-4" title="Delete Batch"></v-toolbar>

                    <v-card-text>
                        <v-alert type="warning" prominent variant="outlined" color="red-darken-4">
                            You are about to delete the <strong v-if="currentTuning">"{{ currentTuning.uuid }}"</strong> batch with <strong>{{ currentTuning.queued }}</strong> queued curriculum{{ currentTuning.queued === 1 ? '' : 's' }}.
                            Please confirm.
                        </v-alert>

                        <v-checkbox v-if="currentTuning.queued > 0" v-model="deleteCurriculum" label="Also delete directly created or imported curriculum" />
                    </v-card-text>
                    <v-card-actions class="justify-end">
                        <v-btn variant="text" color="red-darken-4" @click="deleteCurrentTuning">Delete</v-btn>
                        <v-btn variant="text" @click="showDeleteTuningModal = false">Close</v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>

            <v-dialog v-if="currentTuning && !currentTuningData.isReadOnly" v-model="showDeleteCurriculumModal" transition="dialog-bottom-transition" width="600">
                <v-card>
                    <v-toolbar color="red-darken-4" title="Remove Curriculum From Batch"></v-toolbar>

                    <v-card-text>
                        <v-alert type="warning" prominent variant="outlined" color="red-darken-4">
                            You are about to remove the <strong v-if="selectedCurriculum">"{{ selectedCurriculum.text }}"</strong> curriculum from the batch.
                            Please confirm.
                        </v-alert>

                        <v-checkbox v-if="selectedCurriculum.allowToDelete" v-model="deleteQuestionFromSystem" label="Also delete the curriculum from the knowledge-base" />
                    </v-card-text>
                    <v-card-actions class="justify-end">
                        <v-btn
                            variant="text"
                            color="red-darken-4"
                            :disabled="deletingCurriculum"
                            @click="deleteSelectedCurriculum"
                        >{{ deletingCurriculum ? 'Removing...' : 'Remove' }}</v-btn>
                        <v-btn variant="text" @click="showDeleteCurriculumModal = false">Close</v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>

            <v-dialog v-if="currentTuning" v-model="showOffloadModal" transition="dialog-bottom-transition" width="600">
                <v-card>
                    <v-toolbar color="grey-darken-4" title="Offload Batch"></v-toolbar>

                    <v-card-text>
                        <v-alert type="warning" prominent variant="outlined" color="deep-purple-darken-4">
                            You are about to offload the <strong v-if="currentTuning">"{{ currentTuning.uuid }}"</strong> batch with <strong>{{ currentTuning.queued }}</strong> queued curriculum{{ currentTuning.queued === 1 ? '' : 's' }}.
                            Please confirm.
                        </v-alert>
                    </v-card-text>
                    <v-card-actions class="justify-end">
                        <v-btn variant="text" :disabled="offloading" @click="offloadBatch">{{ offloading ? 'Offloading...' : 'Offload' }}</v-btn>
                        <v-btn variant="text" @click="showOffloadModal = false">Close</v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>
        </v-responsive>
    </v-container>
</template>

<script>
export default {
    data: () => {
        return {
            search: null,
            showSearchInput: false,
            breadcrumb: [],
            tuningList: [],
            currentTuning: null,
            currentTuningData: {},
            stagedCurriculum: {
                subject: null,
                answer: null
            },
            selectedCsvFile: null,
            selectedCurriculum: {},
            updatingTuning: false,
            addingCurriculum: false,
            updatingCurriculum: false,
            deletingCurriculum: false,
            uploadingCurriculum: false,
            showSuccessMessage: false,
            showImportCurriculumModal: false,
            showAddCurriculumModal: false,
            showDeleteTuningModal: false,
            showDeleteCurriculumModal: false,
            showEditCurriculumModal: false,
            showOffloadModal: false,
            deleteQuestionFromSystem: false,
            successMessage: null,
            deleteCurriculum: false,
            supportedFineTuningModels: [],
            skipFirstColumn: true,
            inputValidationRules: {
                required: value => !!value || 'Required.'
            }
        }
    },
    methods: {
        getTuningStatusIcon(tuning) {
            let response = 'mdi-clock-start';

            if (tuning.status === 'queued') {
                response = 'mdi-progress-upload';
            } else if (tuning.status === 'running') {
                response = 'mdi-progress-star-four-points';
            } else if (tuning.status === 'succeeded') {
                response = 'mdi-check-circle';
            } else if (tuning.status === 'failed') {
                response = 'mdi-alert-circle';
            } else if (tuning.status === 'canceled') {
                response = 'mdi-close-circle';
            }

            return response;
        },
        navigateTo(node) {
            this.currentTuning = node;
        },
        renderSuccessManager(message) {
            this.successMessage     = message;
            this.showSuccessMessage = true;
        },
        createNewBatch() {
            const _this = this;

            this.$api.tuning.createTuning().then((tuning) => {
                _this.tuningList.unshift(tuning);
                _this.openTuning(tuning);
            });
        },
        openTuning(tuning) {
            const _this = this;

            this.$api.tuning.readTuning(tuning.uuid).then((response) => {
                _this.currentTuning     = tuning;
                _this.currentTuningData = response;

                this.$api.tuning.readTuningEvents(tuning.uuid).then((response) => {
                    _this.currentTuningData.fine_tuning_events = response;
                })
            });
        },
        addNewCurriculum() {
            const _this           = this;
            this.addingCurriculum = true;

            this.$api.tuning.addCurriculumToTuning(this.currentTuning.uuid, {
                text: this.stagedCurriculum.text,
                answer: this.stagedCurriculum.answer
            }).then((response) => {
                _this.currentTuningData.queue.push(response);
                _this.renderSuccessManager('Curriculum added!');

                _this.stagedCurriculum       = {};
                _this.showAddCurriculumModal = false;
            }).finally(() => {
                _this.addingCurriculum = false;
            });
        },
        saveCurrentTuning() {
            const _this         = this;
            this.updatingTuning = true;

            this.$api.tuning.updateTuning(this.currentTuning.uuid, {
                base_model: this.currentTuningData.base_model,
                n_epochs: this.currentTuningData.n_epochs,
                llm_suffix: this.currentTuningData.llm_suffix
            }).then(() => {
                _this.renderSuccessManager('Changes saved!');
            }).finally(() => {
                _this.updatingTuning = false;
            });
        },
        deleteCurrentTuning() {
            const _this = this;

            this.$api.tuning.deleteTuning(this.currentTuning.uuid, this.deleteCurriculum).then(() => {
                _this.showDeleteTuningModal = false;

                _this.tuningList = _this.tuningList.filter(
                    t => t !== _this.currentTuning
                );
                // Reset
                _this.currentTuningData = {};
                _this.currentTuning     = null;
            });
        },
        uploadBulkCurriculum() {
            const _this              = this;
            this.uploadingCurriculum = true;

            this.$api.tuning.bulkCurriculumUploadToTuning(
                this.currentTuning.uuid,
                this.selectedCsvFile[0].path,
                this.skipFirstColumn
            ).then(() => {
                _this.openTuning(_this.currentTuning); // re-open it

                // Reset & ack
                _this.showImportCurriculumModal = false;
                _this.selectedCsvFile           = null;
                _this.renderSuccessManager('Curriculum imported successfully!');
            }).finally(() => {
                _this.uploadingCurriculum = false;
            })
        },
        assembleBreadcrumb() {
            const breadcrumb = [{
                title: 'Fine-Tuning',
                node: null
            }];

            if (this.currentTuning !== null) {
                breadcrumb.push({
                    title: this.currentTuning.uuid
                })
            }

            this.breadcrumb = breadcrumb;
        },
        selectCurriculumForDeletion(curriculum) {
            this.selectedCurriculum        = curriculum;
            this.showDeleteCurriculumModal = true;
        },
        selectCurriculumForEditing(curriculum) {
            this.selectedCurriculum      = curriculum;
            this.stagedCurriculum        = curriculum;
            this.showEditCurriculumModal = true;
        },
        updateSelectedCurriculum() {
            const _this             = this;
            this.updatingCurriculum = true;

            this.$api.questions.updateQuestion(this.selectedCurriculum.uuid, {
                answer: this.stagedCurriculum.answer
            }).then(() => {
                _this.selectedCurriculum = {};
                _this.renderSuccessManager('Curriculum updated!');
            }).finally(() => {
                _this.updatingCurriculum      = false;
                _this.showEditCurriculumModal = false;
            });
        },
        deleteSelectedCurriculum() {
            const _this             = this;
            this.deletingCurriculum = true;

            this.$api.tuning.deleteCurriculumFromTuning(
                this.currentTuning.uuid,
                this.selectedCurriculum.uuid,
                this.selectedCurriculum.allowToDelete && this.deleteQuestionFromSystem
            ).then(() => {
                _this.currentTuningData.queue = _this.currentTuningData.queue.filter(
                    c => c !== _this.selectedCurriculum
                );

                this.currentTuning.queued = this.currentTuning.queued - 1;

                _this.renderSuccessManager('Curriculum removed!');

                _this.selectedCurriculum        = {};
                _this.showDeleteCurriculumModal = false;
            }).finally(() => {
                _this.deletingCurriculum = false;
            });
        },
        offloadBatch() {
            const _this     = this;
            this.offloading = true;

            this.$api.tuning.offloadBatch(this.currentTuning.uuid).then(() => {
                _this.renderSuccessManager('The curriculum offloaded!');
                _this.openTuning(_this.currentTuning); // Re-open
            }).finally(() => {
                _this.offloading      = false;
                this.showOffloadModal = false;
            });
        }
    },
    watch: {
        currentTuning() {
            this.assembleBreadcrumb();
        },
    },
    mounted() {
        const _this = this;

        this.$api.tuning.getTuningList().then((response) => {
            _this.tuningList = response;
        });

        // Now, get the list of models for fine-tuning
        this.$api.ai.getFineTuningModelList().then((response) => {
            _this.supportedFineTuningModels = response;
        });

        this.assembleBreadcrumb();
    }
}
</script>

<style scoped>
.clickable {
    cursor: pointer;
}
.v-breadcrumbs {
  font-size: 0.9rem;
}

.table-bg {
    background-color: rgb(var(--v-theme-on-surface-variant)) !important;
}
</style>