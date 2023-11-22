<template>
    <v-container class="fill-height">
        <v-app-bar color="deep-purple-lighten-1">
            <template v-slot:prepend>
                <v-icon icon="mdi-cog-outline"></v-icon>
            </template>

            <v-app-bar-title class="title">Authorize</v-app-bar-title>
        </v-app-bar>

        <v-responsive class="align-left fill-height">
            <v-container>
                {{ queryParams }}
            </v-container>
        </v-responsive>
    </v-container>
</template>

<script>
export default {
    methods: {
        queryParams() {
            console.log(this.$route.query);
        }
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