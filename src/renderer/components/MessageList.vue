<template>
    <div class="fill-height">
        <v-app-bar color="deep-purple-lighten-1">
            <template v-slot:prepend>
                <v-icon icon="mdi-message-processing-outline"></v-icon>
            </template>

            <v-app-bar-title>
                <v-breadcrumbs :items="breadcrumb" density="compact" class="pl-0">
                    <template v-slot:title="{ item }">
                        <span class="clickable" @click="navigateTo(item.node)">{{ item.title }}</span>
                    </template>
                </v-breadcrumbs>
            </v-app-bar-title>

            <v-spacer></v-spacer>

            <v-tooltip v-if="!currentMessage" text="Add New Message" location="bottom">
                <template v-slot:activator="{ props }">
                    <v-btn icon v-bind="props" @click="createMessageModal = true">
                        <v-icon>mdi-message-plus-outline</v-icon>
                    </v-btn>
                </template>
            </v-tooltip>
            <v-tooltip v-if="currentMessage && currentMessage.status === 'new'" text="Mark as Done" location="bottom">
                <template v-slot:activator="{ props }">
                    <v-btn icon v-bind="props" @click="markAsDone">
                        <v-icon>mdi-check-circle</v-icon>
                    </v-btn>
                </template>
            </v-tooltip>
            <v-tooltip v-else-if="currentMessage && currentMessage.status === 'done'" text="Mark as UnDone" location="bottom">
                <template v-slot:activator="{ props }">
                    <v-btn icon v-bind="props" @click="markAsUnDone">
                        <v-icon>mdi-bell-circle</v-icon>
                    </v-btn>
                </template>
            </v-tooltip>
            <v-tooltip v-if="currentMessage && currentMessageData.answer" text="Re-Generate Answer" location="bottom">
                <template v-slot:activator="{ props }">
                <v-btn icon v-bind="props" @click="reGenerateAnswerModal = true">
                    <v-icon>mdi-refresh</v-icon>
                </v-btn>
                </template>
            </v-tooltip>
            <v-tooltip v-if="currentMessage" text="Save Message" location="bottom">
                <template v-slot:activator="{ props }">
                <v-btn icon v-bind="props" @click="saveMessageChanges">
                    <v-icon>mdi-content-save</v-icon>
                </v-btn>
                </template>
            </v-tooltip>
            <v-tooltip v-if="currentMessage" text="Delete Message" location="bottom">
                <template v-slot:activator="{ props }">
                <v-btn icon v-bind="props" @click="deleteCurrentMessage">
                    <v-icon>mdi-trash-can</v-icon>
                </v-btn>
                </template>
            </v-tooltip>
        </v-app-bar>

        <v-responsive class="align-left fill-height">
            <v-row no-gutters class="flex-nowrap">
                <v-col cols="3" class="flex-grow-0 flex-shrink-0" style="border-right: 1px solid #CCCCCC; max-height: calc(100vh - 64px); overflow-y: scroll;">
                    <v-toolbar class="pl-2" color="grey-lighten-5" style="border-bottom: 1px solid #CCCCCC">
                        <v-text-field
                            density="compact"
                            ref="search"
                            variant="outlined"
                            label="Search..."
                            append-inner-icon="mdi-magnify"
                            @blur="handleSearchBlur"
                            v-model="search"
                            class="mt-6"
                        ></v-text-field>
                        <v-menu class="ml-4" location="right">
                            <template v-slot:activator="{ props }">
                                <v-icon color="grey-darken-3" v-bind="props">mdi-dots-vertical</v-icon>
                            </template>
                            <v-list>
                                <v-list-item>
                                    <v-list-item-title>All</v-list-item-title>
                                </v-list-item>
                                <v-list-item>
                                    <v-list-item-title>Open</v-list-item-title>
                                </v-list-item>
                                <v-list-item>
                                    <v-list-item-title>Closed</v-list-item-title>
                                </v-list-item>
                            </v-list>
                        </v-menu>
                    </v-toolbar>
                    <v-virtual-scroll v-if="messages.length" :items="messages" item-height="96">
                        <template v-slot:default="{ item }">
                            <v-list-item @click="openMessage(item)" lines="two" :title="getMessageDate(item)" :active="currentMessage === item" color="deep-purple-darken-1">
                                <template v-slot:prepend>
                                    <v-icon size="large" :icon="getMessageStatusIcon(item)"></v-icon>
                                </template>
                                <v-list-item-subtitle>{{ item.excerpt }}</v-list-item-subtitle>
                            </v-list-item>
                        </template>
                    </v-virtual-scroll>
                </v-col>
                <v-col cols="9" class="flex-grow-1 flex-shrink-0 pl-6 pr-4 py-4" style="max-height: calc(100vh - 64px); overflow-y: scroll;">
                    <div v-if="currentMessage">
                        <v-tabs
                            v-model="currentTab"
                            color="grey-darken-1"
                            align-tabs="start"
                        >
                            <v-tab value="original">Message</v-tab>
                            <v-tab value="answer" v-if="currentMessageData.answer">Answer</v-tab>
                        </v-tabs>

                        <v-window v-model="currentTab">
                            <v-window-item value="original" class="pt-4">
                                <v-textarea auto-grow variant="outlined" bg-color="white" v-model="currentMessageData.text"></v-textarea>
                            </v-window-item>
                            <v-window-item value="answer" class="pt-4">
                                    <v-textarea auto-grow readonly variant="outlined" v-model="currentMessageData.answer"></v-textarea>
                            </v-window-item>
                        </v-window>

                        <div v-if="hasAssociatedQuestions">
                            <div class="text-overline pb-2">Associated Questions</div>

                            <v-expansion-panels>
                                <v-expansion-panel v-for="(question, index) in currentMessageData.questions" :key="index">
                                    <v-expansion-panel-title>
                                        <v-icon
                                            color="grey"
                                            :icon="getQuestionVisualIndicator(question)"
                                        ></v-icon>
                                        <span class="ml-2">{{ question.text }}</span>
                                    </v-expansion-panel-title>

                                    <v-expansion-panel-text>
                                        <div v-for="(candidate, i) in prepareQuestionCandidateList(question)" :key="i" class="mt-4">
                                            - <em>{{ candidate.name }}</em> <small>({{ candidate.similarity === 0 ? 'exact match' : `similarity: ${candidate.similarity}` }})</small>
                                        </div>

                                        <v-textarea
                                            label="Direct Answer"
                                            variant="outlined"
                                            auto-grow
                                            :rules="[inputValidationRules.required]"
                                            class="mt-6"
                                            v-model="question.answer"
                                        ></v-textarea>

                                        <div class="d-flex justify-end">
                                            <v-btn
                                                variant="text"
                                                color="red-darken-4"
                                                @click="selectQuestionForDeletion(question)"
                                            >
                                                Delete
                                            </v-btn>
                                            <v-btn
                                                v-if="question.answer"
                                                variant="text"
                                                @click="selectQuestionForFineTuning(question)"
                                            >
                                                Fine-Tune
                                            </v-btn>
                                            <v-btn
                                                variant="text"
                                                :disabled="isUpdatingQuestion(question)"
                                                @click="updateQuestion(question)"
                                            >
                                                {{ isUpdatingQuestion(question) ? 'Updating...' : 'Update' }}
                                            </v-btn>
                                        </div>
                                    </v-expansion-panel-text>
                                </v-expansion-panel>
                            </v-expansion-panels>
                        </div>

                        <v-sheet v-else class="d-flex align-center justify-center flex-wrap text-center mx-auto px-4" elevation="1"
                            height="150" rounded width="100%" color="grey-lighten-3">
                            <div v-if="!analyzingMessage">
                                <p class="text-body-2 mb-4">
                                    The next step is to analyze the message and identify the list of questions.
                                </p>
                                <v-btn @click="analyzeMessage">Analyze Message</v-btn>
                            </div>
                            <div v-else>
                                <p class="text-body-2 mb-4">
                                    Please wait a bit. Depending on the size of the message, it might take a couple of minutes to
                                    run
                                </p>
                                <v-progress-circular indeterminate color="grey"></v-progress-circular>
                            </div>
                        </v-sheet>

                        <v-sheet v-if="hasAnyAnswer && !currentMessageData.answer" class="d-flex align-center justify-center flex-wrap text-center mt-10 px-4" elevation="1"
                            height="200" rounded width="100%" color="grey-lighten-3">
                            <div v-if="!generatingAnswer">
                                <p class="text-body-2 mb-4">
                                    There is at least one good answer identified. Would you like to generate an answer to the user's message?
                                </p>
                                <v-btn @click="generateAnswer">Generate an Answer</v-btn>
                            </div>
                            <div v-else>
                                <p class="text-body-2 mb-4">
                                    Please stand by. The answer is generating.
                                </p>
                                <v-progress-circular
                                    indeterminate
                                    color="grey"
                                ></v-progress-circular>
                            </div>
                        </v-sheet>
                    </div>
                </v-col>
            </v-row>
        </v-responsive>

        <v-dialog v-model="reGenerateAnswerModal" transition="dialog-bottom-transition" width="450">
            <v-card>
                <v-toolbar color="grey-darken-4" title="Re-Generate Answer"></v-toolbar>
                <v-card-text>
                    <v-alert type="warning" prominent variant="outlined">
                        You are about to generate a new answer to the user message. The previous answer will be lost. Please confirm.
                    </v-alert>
                </v-card-text>
                <v-card-actions class="justify-end">
                <v-btn variant="text" :disabled="generatingAnswer" @click="generateAnswer">{{ generatingAnswer ? 'Generating...' : 'Generate' }}</v-btn>
                <v-btn variant="text" @click="reGenerateAnswerModal = false">Close</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <v-snackbar v-model="showSuccessMessage" :timeout="2000">
            {{ successMessage }}

            <template v-slot:actions>
                <v-btn variant="text" @click="showSuccessMessage = false">
                    Close
                </v-btn>
            </template>
        </v-snackbar>

        <v-dialog v-model="createMessageModal" transition="dialog-bottom-transition" width="600">
            <v-card>
                <v-toolbar color="grey-darken-4" title="Create New Message"></v-toolbar>
                <v-card-text>
                    <v-textarea autofocus label="Message" v-model="newMessage" variant="outlined"></v-textarea>
                </v-card-text>
                <v-card-actions class="justify-end">
                    <v-btn variant="text" @click="createMessage">Create</v-btn>
                    <v-btn variant="text" @click="createMessageModal = false">Close</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <v-dialog v-model="deleteMessageModal" transition="dialog-bottom-transition" width="550">
            <v-card>
                <v-toolbar color="red-darken-4" title="Delete Message"></v-toolbar>
                <v-card-text>
                    <v-alert type="warning" prominent variant="outlined" color="red-darken-4">
                        You are about to delete the <strong v-if="selectedMessage">"{{ selectedMessage.excerpt }}"</strong> message. Please confirm.
                    </v-alert>
                </v-card-text>
                <v-card-actions class="justify-end">
                    <v-btn variant="text" color="red-darken-4" @click="deleteSelectedMessage">Delete</v-btn>
                    <v-btn variant="text" @click="deleteMessageModal = false">Close</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <v-dialog v-model="showFineTuningModal" transition="dialog-bottom-transition" width="700">
            <v-card>
                <v-toolbar color="grey-darken-4" title="Fine-Tune Curriculum"></v-toolbar>
                <v-card-text>
                    <v-container>
                        <v-alert type="info" prominent variant="outlined" color="deep-purple-darken-4">
                            You are about to fine-tune a direct answer to the <strong>"{{ selectedQuestion.text }}"</strong> question.
                            Please select the type of fine-tuning below.
                        </v-alert>
                    </v-container>

                    <v-radio-group
                        v-if="selectedQuestion.answer"
                        class="mt-4"
                        v-model="selectedQuestion.ft_method"
                        label="Fine-Tuning Method"
                    >
                        <v-radio label="Factual Learning (Only memorize the curriculum and include it in a prompt)" value="shallow"></v-radio>
                        <v-radio label="New Skill (Memorize curriculum and queue it for actual model fine-tuning)" value="deep"></v-radio>
                    </v-radio-group>
                </v-card-text>
                <v-card-actions class="justify-end">
                    <v-btn v-if="selectedQuestion.ft_method" variant="text" :disabled="isFineTuningQuestion" @click="fineTuneSelectedQuestion">{{ isFineTuningQuestion ? 'Fine-Tuning...' : 'Fine-Tune' }}</v-btn>
                    <v-btn variant="text" @click="showFineTuningModal = false">Close</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <v-dialog v-model="showDeleteQuestionModal" transition="dialog-bottom-transition" width="550">
            <v-card>
                <v-toolbar color="red-darken-4" title="Delete Question"></v-toolbar>
                <v-card-text>
                    <v-alert type="warning" prominent variant="outlined" color="red-darken-4">
                        You are about to delete the <strong>"{{ selectedQuestion.text }}"</strong> question.
                        Please confirm.
                    </v-alert>
                </v-card-text>
                <v-card-actions class="justify-end">
                    <v-btn variant="text" color="red-darken-4" @click="deleteSelectedQuestion">Delete</v-btn>
                    <v-btn variant="text" @click="showDeleteQuestionModal = false">Close</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </div>
