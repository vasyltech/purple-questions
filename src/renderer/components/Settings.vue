<template>
    <v-container class="fill-height">
        <v-app-bar>
            <template v-slot:prepend>
                <v-icon icon="mdi-cog-outline"></v-icon>
            </template>

            <v-app-bar-title>Settings</v-app-bar-title>

            <template v-slot:append>
                <v-btn icon @click="saveSettings">
                    <v-icon>mdi-content-save</v-icon>
                </v-btn>
            </template>
        </v-app-bar>

        <v-responsive class="align-left fill-height">
            <v-container>
                <div class="text-overline pb-2">OpenAI Configurations</div>

                <v-row>
                    <v-col cols="12" md="6">
                        <v-text-field
                            v-model="settings.apiKey"
                            label="OpenAI API Key"
                            placeholder="sk-****"
                            persistent-hint
                            hint="The OpenAI API key. It should start with sk-"
                        ></v-text-field>
                    </v-col>
                </v-row>
                <v-row>
                    <v-col cols="12" md="6">
                        <v-select
                            v-model="settings.llmModel"
                            label="LLM Model"
                            hint="Select the LLM model to use. Default is GPT-3.5"
                            persistent-hint
                            return-object
                            :items="supportedLlmModels"
                        ></v-select>
                    </v-col>
                </v-row>
            </v-container>

            <v-container>
                <v-row>
                    <v-col cols="12" md="6">
                        <v-divider></v-divider>

                        <div class="text-overline pt-6 pb-2">Application Configurations</div>
                        <v-text-field
                            variant="outlined"
                            label="Application Data Location"
                            prepend-inner-icon="mdi-folder"
                            v-model="settings.appDataFolder"
                            persistent-hint
                            :hint="`The location were all application data is stored. Default path is ${defaultAppDataFolder}`"
                        ></v-text-field>
                    </v-col>
                </v-row>
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

<script setup>
    //
</script>


<script>
export default {
    data: () => ({
        settings: {},
        showSuccessMessage: false
    }),
    computed: {
        defaultAppDataFolder() {
            return this.settings
                && this.settings._system ? this.settings._system.defaultAppDataFolder : '...';
        },
        supportedLlmModels() {
            return this.settings
                && this.settings._system ? this.settings._system.supportedLlmModels : [];
        }
    },
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
                } else if (property === 'llmModel') {
                    settings[property] = value.value;
                } else if (property !== '_system') {
                    settings[property] = value;
                }
            }

            this.$api.settings
                .saveSettings(settings)
                .then((response) => {
                    _this.successMessage     = 'Settings saved!'
                    _this.showSuccessMessage = true;
                    _this.settings           = response;
                });
        }
    },
    mounted() {
        const _this = this;

        this.$api.settings.readSettings().then((response) => {
            _this.settings = response;
        });
    }
}
</script>