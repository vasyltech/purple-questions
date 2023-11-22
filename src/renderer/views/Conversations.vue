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

            <v-tooltip v-if="!currentConversation" text="Start New Conversation" location="bottom">
                <template v-slot:activator="{ props }">
                    <v-btn icon v-bind="props" @click="createConversationModal = true">
                        <v-icon>mdi-message-plus-outline</v-icon>
                    </v-btn>
                </template>
            </v-tooltip>

            <v-tooltip v-if="currentConversation && ['new', 'read'].includes(currentConversation.status)" text="Mark as Done"
                location="bottom">
                <template v-slot:activator="{ props }">
                    <v-btn icon v-bind="props" @click="markAsDone">
                        <v-icon>mdi-check-circle</v-icon>
                    </v-btn>
                </template>
            </v-tooltip>

            <v-tooltip v-else-if="currentConversation && currentConversation.status === 'done'" text="Mark as UnDone"
                location="bottom">
                <template v-slot:activator="{ props }">
                    <v-btn icon v-bind="props" @click="markAsUnDone">
                        <v-icon>mdi-bell-circle</v-icon>
                    </v-btn>
                </template>
            </v-tooltip>

            <v-tooltip v-if="currentConversation" text="Save Changes" location="bottom">
                <template v-slot:activator="{ props }">
                    <v-btn icon v-bind="props" @click="saveChanges">
                        <v-icon>mdi-content-save</v-icon>
                    </v-btn>
                </template>
            </v-tooltip>
            <v-tooltip v-if="currentConversation" text="Delete Conversation" location="bottom">
                <template v-slot:activator="{ props }">
                    <v-btn icon v-bind="props" @click="deleteCurrentConversation">
                        <v-icon>mdi-trash-can</v-icon>
                    </v-btn>
                </template>
            </v-tooltip>
        </v-app-bar>

        <v-responsive class="align-left fill-height">
            <v-row no-gutters class="flex-nowrap">
                <v-col cols="3" class="flex-grow-0 flex-shrink-0 conversation-list">
                    <v-toolbar class="pl-2" color="grey-lighten-5" style="border-bottom: 1px solid #CCCCCC">
                        <v-text-field
                            density="compact"
                            variant="outlined"
                            label="Search..."
                            append-inner-icon="mdi-magnify"
                            v-model="search"
                            class="mt-6"
                        ></v-text-field>
                        <v-menu class="ml-4" location="right">
                            <template v-slot:activator="{ props }">
                                <v-icon color="grey-darken-3" v-bind="props">mdi-dots-vertical</v-icon>
                            </template>
                            <v-list>
                                <v-list-item @click="filterConversations()">
                                    <v-list-item-title>All</v-list-item-title>
                                </v-list-item>
                                <v-list-item @click="filterConversations('new')">
                                    <v-list-item-title>New</v-list-item-title>
                                </v-list-item>
                                <v-list-item @click="filterConversations('read')">
                                    <v-list-item-title>Read</v-list-item-title>
                                </v-list-item>
                                <v-list-item @click="filterConversations('done')">
                                    <v-list-item-title>Closed</v-list-item-title>
                                </v-list-item>
                            </v-list>
                        </v-menu>
                    </v-toolbar>

                    <v-infinite-scroll v-if="filteredConversations.length" :items="filteredConversations" item-height="96" @load="loadMore">
                        <template v-for="(item) in filteredConversations" :key="item">
                            <v-list-item @click="openConversation(item)" lines="two" :title="getConversationDate(item)"
                                :active="currentConversation === item" color="deep-purple-darken-1">
                                <template v-slot:prepend>
                                    <v-icon size="large" :icon="getConversationStatusIcon(item)"></v-icon>
                                </template>
                                <v-list-item-subtitle>{{ item.excerpt }}</v-list-item-subtitle>
                            </v-list-item>
                        </template>
                    </v-infinite-scroll>
                    <div v-else class="text-center my-4">No items.</div>
                </v-col>
                <v-col cols="9" class="flex-grow-1 flex-shrink-0 pl-6 pr-4 py-4 msg-body">
                    <div v-if="currentConversation" class="pb-12">
                        <v-timeline side="end" class="mb-4">
                            <v-timeline-item
                                v-for="(message, index) in currentConversationData.messages"
                                :key="message"
                                :dot-color="getMessageIconColor(message)"
                                size="x-small"
                            >
                                <v-alert
                                    :value="true"
                                >
                                    <v-alert-title class="mb-2 text-overline">{{ message.name || message.role }}</v-alert-title>

                                    <div v-if="!message.isEditing" class="dynamic-text" v-html="message.content"></div>
                                    <editor v-else v-model="message.draft"></editor>

                                    <div class="d-flex justify-end mt-4">
                                        <v-btn
                                            v-if="!message.isEditing && index !== 0"
                                            variant="text"
                                            color="red-darken-4"
                                            @click="selectMessageForRemoval(message)"
                                        >
                                            Remove
                                        </v-btn>

                                        <v-btn
                                            v-if="!message.isEditing && !currentConversationData.isAnalyzed"
                                            :disabled="analyzingMessage"
                                            @click="analyzeMessage"
                                            variant="text"
                                        >
                                            {{ analyzingMessage ? 'Analyzing' : 'Analyze Message' }}
                                        </v-btn>

                                        <v-btn
                                            v-if="showGenerateBtn(message)"
                                            variant="text"
                                            :disabled="generatingAnswer"
                                            @click="generateAnswer"
                                        >
                                            {{ generatingAnswer ? 'Composing' : 'Compose Response' }}
                                        </v-btn>

                                        <v-btn
                                            v-if="!message.isEditing"
                                            variant="text"
                                            @click="selectMessageForEditing(message)"
                                        >
                                            Edit
                                        </v-btn>

                                        <v-btn
                                            v-if="message.isEditing"
                                            variant="text"
                                            @click="saveMessageChanges(message)"
                                        >
                                            Ok
                                        </v-btn>

                                        <v-btn
                                            v-if="message.isEditing"
                                            variant="text"
                                            @click="cancelMessageChanges(message)"
                                        >
                                            Cancel
                                        </v-btn>
                                    </div>
                                </v-alert>
                            </v-timeline-item>
                        </v-timeline>

                        <editor v-model="currentConversationData.stagedAnswer"></editor>

                        <div class="d-flex justify-end mt-4">
                            <v-btn v-if="currentConversationData.stagedAnswer" variant="text" @click="showSendAnswerModal = true">
                                Send Response
                            </v-btn>
                        </div>

                        <div v-if="currentConversationData.isAnalyzed">
                            <v-toolbar class="mt-6" density="compact">
                                <v-toolbar-title class="text-overline">Conversation Topics</v-toolbar-title>
                                <v-spacer></v-spacer>

                                <v-tooltip v-if="currentConversationData.rewrite" text="Provide Direct Answer" location="bottom">
                                    <template v-slot:activator="{ props }">
                                        <v-btn icon v-bind="props" @click="prepareDirectAnswerModal">
                                            <v-icon>mdi-feather</v-icon>
                                        </v-btn>
                                    </template>
                                </v-tooltip>
                                <v-tooltip text="Add New Topic" location="bottom">
                                    <template v-slot:activator="{ props }">
                                        <v-btn icon v-bind="props" @click="showAddTopicModal = true">
                                            <v-icon>mdi-plus-box</v-icon>
                                        </v-btn>
                                    </template>
                                </v-tooltip>
                            </v-toolbar>

                            <v-list v-if="hasAssociatedQuestions" lines="false">
                                <v-list-item v-for="(question, index) in currentConversationData.questions" :key="index"
                                    :title="question.text" @click="selectQuestionForEditing(question)">
                                    <template v-slot:prepend>
                                        <v-icon :icon="getQuestionVisualIndicator(question)"></v-icon>
                                    </template>
                                    <template v-slot:append>
                                        <v-tooltip text="Manage Question" location="bottom">
                                            <template v-slot:activator="{ props }">
                                                <v-btn icon variant="plain" v-bind="props"
                                                    @click.stop="selectQuestionForEditing(question)">
                                                    <v-icon>mdi-pencil</v-icon>
                                                </v-btn>
                                            </template>
                                        </v-tooltip>
                                        <v-tooltip text="Delete Question" location="bottom">
                                            <template v-slot:activator="{ props }">
                                                <v-btn icon variant="plain" v-bind="props"
                                                    @click.stop="selectQuestionForDeletion(question)">
                                                    <v-icon>mdi-trash-can</v-icon>
                                                </v-btn>
                                            </template>
                                        </v-tooltip>
                                    </template>
                                </v-list-item>
                            </v-list>

                            <v-sheet v-else class="d-flex align-center justify-center flex-wrap text-center mx-auto px-4"
                                rounded height="100" width="100%" color="grey-lighten-3">
                                <p class="text-body-2 mb-4">
                                    There is no material available to answer user message.
                                </p>
                            </v-sheet>
                        </div>

                        <div v-if="currentConversationData.metadata" class="mt-6">
                            <v-toolbar density="compact">
                                <v-toolbar-title class="text-overline">Conversation Metadata</v-toolbar-title>
                            </v-toolbar>

                            <v-table>
                                <tbody>
                                    <tr v-for="key in Object.keys(currentConversationData.metadata)" :key="key">
                                        <td>{{ key }}</td>
                                        <td>{{ currentConversationData.metadata[key] }}</td>
                                    </tr>
                                </tbody>
                            </v-table>
                        </div>
                    </div>
                </v-col>
            </v-row>

            <v-tooltip text="Start New Conversation" location="left">
                <template v-slot:activator="{ props }">
                    <v-btn class="add-btn" icon="mdi-plus" v-bind="props" color="deep-purple"
                        @click="createConversationModal = true" size="large"></v-btn>
                </template>
            </v-tooltip>
        </v-responsive>

        <v-dialog v-model="showGenerateAnswerModal" transition="dialog-bottom-transition" width="450">
            <v-card>
                <v-toolbar color="grey-darken-4" title="Re-Generate Answer"></v-toolbar>
                <v-card-text>
                    <v-alert type="warning" prominent variant="outlined">
                        You are about to generate a new answer to the user message. The previous answer will be lost. Please
                        confirm.
                    </v-alert>
                </v-card-text>
                <v-card-actions class="justify-end">
                    <v-btn variant="text" :disabled="generatingAnswer" @click="generateAnswer">{{ generatingAnswer ?
                        'Generating...' : 'Generate' }}</v-btn>
                    <v-btn variant="text" @click="showGenerateAnswerModal = false">Close</v-btn>
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

        <v-dialog v-model="createConversationModal" transition="dialog-bottom-transition" width="1000">
            <v-card>
                <v-toolbar color="grey-darken-4" title="Start New Conversation"></v-toolbar>
                <v-card-text>
                    <editor v-model="newConversation"></editor>
                </v-card-text>
                <v-card-actions class="justify-end">
                    <v-btn v-if="newConversation" variant="text" @click="createConversation">Create</v-btn>
                    <v-btn variant="text" @click="createConversationModal = false">Close</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <v-dialog v-model="deleteConversationModal" transition="dialog-bottom-transition" width="550">
            <v-card>
                <v-toolbar color="red-darken-4" title="Delete Conversation"></v-toolbar>
                <v-card-text>
                    <v-alert type="warning" prominent variant="outlined" color="red-darken-4">
                        You are about to delete the <strong v-if="selectedConversation">"{{ selectedConversation.excerpt }}"</strong>
                        conversation. Please confirm.
                    </v-alert>
                </v-card-text>
                <v-card-actions class="justify-end">
                    <v-btn variant="text" color="red-darken-4" @click="deleteSelectedConversation">Delete</v-btn>
                    <v-btn variant="text" @click="deleteConversationModal = false">Close</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <v-dialog v-model="showDeleteMessageModal" transition="dialog-bottom-transition" width="550">
            <v-card>
                <v-toolbar color="red-darken-4" title="Delete Message"></v-toolbar>
                <v-card-text>
                    <v-alert type="warning" prominent variant="outlined" color="red-darken-4">
                        You are about to delete the message from this conversation. Please confirm.
                    </v-alert>
                </v-card-text>
                <v-card-actions class="justify-end">
                    <v-btn variant="text" color="red-darken-4" @click="deleteSelectedMessage">Delete</v-btn>
                    <v-btn variant="text" @click="showDeleteMessageModal = false">Close</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <v-dialog v-model="showAddTopicModal" transition="dialog-bottom-transition" fullscreen>
            <v-card>
                <v-toolbar color="grey-darken-4">
                    <v-toolbar-title>Add New Topic</v-toolbar-title>
                    <v-spacer></v-spacer>
                    <v-toolbar-items>
                        <v-btn icon @click="showAddTopicModal = false">
                            <v-icon>mdi-close</v-icon>
                        </v-btn>
                    </v-toolbar-items>
                </v-toolbar>
                <v-card-text>
                    <v-container>
                        <v-textarea
                            label="Subject"
                            v-model="newQuestionText"
                            variant="outlined"
                            auto-grow
                            rows="2"
                            :rules="[inputValidationRules.required]"
                        ></v-textarea>

                        <editor v-model="newQuestionAnswer"></editor>
                    </v-container>
                </v-card-text>
                <v-card-actions class="justify-end">
                    <v-btn variant="text" @click="addNewTopic">Add</v-btn>
                    <v-btn variant="text" @click="showAddTopicModal = false">Close</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <v-dialog v-model="showLinkQuestionModal" transition="dialog-bottom-transition" width="1000">
            <v-card>
                <v-toolbar color="grey-darken-4">
                    <v-toolbar-title>Link Question To Documents</v-toolbar-title>
                </v-toolbar>
                <v-card-text>
                    <v-container>
                        <v-alert type="info" prominent variant="outlined">
                            Carefully choose one or more documents from the list. Upon confirming selections, the <strong>"{{ stagedQuestionData.text }}"</strong> question will be duplicated and attached to each selected document.
                            The best possible answer will be automatically generated based on document's material.
                        </v-alert>

                        <v-combobox
                            v-model="linkedDocuments"
                            class="mt-6"
                            multiple
                            chips
                            variant="outlined"
                            label="Link Question To"
                            :return-object="false"
                            prepend-inner-icon="mdi-clipboard-text"
                            :items="documents"
                        >
                        <template v-slot:item="{ item, props }">
                            <v-list-item v-bind="props" :title="item.title" :subtitle="item.value.breadcrumb">
                                <template v-slot:prepend="{ isActive }">
                                    <v-list-item-action start>
                                        <v-checkbox-btn :model-value="isActive"></v-checkbox-btn>
                                    </v-list-item-action>
                                </template>
                            </v-list-item>
                        </template>
                        </v-combobox>
                    </v-container>
                </v-card-text>
                <v-card-actions class="justify-end">
                    <v-btn
                        v-if="linkedDocuments.length > 0"
                        :disabled="isLinkingDocuments"
                        variant="text"
                        @click="linkSelectedQuestionToDocuments"
                    >{{ isLinkingDocuments ? 'Linking' : 'Link' }}</v-btn>
                    <v-btn variant="text" @click="showLinkQuestionModal = false">Close</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <v-dialog v-model="showEditQuestionModal" transition="dialog-bottom-transition" fullscreen>
            <v-card>
                <v-toolbar color="grey-darken-4">
                    <v-icon class="ml-2" :icon="getQuestionVisualIndicator(stagedQuestionData)"></v-icon>
                    <v-toolbar-title>Manage Question</v-toolbar-title>
                    <v-spacer></v-spacer>
                    <v-toolbar-items>
                        <v-btn icon dark @click="showEditQuestionModal = false">
                            <v-icon>mdi-close</v-icon>
                        </v-btn>
                    </v-toolbar-items>
                </v-toolbar>
                <v-card-text>
                    <v-container>
                        <v-textarea
                            label="Question (read-only)"
                            v-model="stagedQuestionData.text"
                            variant="outlined"
                            auto-grow
                            rows="2"
                            :rules="[inputValidationRules.required]"
                        ></v-textarea>

                        <v-tabs
                            v-model="questionTab"
                            align-tabs="start"
                        >
                            <v-tab value="direct">Direct Answer</v-tab>
                            <v-tab value="similar" v-if="prepareQuestionCandidateList(stagedQuestionData).length > 0">Similar Questions ({{ prepareQuestionCandidateList(stagedQuestionData).length }})</v-tab>
                        </v-tabs>

                        <v-window v-model="questionTab" class="mt-4">
                            <v-window-item value="direct">
                                <editor v-model="stagedQuestionData.answer"></editor>
                            </v-window-item>
                            <v-window-item value="similar">
                                <v-list class="candidates">
                                    <v-list-item v-for="(item, index) in prepareQuestionCandidateList(stagedQuestionData)" :key="index">
                                        <v-list-item-title class="candidate-title">
                                            <span class="font-weight-bold text-uppercase text-deep-purple">{{ item.similarity === 0 ? 'exact match' : `Distance ${item.similarity}` }}:</span>&nbsp;&nbsp;{{ item.name }}
                                        </v-list-item-title>
                                        <div class="dynamic-text" v-html="item.text"></div>
                                    </v-list-item>
                                </v-list>
                            </v-window-item>
                        </v-window>

                        <v-radio-group v-if="stagedQuestionData.answer" class="mt-6" v-model="stagedQuestionData.ft_method"
                            inline label="Fine-Tuning Method" persistent-hint
                            :hint="stagedQuestionData.ft_method === 'shallow' ? 'Only memorize and include topic in prompts' : 'Memorize topic and queue for actual model fine-tuning'">
                            <v-radio label="Factual Learning" value="shallow"></v-radio>
                            <v-radio label="New Skill" value="deep"></v-radio>
                        </v-radio-group>
                    </v-container>
                </v-card-text>
                <v-card-actions class="justify-end">
                    <v-btn color="red-darken-4" variant="text" @click="showDeleteQuestionModal = true">Delete</v-btn>
                    <v-btn variant="text" @click="showLinkQuestionModal = true">Link</v-btn>
                    <v-btn v-if="stagedQuestionData.answer && stagedQuestionData.ft_method" variant="text"
                        :disabled="isFineTuningQuestion" @click="fineTuneSelectedQuestion">{{ isFineTuningQuestion ?
                            'Fine-Tuning...' : 'Fine-Tune' }}</v-btn>
                    <v-btn variant="text" @click="updateSelectedQuestion">Update</v-btn>
                    <v-btn variant="text" @click="showEditQuestionModal = false">Close</v-btn>
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

        <v-dialog v-model="showSendAnswerModal" transition="dialog-bottom-transition" width="550">
            <v-card>
                <v-toolbar color="grey-darken-4" title="Send Response"></v-toolbar>
                <v-card-text>
                    <v-alert type="info" prominent variant="outlined">
                        You are about to send the response. Please confirm.
                    </v-alert>

                    <v-checkbox hide-details v-model="markAsDone" label="Also mark conversation as done." />
                </v-card-text>
                <v-card-actions class="justify-end">
                    <v-btn variant="text" @click="sendAnswerForSelectedConversation">Send</v-btn>
                    <v-btn variant="text" @click="showSendAnswerModal = false">Close</v-btn>
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
            currentStatus: null,
            questionTab: 'direct',
            breadcrumb: [],
            documents: [],
            conversations: [],
            linkedDocuments: [],
            createConversationModal: false,
            deleteConversationModal: false,
            selectedConversation: null,
            selectedQuestion: {},
            selectedMessage: null,
            page: 0,
            pullInterval: null,
            stagedQuestionData: {},
            newConversation: null,
            newQuestionText: null,
            newQuestionAnswer: null,
            currentConversation: null,
            currentConversationData: {},
            analyzingMessage: false,
            generatingAnswer: false,
            isFineTuningQuestion: false,
            isLinkingDocuments: false,
            updatingQuestions: [],
            successMessage: null,
            showSuccessMessage: false,
            showDeleteQuestionModal: false,
            showAddTopicModal: false,
            showEditQuestionModal: false,
            showLinkQuestionModal: false,
            showGenerateAnswerModal: false,
            showSearchInput: false,
            showSendAnswerModal: false,
            showDeleteMessageModal: false,
            search: null,
           // markAsDone: true,
            inputValidationRules: {
                required: value => !!value || 'Required.'
            }
        }
    },
    computed: {
        hasAssociatedQuestions() {
            return this.currentConversationData
                && this.currentConversationData.questions
                && this.currentConversationData.questions.length > 0
        },
        hasAnyAnswer() {
            return this.currentConversationData
                && this.currentConversationData.questions
                && this.currentConversationData.questions.filter(
                    q => q.answer || q.candidates.length > 0
                ).length > 0
        },
        filteredConversations() {
            let response = this.currentStatus ?
                this.conversations.filter(m => m.status === this.currentStatus)
                : this.conversations;

            if (this.search) {
                response = response.filter(m => m.excerpt.includes(this.search));
            }

            return response;
        }
    },
    methods: {
        navigateTo(node) {
            this.currentConversation = node;
        },
        filterConversations(status = null) {
            this.currentStatus = status;
        },
        markAsDone() {
            const _this = this;

            this.$api.conversations
                .updateStatus(this.currentConversation.uuid, 'done')
                .then((response) => {
                    for (let i = 0; i < _this.conversations.length; i++) {
                        if (_this.conversations[i].uuid === response.uuid) {
                            _this.conversations[i]    = response;
                            _this.currentConversation = response;
                        }
                    }

                    _this.successMessage     = 'Changes saved!';
                    _this.showSuccessMessage = true;
                });
        },
        markAsUnDone() {
            const _this = this;

            this.$api.conversations
                .updateStatus(this.currentConversation.uuid, 'new')
                .then((response) => {
                    for (let i = 0; i < _this.conversations.length; i++) {
                        if (_this.conversations[i].uuid === response.uuid) {
                            _this.conversations[i] = response;
                            _this.currentConversation = response;
                        }
                    }

                    _this.successMessage     = 'Changes saved!';
                    _this.showSuccessMessage = true;
                });
        },
        analyzeMessage() {
            this.saveChanges(true, function () {
                const _this = this;
                this.analyzingMessage = true;

                this.$api.ai
                    .prepareConversationContext(this.currentConversation.uuid)
                    .then((data) => {
                        _this.currentConversationData = data;
                        _this.analyzingMessage        = false;
                    });
            });
        },
        showGenerateBtn(message) {
            // Determine if the message is the last message on the list and it belongs
            // to user.
            const messages = this.currentConversationData.messages;
            const isLast   = messages[messages.length - 1] === message;
            const isUser   = message.role === 'user';

            return isLast && isUser && this.hasAnyAnswer;
        },
        selectMessageForRemoval(message) {
            this.selectedMessage        = message;
            this.showDeleteMessageModal = true;
        },
        selectMessageForEditing(message) {
            message.isEditing = true;
            message.draft     = message.content;
        },
        saveMessageChanges(message) {
            const _this = this;

            this.$api.conversations
                .updateMessage(this.currentConversation.uuid, message.id, {
                    content: message.draft
                })
                .then(() => {
                    _this.successMessage     = 'Message Updated!';
                    _this.showSuccessMessage = true;

                    message.content   = message.draft;
                    message.draft     = undefined;
                    message.isEditing = false;
                });
        },
        cancelMessageChanges(message) {
            message.isEditing = false;
            message.draft     = undefined;
        },
        deleteSelectedMessage() {
            const _this = this;

            this.$api.conversations
                .deleteMessage(this.currentConversation.uuid, this.selectedMessage.id)
                .then(() => {
                    _this.successMessage     = 'Message Deleted!';
                    _this.showSuccessMessage = true;

                    // Update current list of messages;
                    _this.currentConversation.messages = _this.currentConversation.messages.filter(
                        m => m.id !==  _this.selectedMessage.id
                    );

                    _this.showDeleteMessageModal = false;
                    _this.selectedMessage        = null;
                });
        },
        getMessageIconColor(message) {
            return message.role === 'user' ? 'blue-darken-4' : 'deep-purple-lighten-1';
        },
        generateAnswer() {
            const _this = this;
            this.generatingAnswer = true;

            this.$api.ai
                .generateMessageAnswer(this.currentConversation.uuid)
                .then((data) => {
                    _this.currentConversationData = data;
                    _this.showGenerateAnswerModal = false;
                    _this.generatingAnswer        = false;
                });
        },
        saveChanges(silent = false, cb = null) {
            const _this = this;

            this.$api.conversations
                .update(this.currentConversation.uuid, {
                    text: this.currentConversationData.text,
                    answer: this.currentConversationData.answer
                })
                .then((response) => {
                    if (silent !== true) {
                        _this.successMessage     = 'Changes saved!';
                        _this.showSuccessMessage = true;

                        // Update current message attributes
                        this.currentConversation.excerpt = response.excerpt;
                    }

                    if (cb) {
                        cb.call(_this);
                    }
                });
        },
        createConversation() {
            const _this = this;

            this.$api.conversations
                .create({ text: this.newConversation })
                .then((conversation) => {
                    _this.conversations.unshift(conversation);

                    // Closing the dialog & resetting the form
                    _this.createConversationModal = false;
                    _this.newConversation         = null;

                    // Open the new conversation
                    _this.openConversation(conversation);
                });
        },
        openConversation(conversation) {
            const _this = this;

            this.$api.conversations.read(conversation.uuid).then((response) => {
                _this.currentConversation     = conversation;
                _this.currentConversationData = response;

                // Override the conversation status
                conversation.status = response.status;
            });
        },
        prepareQuestionCandidateList(question) {
            // Removing candidate that is a direct answer to this question
            return question.candidates.filter(c => c.uuid !== question.uuid);
        },
        getConversationStatusIcon(conversation) {
            let icon = 'mdi-bell-circle';

            if (conversation.status === 'done') {
                icon = 'mdi-check-circle';
            } else if (conversation.status === 'read') {
                icon = 'mdi-help-circle';
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
        getConversationDate(conversation) {
            return (new Date(conversation.createdAt)).toLocaleDateString(
                'en-us',
                { weekday: "short", year: "numeric", month: "short", day: "numeric" }
            );
        },
        assembleBreadcrumb() {
            const breadcrumb = [{
                title: 'Conversations',
                node: null
            }];

            if (this.currentConversation !== null) {
                breadcrumb.push({
                    title: this.currentConversation.excerpt.substring(0, 30) + '...'
                })
            }

            this.breadcrumb = breadcrumb;
        },
        deleteConversation(conversation) {
            this.selectedConversation    = conversation;
            this.deleteConversationModal = true;
        },
        deleteCurrentConversation() {
            this.selectedConversation = this.currentConversation;
            this.deleteConversationModal = true;
        },
        deleteSelectedConversation() {
            const _this = this;

            this.$api.conversations
                .delete(this.selectedConversation.uuid)
                .then(() => {
                    _this.conversations = _this.conversations.filter(
                        m => m.uuid !== _this.selectedConversation.uuid
                    );

                    // Are we deleting from the edit document view?
                    if (_this.currentConversation === _this.selectedConversation) {
                        _this.currentConversation = null;
                    }

                    // Closing the modal & resetting the selecting
                    _this.deleteConversationModal = false;
                    _this.selectedConversation = null;
                });
        },
        selectQuestionForEditing(question) {
            this.selectedQuestion      = question;
            this.stagedQuestionData    = Object.assign({}, question);
            this.showEditQuestionModal = true;
            this.linkedDocuments       = [];
        },
        selectQuestionForDeletion(question) {
            this.selectedQuestion        = question;
            this.showDeleteQuestionModal = true;
        },
        fineTuneSelectedQuestion() {
            const _this = this;
            this.isFineTuningQuestion = true;

            this.$api.ai.fineTuneQuestion(this.selectedQuestion.uuid, {
                answer: this.stagedQuestionData.answer,
                ft_method: this.stagedQuestionData.ft_method
            }).then(() => {
                // Close the modal
                _this.showEditQuestionModal = false;
                _this.selectedQuestion = {};

                // Show success message
                _this.showSuccessMessage = true;
                _this.successMessage     = 'Question was fine-tuned!';

                // Re-load all questions
                _this.getTopicList();
            }).finally(() => {
                _this.isFineTuningQuestion = false;
            });
        },
        prepareDirectAnswerModal() {
            this.newQuestionText = this.currentConversationData.rewrite;
            this.showAddTopicModal = true;
        },
        addNewTopic() {
            const _this = this;

            this.$api.conversations
                .addTopic(this.currentConversation.uuid, {
                    text: this.newQuestionText,
                    answer: this.newQuestionAnswer
                })
                .then(() => {
                    _this.showAddTopicModal = false;

                    // Re-init the list of all questions
                    _this.getTopicList();
                });
        },
        deleteSelectedQuestion() {
            const _this = this;

            this.$api.conversations
                .deleteTopic(this.currentConversation.uuid, this.selectedQuestion.uuid)
                .then(() => {
                    // Remove the question from the list
                    _this.currentConversationData.questions = _this.currentConversationData.questions.filter(
                        q => q !== _this.selectedQuestion
                    );

                    _this.showDeleteQuestionModal = false;
                    _this.selectedQuestion = {};
                });
        },
        updateSelectedQuestion() {
            const _this = this;

            this.$api.questions
                .updateQuestion(this.selectedQuestion.uuid, {
                    answer: this.stagedQuestionData.answer,
                    linkedDocuments: this.stagedQuestionData.linkedDocuments
                }).then(() => {
                    _this.successMessage     = 'Changes saved!';
                    _this.showSuccessMessage = true;

                    // Re-load all questions
                    _this.getTopicList();

                    // Close the modal and reset form
                    _this.showLinkQuestionModal = false;
                    _this.linkedDocuments       = [];
                });
        },
        linkSelectedQuestionToDocuments() {
            const _this             = this;
            this.isLinkingDocuments = true;

            this.$api.questions
                .linkQuestion(this.selectedQuestion.uuid, Object.values(this.linkedDocuments)).then(() => {
                    _this.successMessage     = 'Question linked!';
                    _this.showSuccessMessage = true;

                    // Close the edit modal
                    _this.showEditQuestionModal = false;

                    // Re-load all questions
                    _this.getTopicList();
                }).finally(() => {
                    _this.isLinkingDocuments    = false;
                    _this.showLinkQuestionModal = false;
                });
        },
        getTopicList() {
            const _this = this;

            this.$api.conversations
                .getTopicList(
                    this.currentConversation.uuid
                ).then((questions) => {
                    _this.currentConversationData.questions = questions;
                });
        },
        isUpdatingQuestion(question) {
            return this.updatingQuestions.includes(question);
        },
        async loadMore({ done }) {
            const n = await this.loadConversations();

            done(n < 10 ? 'empty' : 'ok');
        },
        loadConversations() {
            const _this = this;

            return this.$api.conversations.getList(this.page, 10).then((response) => {
                _this.conversations.push(...response);
                _this.page += 1;

                // Open the first conversation on the list
                if (!_this.currentConversation && response.length > 0) {
                    _this.openConversation(response[0]);
                }

                return response.length;
            });
        }
    },
    watch: {
        currentConversation(conversation) {
            this.assembleBreadcrumb();

            if (conversation === null) {
                this.showSuccessMessage = false;
            }
        },
        showAddTopicModal(value) {
            if (value === false) {
                this.newQuestionText = null;
                this.newQuestionAnswer = null;
            }
        }
    },
    mounted() {
        const _this = this;

        this.loadConversations();

        this.pullInterval = setInterval(function () {
            _this.$api.conversations.pull().then((response) => {
                if (Array.isArray(response) && response.length > 0) {
                    _this.conversations.unshift(...response);
                }
            });
        }, 30000);

        this.$api.documents.getDocumentList('document').then((response) => {
            _this.documents = Array.isArray(response) ? response.map(i => ({
                title: i.name,
                value: i.uuid,
                breadcrumb: i.breadcrumb.join(' / ')
            })) : [];
        });

        this.assembleBreadcrumb();
    },
    unmounted() {
        if (this.pullInterval) {
            this.pullInterval = clearInterval(this.pullInterval);
        }
    }
}
</script>

<style scoped lang="scss">
.clickable {
    cursor: pointer;
}
.conversation-list {
    border-right: 1px solid #CCCCCC;
    max-height: calc(100vh - 64px);
    overflow-y: scroll;
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
.add-btn {
    position: absolute;
    bottom: 20px;
    right: 20px;
}

.v-window {
    overflow: visible;
}
.msg-body {
    max-height: calc(100vh - 64px);
    overflow-y: scroll;
}

.candidates {
    padding: 0;

    .v-list-item--density-default:not(.v-list-item--nav).v-list-item--one-line {
        padding-inline-start: 0;
        padding-inline-end: 0
    }

    .v-list-item-title {
        white-space: normal;
        font-weight: 500;
    }
}

.v-timeline {
    .v-timeline-item {
        .v-timeline-item__opposite {
            padding-inline-end: 0px !important;
        }
    }
}

:deep(.v-timeline .v-timeline-item .v-timeline-item__opposite) {
    padding-inline-end: 0px !important;
}

.dynamic-title {
    padding: 10px;
    background-color: #F0F0F0;
}

.dynamic-text {
    margin: 0rem 0 2rem 0;
    padding: 10px;
}

:deep(.dynamic-text p) {
    margin-bottom: 1.25rem !important;
}

:deep(.dynamic-text ul) {
    margin-bottom: 1.25rem !important;
    margin-left: 20px
}

:deep(.dynamic-text ol) {
    margin-bottom: 1.25rem !important;
    margin-left: 20px
}

:deep(.dynamic-text a) {
    color: #673ab7 !important;
    text-decoration: none;
}
</style>