</template>

<script setup>
    //
</script>

<script>
export default {
    data: () => {
        return {
            currentTab: 'original',
            breadcrumb: [],
            messages: [],
            createMessageModal: false,
            deleteMessageModal: false,
            selectedMessage: null,
            selectedQuestion: {},
            newMessage: null,
            currentMessage: null,
            currentMessageData: {},
            analyzingMessage: false,
            generatingAnswer: false,
            fineTuningQuestions: [],
            isFineTuningQuestion: false,
            updatingQuestions: [],
            successMessage: null,
            showSuccessMessage: false,
            showFineTuningModal: false,
            showDeleteQuestionModal: false,
            reGenerateAnswerModal: false,
            showSearchInput: false,
            search: null,
            inputValidationRules: {
                required: value => !!value || 'Required.',
            }
        }
    },
    computed: {
        hasAssociatedQuestions() {
            return this.currentMessageData
                && this.currentMessageData.questions
                && this.currentMessageData.questions.length > 0
        },
        hasAnyAnswer() {
            return this.currentMessageData
                && this.currentMessageData.questions
                && this.currentMessageData.questions.filter(
                    q => q.answer || q.candidates.length > 0
                ).length > 0
        }
    },
    methods: {
        navigateTo(node) {
            this.currentMessage = node;
        },
        markAsDone() {
            const _this = this;

            this.$api.messages
                .updateMessageStatus(this.currentMessage.uuid, 'done')
                .then((response) => {
                    for(let i = 0; i < _this.messages.length; i++) {
                        if (_this.messages[i].uuid === response.uuid) {
                            _this.messages[i]    = response;
                            _this.currentMessage = response;
                        }
                    }

                    _this.successMessage     = 'Changes saved!';
                    _this.showSuccessMessage = true;
                });
        },
        markAsUnDone() {
            const _this = this;

            this.$api.messages
                .updateMessageStatus(this.currentMessage.uuid, 'new')
                .then((response) => {
                    for(let i = 0; i < _this.messages.length; i++) {
                        if (_this.messages[i].uuid === response.uuid) {
                            _this.messages[i]    = response;
                            _this.currentMessage = response;
                        }
                    }

                    _this.successMessage     = 'Changes saved!';
                    _this.showSuccessMessage = true;
                });
        },
        analyzeMessage() {
            this.saveMessageChanges(true, function() {
                const _this           = this;
                this.analyzingMessage = true;

                this.$api.ai
                    .analyzeMessageContent(this.currentMessage.uuid)
                    .then((data) => {
                        _this.currentMessageData = data;
                        _this.analyzingMessage   = false;
                    });
            });
        },
        generateAnswer() {
            const _this           = this;
            this.generatingAnswer = true;

            this.$api.ai
                .generateMessageAnswer(this.currentMessage.uuid)
                .then((data) => {
                    _this.currentMessageData    = data;
                    _this.reGenerateAnswerModal = false;
                    _this.generatingAnswer      = false;
                    _this.currentTab            = 'answer';
                });
        },
        saveMessageChanges(silent = false, cb = null) {
            const _this = this;

            this.$api.messages
                .updateMessage(this.currentMessage.uuid, {
                    text: this.currentMessageData.text
                })
                .then(() => {
                    if (silent !== true) {
                        _this.successMessage     = 'Changes saved!';
                        _this.showSuccessMessage = true;
                    }

                    if (cb) {
                        cb.call(_this);
                    }
                });
        },
        createMessage() {
            const _this = this;

            this.$api.messages
                .createMessage(this.newMessage)
                .then((message) => {
                    _this.messages.unshift(message);

                    // Closing the dialog & resetting the form
                    _this.createMessageModal = false;
                    _this.newMessage         = null;

                    // Open the new message
                    _this.openMessage(message);
                });
        },
        openMessage(message) {
            const _this = this;

            this.$api.messages.readMessage(message.uuid).then((response) => {
                _this.currentMessage     = message;
                _this.currentTab         = 'original';
                _this.currentMessageData = response;
            });
        },
        prepareQuestionCandidateList(question) {
            // Removing candidate that is a direct answer to this question
            return question.candidates.filter(c => c.uuid !== question.uuid);
        },
        getMessageStatusIcon(message) {
            let icon = 'mdi-bell-circle';

            if (message.status === 'done') {
                icon = 'mdi-check-circle';
            }

            return icon;
        },
        getQuestionVisualIndicator(question) {
            let response = 'mdi-alert-circle';

            if (question.ft_method === 'shallow') {
                response = 'mdi-memory';
            } else if (question.ft_method === 'deep') {
                response = 'mdi-tune-variant';
            } else if (question.candidates.length > 0) {
                response = 'mdi-check';
            }

            return response;
        },
        getMessageDate(message) {
            return (new Date(message.createdAt)).toLocaleDateString(
                'en-us',
                { weekday: "short", year: "numeric", month: "short", day: "numeric" }
            );
        },
        assembleBreadcrumb() {
            const breadcrumb = [{
                title: 'Conversations',
                node: null
            }];

            if (this.currentMessage !== null) {
                breadcrumb.push({
                    title: this.currentMessage.excerpt.substring(0, 30) + '...'
                })
            }

            this.breadcrumb = breadcrumb;
        },
        deleteMessage(message) {
            this.selectedMessage    = message;
            this.deleteMessageModal = true;
        },
        deleteCurrentMessage() {
            this.selectedMessage    = this.currentMessage;
            this.deleteMessageModal = true;
        },
        deleteSelectedMessage() {
            const _this = this;

            this.$api.messages
                .deleteMessage(this.selectedMessage.uuid)
                .then(() => {
                    _this.messages = _this.messages.filter(
                        m => m.uuid !== _this.selectedMessage.uuid
                    );

                // Are we deleting from the edit document view?
                if (_this.currentMessage === _this.selectedMessage) {
                    _this.currentMessage = null;
                }

                // Closing the modal & resetting the selecting
                _this.deleteMessageModal = false;
                _this.selectedMessage    = null;
                });
        },
        selectQuestionForFineTuning(question) {
            this.selectedQuestion    = question;
            this.showFineTuningModal = true;
        },
        selectQuestionForDeletion(question) {
            this.selectedQuestion        = question;
            this.showDeleteQuestionModal = true;
        },
        fineTuneSelectedQuestion() {
            const _this               = this;
            this.isFineTuningQuestion = true;

            this.$api.ai.fineTuneQuestion(this.selectedQuestion.uuid, {
                answer: this.selectedQuestion.answer,
                ft_method: this.selectedQuestion.ft_method
            }).then(() => {
                // Close the modal
                _this.showFineTuningModal = false;
                _this.selectedQuestion    = {};

                // Show success message
                _this.showSuccessMessage = true;
                _this.successMessage     = 'Question was fine-tuned!';
            }).finally(() => {
                _this.isFineTuningQuestion = false;
            });
        },
        deleteSelectedQuestion() {
            const _this = this;

            this.$api.messages
                .deleteQuestionFromMessage(this.currentMessage.uuid, this.selectedQuestion.uuid)
                .then(() => {
                    // Remove the question from the list of message questions
                    _this.currentMessageData.questions = _this.currentMessageData.questions.filter(
                        q => q !== _this.selectedQuestion
                    );

                _this.showDeleteQuestionModal = false;
                _this.selectedQuestion        = {};
                });
        },
        updateQuestion(question) {
            const _this = this;

            this.updatingQuestions.push(question);

            this.$api.questions
                .updateQuestion(
                    question.uuid,
                    { answer: question.answer }
                ).then(() => {
                    _this.updatingQuestions = _this.updatingQuestions.filter(
                        q => q !== question
                    );

                    _this.successMessage     = 'Changes saved!';
                    _this.showSuccessMessage = true;
                });
        },
        getMessageIdentifiedQuestions() {
            const _this = this;

            this.$api.messages
                .indexMessageIdentifiedQuestion(
                    this.currentMessage.uuid
                ).then((questions) => {
                    _this.currentMessageData.questions = questions;
                });
        },
        isUpdatingQuestion(question) {
            return this.updatingQuestions.includes(question);
        },
        handleSearchBlur() {
            if (this.search === '' || this.search === null) {
                this.showSearchInput = false;
            }
        }
    },
    watch: {
        currentMessage(message) {
            this.assembleBreadcrumb();

            if (message === null) {
                this.showSuccessMessage = false;
            }
        },
    },
    mounted() {
        const _this = this;

        this.$api.messages.getMessages().then((response) => {
            _this.messages = response;

            // Open the first message on the list
            if (response.length > 0) {
                _this.openMessage(response[0]);
            }
        });

        this.assembleBreadcrumb();
    }
}
</script>

<style scoped>
.clickable {
    cursor: pointer;
}

.answer {
    font-size: 0.85rem;
    border: 1px solid #CCCCCC;
    padding: 10px;
    border-radius: 0.5rem;
    white-space: pre-wrap;
    word-wrap: break-word;
}

.v-breadcrumbs {
  font-size: 0.9rem;
}

.v-expansion-panel-title {
    line-height: 1.25rem;
}
</style>