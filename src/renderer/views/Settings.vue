<template>
    <v-container class="fill-height">
        <v-app-bar color="deep-purple-lighten-1">
            <template v-slot:prepend>
                <v-icon icon="mdi-cog-outline"></v-icon>
            </template>

            <v-app-bar-title class="title">Settings</v-app-bar-title>

            <template v-slot:append>
                <v-btn icon @click="saveSettings">
                    <v-icon>mdi-content-save</v-icon>
                </v-btn>
            </template>
        </v-app-bar>

        <v-responsive class="align-left fill-height">
            <v-container>
                <v-tabs
                    v-model="tab"
                    color="grey"
                    align-tabs="left"
                >
                    <v-tab value="openai">OpenAI</v-tab>
                    <v-tab v-if="settings.apiKey" value="persona">Persona</v-tab>
                    <v-tab v-if="settings.apiKey" value="application">Application</v-tab>
                    <v-tab v-if="settings.apiKey" value="email">Email Connector</v-tab>
                </v-tabs>
                <v-window v-model="tab">
                    <v-window-item value="openai" class="pt-6">
                        <v-text-field
                            v-model="settings.apiKey"
                            label="OpenAI API Key"
                            placeholder="sk-****"
                            persistent-hint
                            variant="outlined"
                            hint="The OpenAI API key. It should start with sk-"
                        ></v-text-field>
                        <v-select
                            v-if="settings.apiKey"
                            v-model="settings.llmModel"
                            label="LLM Model"
                            class="mt-6"
                            hint="Select the LLM model to use. Default is GPT-3.5"
                            persistent-hint
                            return-object
                            variant="outlined"
                            :items="supportedLlmModels"
                        ></v-select>
                    </v-window-item>
                    <v-window-item value="persona" class="pt-6">
                        <v-text-field
                            v-model="settings.persona.name"
                            class="mt-4"
                            label="Persona Name"
                            variant="outlined"
                            persistent-hint
                            hint="How should we call this persona?"
                        ></v-text-field>

                        <v-textarea
                            class="mt-4"
                            label="Persona Description"
                            v-model="settings.persona.description"
                            auto-grow
                            variant="outlined"
                            persistent-hint
                            hint="How would you describe "
                        ></v-textarea>

                        <v-textarea
                            class="mt-4"
                            label="Answer Constraint"
                            v-model="settings.persona.constraint"
                            auto-grow
                            variant="outlined"
                            persistent-hint
                            hint="Limit what LLM model can use in the message response (e.g. allow referring only to specific WordPress plugins)"
                        ></v-textarea>
                    </v-window-item>
                    <v-window-item value="application" class="pt-6">
                        <span class="text-caption">Similarity Distance</span>
                        <v-slider
                            v-model="settings.similarityDistance"
                            :thumb-size="24"
                            thumb-label="always"
                            step="1"
                            persistent-hint
                            hint="What degree of similarity between two questions should be considered as indicative of them being similar?"
                        ></v-slider>
                        <v-text-field
                            class="mt-6"
                            variant="outlined"
                            label="Application Data Location"
                            prepend-inner-icon="mdi-folder"
                            v-model="settings.appDataFolder"
                            persistent-hint
                            hint="The location were all application data is stored."
                        ></v-text-field>
                    </v-window-item>
                    <v-window-item value="email" class="pt-6">
                        <span class="text-caption">Email Provider</span>
                        <v-select :items="['Gmail']"></v-select>
                        <v-btn variant="tonal" size="large" @click="redirectToAuth" prepend-icon="mdi-gmail" class="my-2" >Connect Gmail Account</v-btn>
                    </v-window-item>
                </v-window>
            </v-container>

            <v-snackbar v-model="showSuccessMessage">
                {{ successMessage }}

                <template v-slot:actions>
                    <v-btn variant="text" @click="showSuccessMessage = false">
                        Close
                    </v-btn>
                </template>
            </v-snackbar>
        </v-responsive>
    </v-container>
</template>

<script>
export default {
    data: () => ({
        tab: 'openai',
        settings: {},
        supportedLlmModels: [],
        supportedFineTuningModels: [],
        showSuccessMessage: false
    }),
    methods: {
        saveSettings() {
            const _this = this;

            // Prepare the array of settings
            const settings = {};

            for(const property in this.settings) {
                const value = this.settings[property];
                if (property === 'apiKey') {
                    if (/^sk-[a-zA-Z\d]+$/.test(value) || value === '') {
                        settings[property] = value;
                    }
                } else if (property === 'persona') {
                    settings[property] = value.map(p => ({
                        name: p.name,
                        description: p.description,
                        constraint: p.constraint
                    }));
                } else {
                    settings[property] = value;
                }
            }

            this.$api.settings
                .saveAppSettings(settings)
                .then((response) => {
                    _this.successMessage     = 'Settings saved!'
                    _this.showSuccessMessage = true;
                    _this.settings           = response;

                    _this.reload();
                });
        },
        redirectToAuth() {
            this.$api.email.redirectToAuth();
        },
        reload() {
            const _this = this;

            if (this.settings.apiKey) {
                this.$api.ai.getLlmModelList().then((response) => {
                    _this.supportedLlmModels = response;
                }).catch((error) => {
                    console.log(error);
                });
            }
        }
    },
    mounted() {
        const _this = this;

        this.$api.settings.getAppSettings().then((response) => {
            _this.settings = response;

            _this.reload();
        }).catch((error) => {
            console.log(error);
        });

        this.$api.settings.getAppSetting('gmail-auth-token').then((response) => {
            console.log(response);
        }).catch((error) => {
            console.log(error);
        });
    }
}
</script>

<style scoped>
.v-slider.v-input--horizontal {
    margin-inline-start: 0;
    margin-inline-end: 0;
}

.v-slider.v-input--horizontal .v-input__details {
    padding-inline-start: 16px;
    padding-inline-end: 16px;
}
.title {
  font-size: 0.9rem;
}
</style>