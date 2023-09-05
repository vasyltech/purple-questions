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
                class="mt-6 mr-2"
            ></v-text-field>
            <v-tooltip v-else text="Search Question" location="bottom">
                <template v-slot:activator="{ props }">
                    <v-btn icon v-bind="props" @click="showSearchInput = true">
                        <v-icon>mdi-magnify</v-icon>
                    </v-btn>
                </template>
            </v-tooltip>
            <v-tooltip v-if="currentQuestion" text="Save Question" location="bottom">
                <template v-slot:activator="{ props }">
                <v-btn icon v-bind="props" @click="saveQuestionChanges">
                    <v-icon>mdi-content-save</v-icon>
                </v-btn>
                </template>
            </v-tooltip>

            <v-tooltip v-if="currentQuestion" text="Delete Question" location="bottom">
                <template v-slot:activator="{ props }">
                <v-btn icon v-bind="props" @click="deleteCurrentQuestion">
                    <v-icon>mdi-trash-can</v-icon>
                </v-btn>
                </template>
            </v-tooltip>
        </v-app-bar>

        <v-responsive class="align-left fill-height">
            <v-container v-if="!currentQuestion">
                <v-card>
                    <v-virtual-scroll v-if="questions.length" :items="questions" item-height="96">
                        <template v-slot:default="{ item }">
                            <v-list-item @click="openQuestion(item)" lines="two">
                                <v-list-item-title>{{ item.text }}</v-list-item-title>
                                <v-list-item-subtitle>{{ getQuestionDate(item) }}</v-list-item-subtitle>
                                <template v-slot:append>
                                    <v-menu location="left">
                                        <template v-slot:activator="{ props }">
                                        <v-btn icon="mdi-dots-vertical" color="grey-lighten-1" variant="text" v-bind="props"></v-btn>
                                        </template>

                                        <v-list>
                                        <v-list-item @click="openQuestion(item)">
                                            <v-list-item-title>Open</v-list-item-title>
                                        </v-list-item>
                                        <v-list-item @click="deleteQuestion(item)">
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
                                There are no questions in your knowledge base.
                            </p>
                        </div>
                    </v-sheet>
                </v-card>
            </v-container>

            <v-container v-else>
                <v-container>
                    <div class="text-overline pb-2">Question</div>

                    <v-text-field :value="currentQuestionData.text" readonly variant="outlined"></v-text-field>
                </v-container>

                <v-container>
                    <div class="text-overline pb-2">Best Answer</div>

                    <v-textarea v-model="currentQuestionData.answer" auto-grow variant="outlined"></v-textarea>
                </v-container>

                <v-snackbar v-model="showSuccessMessage" :timeout="2000">
                    {{ successMessage }}

                    <template v-slot:actions>
                        <v-btn variant="text" @click="showSuccessMessage = false">
                            Close
                        </v-btn>
                    </template>
                </v-snackbar>
            </v-container>

            <v-dialog v-model="deleteQuestionModal" transition="dialog-bottom-transition" width="550">
                <v-card>
                <v-toolbar title="Delete Question"></v-toolbar>
                <v-card-text>
                    <v-alert type="warning" prominent variant="outlined" color="grey-darken-2">
                        You are about to delete the <strong v-if="selectedQuestion">"{{ selectedQuestion.text }}"</strong> question. This will also remove the question for the index. Please confirm.
                    </v-alert>
                </v-card-text>
                <v-card-actions class="justify-end">
                    <v-btn variant="text" @click="deleteSelectedQuestion">Delete</v-btn>
                    <v-btn variant="text" @click="deleteQuestionModal = false">Close</v-btn>
                </v-card-actions>
                </v-card>
            </v-dialog>
        </v-responsive>
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
            questions: [],
            currentQuestion: null,
            currentQuestionData: {},
            deleteQuestionModal: false,
            selectedQuestion: null,
            successMessage: null,
            showSuccessMessage: false,
            inputValidationRules: {
                required: value => !!value || 'Required.',
            }
        }
    },
    methods: {
        handleSearchBlur() {
            if (this.search === '' || this.search === null) {
                this.showSearchInput = false;
            }
        },
        navigateTo(node) {
            this.currentQuestion = node;
        },
        openQuestion(question) {
            const _this = this;

            this.$api.questions.readQuestion(question.uuid).then((response) => {
                _this.currentQuestion     = question;
                _this.currentQuestionData = response;
            });
        },
        getQuestionDate(question) {
            return (new Date(question.createdAt)).toLocaleDateString(
                'en-us',
                { weekday: "long", year: "numeric", month: "short", day: "numeric" }
            );
        },
        assembleBreadcrumb() {
            const breadcrumb = [{
                title: 'Questions',
                node: null
            }];

            if (this.currentQuestion !== null) {
                breadcrumb.push({
                    title: this.currentQuestion.text.substring(0, 30) + '...'
                })
            }

            this.breadcrumb = breadcrumb;
        },
        deleteQuestion(question) {
            this.selectedQuestion    = question;
            this.deleteQuestionModal = true;
        },
        deleteCurrentQuestion() {
            this.selectedQuestion    = this.currentQuestion;
            this.deleteQuestionModal = true;
        },
        deleteSelectedQuestion() {
            const _this = this;

            this.$api.questions
                .deleteQuestion(this.selectedQuestion.uuid)
                .then(() => {
                    _this.questions = _this.questions.filter(
                        m => m.uuid !== _this.selectedQuestion.uuid
                    );

                // Are we deleting from the edit question view?
                if (_this.currentQuestion === _this.selectedQuestion) {
                    _this.currentQuestion = null;
                }

                // Closing the modal & resetting the selecting
                _this.deleteQuestionModal = false;
                _this.selectedQuestion    = null;
                });
        },
        saveQuestionChanges() {
            const _this = this;

            this.$api.questions
                .updateQuestion(this.currentQuestion.uuid, {
                    text: this.currentQuestionData.text,
                    answer: this.currentQuestionData.answer
                })
                .then(() => {
                    _this.successMessage     = 'Changes saved!';
                    _this.showSuccessMessage = true;
                });
        },
    },
    watch: {
        currentQuestion() {
            this.assembleBreadcrumb();
        },
    },
    mounted() {
        const _this = this;

        this.$api.questions.getQuestions().then((response) => {
            _this.questions = response;
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