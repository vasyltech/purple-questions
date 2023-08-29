<template>
    <v-navigation-drawer v-model="drawer">
        <v-sheet color="grey-lighten-4" class="pa-4 text-center">
            <v-avatar color="grey-darken-1" size="64">
                <v-icon color="grey">mdi-help-circle</v-icon>
            </v-avatar>
        </v-sheet>

        <v-divider></v-divider>

        <v-list>
            <v-list-item v-for="[icon, text, href] in links" :key="icon" :prepend-icon="icon" :title="text" :to="href"
                ></v-list-item>
        </v-list>

        <template v-slot:append>
            <v-sheet color="grey-lighten-4" class="pa-4 text-center">
                ---
            </v-sheet>
        </template>
    </v-navigation-drawer>
</template>

<script>
export default {
    data: () => ({
        drawer: null,
        links: [
            ['mdi-tape-drive', 'Documents', '/'],
            // ['mdi-progress-question', 'Questions', '/questions'],
            ['mdi-message-processing-outline', 'Messages', '/messages'],
            ['mdi-cog-outline', 'Settings', '/settings']
        ],
    }),
}
</script>