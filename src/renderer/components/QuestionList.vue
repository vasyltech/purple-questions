<template>
    <v-container class="fill-height">
        <v-app-bar>
            <template v-slot:prepend>
                <v-icon icon="mdi-progress-question"></v-icon>
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
                v-if="showSearchInput"
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
            <v-tooltip v-else text="Search Question" location="bottom">
                <template v-slot:activator="{ props }">
                    <v-btn icon v-bind="props" @click="showSearchInput = true">
                        <v-icon>mdi-magnify</v-icon>
                    </v-btn>
                </template>
            </v-tooltip>

            <v-tooltip text="Add New Question" location="bottom">
                <template v-slot:activator="{ props }">
                    <v-btn icon v-bind="props" @click="createQuestionModal = true">
                        <v-icon>mdi-plus-circle</v-icon>
                    </v-btn>
                </template>
            </v-tooltip>
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
                <v-textarea auto-grow label="Message" variant="outlined" v-model="currentMessageData.text"></v-textarea>

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
                                    <v-alert type="warning" color="grey" title="Knowledge Gap"
                                        text="There is no information in the current knowledge base to answer this question confidently."></v-alert>
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
    </v-container>
</template>

<script setup>
    //
</script>


<script>
export default {
    data: () => {
        return {
            search: null,
            showSearchInput: false,
            breadcrumb: [],
            messages: [],
            createMessageModal: false,
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
        handleSearchBlur() {
            if (this.search === '' || this.search === null) {
                this.showSearchInput = false;
            }
        },
        handleSearchIconClick() {
            this.showSearchInput = true
            this.$refs.search.focus();
        },
        navigateTo(node) {
            this.currentMessage = node;
        },
        analyzeMessage() {
            const _this = this;
            this.analyzingMessage = true;

            this.$api.ai
                .analyzeMessageContent(this.currentMessage.uuid)
                .then((data) => {
                    _this.currentMessageData = data;
                    _this.analyzingMessage = false;
                });
        },
        createMessage() {
            const _this = this;

            this.$api.messages
                .createMessage(this.newMessage)
                .then((message) => {
                    _this.messages.unshift(message);
                    _this.currentMessage = message;
                    _this.currentMessageData = message;

                    // Closing the dialog & resetting the form
                    _this.createMessageModal = false;
                    _this.newMessage = null;
                });
        },
        openMessage(message) {
            const _this = this;

            this.$api.messages.readMessage(message.uuid).then((response) => {
                _this.currentMessage = message;
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