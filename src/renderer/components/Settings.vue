<template>
    <v-container class="fill-height">
        <v-app-bar>
            <template v-slot:prepend>
                <v-icon size="small" icon="mdi-cog-outline"></v-icon>
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
                        <v-text-field v-model="settings.apiKey" label="OpenAI API Key" placeholder="sk-****"
                            hint="Insert your OpenAI API key. It should start with sk-"></v-text-field>
                    </v-col>
                </v-row>

                <v-snackbar v-model="showSuccessMessage">
                    {{ successMessage }}

                    <template v-slot:actions>
                        <v-btn variant="text" @click="showSuccessMessage = false">
                            Close
                        </v-btn>
                    </template>
                </v-snackbar>
            </v-container>
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
                } else {
                    settings[property] = value;
                }
            }

            this.$api.core
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

        this.$api.core.readSettings().then((response) => {
            _this.settings  = response;
        });
    }
}
</script>