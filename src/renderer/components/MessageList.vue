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

            <template v-slot:append>
                <v-tooltip text="Add New Message" location="bottom">
                    <template v-slot:activator="{ props }">
                        <v-btn icon v-bind="props" @click="createMessageModal = true">
                            <v-icon>mdi-message-plus-outline</v-icon>
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
            </template>
        </v-app-bar>

        <v-responsive class="align-left fill-height">
            <v-container v-if="!currentMessage">
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
                        elevation="1" height="200" rounded width="100%">
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
                </v-window>


                <div v-if="hasIndexedQuestions">
                    <div class="text-overline pb-2">Identified Questions</div>

                    <v-expansion-panels>
                        <v-expansion-panel v-for="(question, index) in currentMessageData.questions" :key="index">
                            <v-expansion-panel-title>
                                <v-icon color="grey"
                                    :icon="question.candidate ? 'mdi-check-circle' : 'mdi-alert-circle'"></v-icon>
                                <span class="ml-2">{{ question.text }}</span>
                            </v-expansion-panel-title>
                            <v-expansion-panel-text>
                                <v-textarea label="Best Answer" v-if="question.candidate" variant="outlined" auto-grow
                                    readonly class="mt-6" v-model="question.candidate.answer"></v-textarea>
                                <div v-else>
                                    <v-textarea label="Provide Your Answer" variant="outlined" auto-grow
                                         class="mt-6" ></v-textarea>
                                </div>
                                <div class="d-flex justify-end">
                                    <v-btn variant="text" v-if="!question.candidate" @click="indexQuestion(question)">Index</v-btn>
                                    <v-btn variant="text" v-if="!question.candidate" @click="ignoreQuestion(question)">Ignore</v-btn>
                                </div>
                            </v-expansion-panel-text>
                        </v-expansion-panel>
                    </v-expansion-panels>
                </div>
                <v-sheet v-else class="d-flex align-center justify-center flex-wrap text-center mx-auto px-4" elevation="1"
                    height="150" rounded width="100%">
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
            inputValidationRules: {
                required: value => !!value || 'Required.',
            }
        }
    },
    computed: {
        hasIndexedQuestions() {
            return this.currentMessageData
                && this.currentMessageData.questions
                && this.currentMessageData.questions.length > 0
        }
    },
    methods: {
        navigateTo(node) {
            this.currentMessage = node;
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
            let icon = 'mdi-alert-circle';

            if (message.status === 'closed') {
                icon = 'mdi-check-circle';
            }

            return icon
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
        }
    },
    watch: {
        currentMessage() {
            this.assembleBreadcrumb();
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