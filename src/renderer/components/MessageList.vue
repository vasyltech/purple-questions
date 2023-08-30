<template>
    <v-container class="fill-height">
        <v-app-bar>
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

            <v-text-field
                v-if="showSearchInput && !currentMessage"
                density="compact"
                ref="search"
                autofocus
                variant="outlined"
                label="Search..."
                append-inner-icon="mdi-magnify"
                @blur="handleSearchBlur"
                v-model="search"
                class="mt-6"
            ></v-text-field>
            <v-tooltip v-else-if="!currentMessage" text="Search Question" location="bottom">
                <template v-slot:activator="{ props }">
                    <v-btn icon v-bind="props" @click="showSearchInput = true">
                        <v-icon>mdi-magnify</v-icon>
                    </v-btn>
                </template>
            </v-tooltip>

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
            <v-tooltip v-if="currentMessageData.answer" text="Re-Generate Answer" location="bottom">
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
            <v-container v-if="search">
                <v-sheet class="d-flex align-center justify-center flex-wrap text-center mx-auto px-4" elevation="1"
                    height="150" rounded width="100%" color="grey-lighten-3">
                    <div>
                    <p class="text-body-2">
                        Not yet implemented. Sorry...
                    </p>
                    </div>
                </v-sheet>
            </v-container>

            <v-container v-else-if="!currentMessage">
                <v-card>
                    <v-virtual-scroll v-if="messages.length" :items="messages" item-height="96">
                        <template v-slot:default="{ item }">
                            <v-list-item @click="openMessage(item)" lines="two">
                                <template v-slot:prepend>
                                    <v-icon size="large" :icon="getMessageStatusIcon(item)"></v-icon>
                                </template>
                                <v-list-item-title>{{ item.excerpt }}</v-list-item-title>
                                <v-list-item-subtitle>{{ getMessageDate(item) }}</v-list-item-subtitle>

                                <template v-slot:append>
                                    <v-menu location="left">
                                        <template v-slot:activator="{ props }">
                                        <v-btn icon="mdi-dots-vertical" color="grey-lighten-1" variant="text" v-bind="props"></v-btn>
                                        </template>

                                        <v-list>
                                        <v-list-item @click="openMessage(item)">
                                            <v-list-item-title>Open</v-list-item-title>
                                        </v-list-item>
                                        <v-list-item @click="deleteMessage(item)">
                                            <v-list-item-title>Delete</v-list-item-title>
                                        </v-list-item>
                                        </v-list>
                                    </v-menu>
                                    </template>
                            </v-list-item>
                        </template>
                    </v-virtual-scroll>

                    <v-sheet v-else class="d-flex align-center justify-center flex-wrap text-center mx-auto px-4"
                        elevation="1" height="200" rounded width="100%" color="grey-lighten-3">
                        <div>
                            <p class="text-body-2 mb-4">
                                There are no messages.
                            </p>
                            <v-btn @click="createMessageModal = true">Create First Message</v-btn>
                        </div>
                    </v-sheet>
                </v-card>
            </v-container>

            <v-container v-else>
                <v-tabs
                    v-model="currentTab"
                    color="grey-darken-1"
                    align-tabs="start"
                >
                    <v-tab value="original">Message</v-tab>
                    <v-tab value="rewrite" v-if="currentMessageData.rewrite">Rewrite</v-tab>
                    <v-tab value="answer" v-if="currentMessageData.answer">Answer</v-tab>
                </v-tabs>

                <v-window v-model="currentTab">
                    <v-window-item value="original">
                        <v-container fluid>
                            <v-textarea auto-grow variant="outlined" v-model="currentMessageData.text"></v-textarea>
                        </v-container>
                    </v-window-item>
                    <v-window-item value="rewrite">
                        <v-container fluid>
                            <v-textarea auto-grow readonly variant="outlined" v-model="currentMessageData.rewrite"></v-textarea>
                        </v-container>
                    </v-window-item>
                    <v-window-item value="answer">
                        <v-container fluid>
                            <v-textarea auto-grow readonly variant="outlined" v-model="currentMessageData.answer"></v-textarea>
                        </v-container>
                    </v-window-item>
                </v-window>

                <div v-if="hasIdentifiedQuestions">
                    <div class="text-overline pb-2">Identified Questions</div>

                    <v-expansion-panels>
                        <v-expansion-panel v-for="(question, index) in currentMessageData.questions" :key="index">
                            <v-expansion-panel-title>
                                <v-icon
                                    color="grey"
                                    :icon="question.candidate.answer ? 'mdi-check' : 'mdi-alert-circle'"
                                ></v-icon>
                                <span class="ml-2">{{ question.text }}</span>
                            </v-expansion-panel-title>

                            <v-expansion-panel-text>
                                <v-textarea
                                    :label="getAnswerBoxLabel(question)"
                                    variant="outlined"
                                    auto-grow
                                    :readonly="!question.candidate.isEditable"
                                    :rules="[inputValidationRules.required]"
                                    class="mt-6"
                                    v-model="question.candidate.answer"
                                ></v-textarea>

                                <div class="d-flex justify-end">
                                    <v-btn
                                        v-if="!question.candidate.uuid"
                                        variant="text"
                                        :disabled="isIndexingQuestion(question)"
                                        @click="indexQuestion(question)"
                                    >
                                        {{ isIndexingQuestion(question) ? 'Indexing...' : 'Index Answer' }}
                                    </v-btn>
                                    <v-btn
                                        v-if="question.candidate.isEditable && question.candidate.uuid"
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

                <v-dialog v-model="reGenerateAnswerModal" transition="dialog-bottom-transition" width="450">
                    <v-card>
                        <v-toolbar title="Re-Generate Answer"></v-toolbar>
                        <v-card-text>
                            <v-alert type="warning" prominent variant="outlined" color="grey-darken-2">
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
            </v-container>
        </v-responsive>

        <v-dialog v-model="createMessageModal" transition="dialog-bottom-transition" width="600">
            <v-card>
                <v-toolbar title="Create New Message"></v-toolbar>
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
            <v-toolbar title="Delete Message"></v-toolbar>
            <v-card-text>
                <v-alert type="warning" prominent variant="outlined" color="grey-darken-2">
                    You are about to delete the <strong v-if="selectedMessage">"{{ selectedMessage.excerpt }}"</strong> message. Please confirm.
                </v-alert>
            </v-card-text>
            <v-card-actions class="justify-end">
                <v-btn variant="text" @click="deleteSelectedMessage">Delete</v-btn>
                <v-btn variant="text" @click="deleteMessageModal = false">Close</v-btn>
            </v-card-actions>
            </v-card>
        </v-dialog>
    </v-container>
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
            newMessage: null,
            currentMessage: null,
            currentMessageData: {},
            analyzingMessage: false,
            generatingAnswer: false,
            indexingQuestions: [],
            updatingQuestions: [],
            successMessage: null,
            showSuccessMessage: false,
            reGenerateAnswerModal: false,
            showSearchInput: false,
            search: null,
            inputValidationRules: {
                required: value => !!value || 'Required.',
            }
        }
    },
    computed: {
        hasIdentifiedQuestions() {
            return this.currentMessageData
                && this.currentMessageData.questions
                && this.currentMessageData.questions.length > 0
        },
        hasAnyAnswer() {
            return this.currentMessageData
                && this.currentMessageData.questions
                && this.currentMessageData.questions.filter(
                    q => q.candidate.answer
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
            const _this           = this;
            this.analyzingMessage = true;

            this.$api.ai
                .analyzeMessageContent(this.currentMessage.uuid)
                .then((data) => {
                    _this.currentMessageData = data;
                    _this.analyzingMessage   = false;
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
        saveMessageChanges() {
            const _this = this;

            this.$api.messages
                .updateMessage(this.currentMessage.uuid, {
                    text: this.currentMessageData.text
                })
                .then(() => {
                    _this.successMessage     = 'Changes saved!';
                    _this.showSuccessMessage = true;
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
        getMessageStatusIcon(message) {
            let icon = 'mdi-bell-circle';

            if (message.status === 'done') {
                icon = 'mdi-check-circle';
            }

            return icon;
        },
        getMessageDate(message) {
            return (new Date(message.createdAt)).toLocaleDateString(
                'en-us',
                { weekday: "long", year: "numeric", month: "short", day: "numeric" }
            );
        },
        assembleBreadcrumb() {
            const breadcrumb = [{
                title: 'Messages',
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
        indexQuestion(question) {
            const _this = this;

            this.indexingQuestions.push(question);

            this.$api.ai
                .indexMessageQuestion(
                    this.currentMessage.uuid,
                    question.text,
                    question.candidate.answer
                ).then(() => {
                    _this.indexingQuestions = _this.indexingQuestions.filter(
                        q => q !== question
                    );

                    _this.getMessageIdentifiedQuestions();

                    _this.analyzingMessage = false;

                    _this.successMessage     = 'Question Indexed!';
                    _this.showSuccessMessage = true;
                });
        },
        updateQuestion(question) {
            const _this = this;

            this.updatingQuestions.push(question);

            this.$api.questions
                .updateQuestion(
                    question.candidate.uuid,
                    { answer: question.candidate.answer },
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
        isIndexingQuestion(question) {
            return this.indexingQuestions.includes(question);
        },
        isUpdatingQuestion(question) {
            return this.updatingQuestions.includes(question);
        },
        getAnswerBoxLabel(question) {
            let label = question.candidate.uuid ? 'Best Answer' : 'Provide Your Answer';

            if (question.candidate.isMultiple) {
                label += ' (Multiple Candidates)'
            }

            return label;
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
        });

        this.assembleBreadcrumb();
    }
}
</script>

<style scoped>
.clickable {
    cursor: pointer;
}
</style>