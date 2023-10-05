<template>
    <v-container class="fill-height">
        <v-app-bar>
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

            <v-text-field
                v-if="showSearchInput && !currentTuning"
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
            <v-tooltip v-else-if="!currentTuning" text="Search Question" location="bottom">
                <template v-slot:activator="{ props }">
                    <v-btn icon v-bind="props" @click="showSearchInput = true">
                        <v-icon>mdi-magnify</v-icon>
                    </v-btn>
                </template>
            </v-tooltip>
            <v-tooltip v-if="currentTuning" text="Offload Batch" location="bottom">
                <template v-slot:activator="{ props }">
                    <v-btn icon v-bind="props" @click="createCurriculumModal = true">
                        <v-icon>mdi-progress-upload</v-icon>
                    </v-btn>
                </template>
            </v-tooltip>
            <v-tooltip v-if="currentTuning" text="Add New Curriculum" location="bottom">
                <template v-slot:activator="{ props }">
                    <v-btn icon v-bind="props" @click="createCurriculumModal = true">
                        <v-icon>mdi-text-box-plus-outline</v-icon>
                    </v-btn>
                </template>
            </v-tooltip>
            <v-tooltip v-if="currentTuning" text="Save Tuning" location="bottom">
                <template v-slot:activator="{ props }">
                <v-btn icon v-bind="props" @click="saveTuningChanges">
                    <v-icon>mdi-content-save</v-icon>
                </v-btn>
                </template>
            </v-tooltip>
            <v-tooltip v-if="currentTuning" text="Delete Tuning" location="bottom">
                <template v-slot:activator="{ props }">
                <v-btn icon v-bind="props" @click="deleteCurrentTuning">
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
                <div class="text-overline pb-2">Batch ID</div>
                <v-text-field :value="currentTuning.uuid" readonly variant="outlined"></v-text-field>

                <div class="text-overline pb-2">Base LLM Model</div>
                <v-select
                    v-model="currentTuningData.base_model"
                    return-object
                    variant="outlined"
                    :items="supportedFineTuningModels"
                ></v-select>

                <div class="text-overline pb-2">Curriculum</div>

                <v-expansion-panels>
                    <v-expansion-panel v-for="(curriculum, index) in currentTuningData.queue" :key="index">
                        <v-expansion-panel-title>
                            <span class="ml-2">{{ curriculum.text }}</span>
                        </v-expansion-panel-title>

                        <v-expansion-panel-text>
                            <v-textarea
                                label="Answer"
                                variant="outlined"
                                readonly
                                auto-grow
                                class="mt-6"
                                v-model="curriculum.answer"
                            ></v-textarea>
                        </v-expansion-panel-text>
                    </v-expansion-panel>
                </v-expansion-panels>
            </v-container>
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
            tuningList: [],
            currentTuning: null,
            currentTuningData: {},
            supportedFineTuningModels: []
        }
    },
    methods: {
        handleSearchBlur() {
            if (this.search === '' || this.search === null) {
                this.showSearchInput = false;
            }
        },
        navigateTo(node) {
            this.currentTuning = node;
        },
        openTuning(tuning) {
            const _this = this;

            this.$api.tuning.readTuning(tuning.uuid).then((response) => {
                _this.currentTuning     = tuning;
                _this.currentTuningData = response;
            });
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
</style>