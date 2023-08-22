<template>
    <v-container class="fill-height">
        <v-app-bar>
            <v-app-bar-title>Messages</v-app-bar-title>

            <template v-slot:append>
                <v-btn icon>
                    <v-icon>mdi-download-box-outline</v-icon>
                </v-btn>
                <v-btn icon>
                    <v-icon>mdi-plus-circle</v-icon>
                </v-btn>
                <v-btn icon @click="handleFileImport">
                    <v-icon>mdi-import</v-icon>
                </v-btn>
                <v-btn icon>
                    <v-icon>mdi-content-save</v-icon>
                </v-btn>
            </template>

            <input ref="uploader" class="d-none" type="file" @change="onFileChanged">
        </v-app-bar>

        <v-container>
            <v-row>
                <v-col v-for="card in cards" :key="card" cols="12">
                    <v-card>
                        <v-list :items="items" item-props lines="three">
                            <template v-slot:subtitle="{ subtitle }">
                                <div v-html="subtitle"></div>
                            </template>
                            <template v-slot:append>
                                <v-btn color="grey-lighten-1" icon="mdi-information" variant="text"></v-btn>
                            </template>
                        </v-list>
                    </v-card>
                </v-col>
            </v-row>
        </v-container>

        <v-container>
            <v-textarea auto-grow label="Content" variant="outlined"></v-textarea>

            <v-list lines="two">
                <v-list-item v-for="(question, i) in questions" :key="i" :title="question.title" :subtitle="question.subtitle">
                    <template v-slot:append>
                        <v-btn color="grey-lighten-1" icon="mdi-information" variant="text"></v-btn>
                    </template>
                </v-list-item>
            </v-list>

            <v-textarea auto-grow label="Content" variant="outlined"></v-textarea>
        </v-container>

    </v-container>
</template>

<script setup>
    //
</script>


<script>
export default {
    data: () => ({
        cards: ['Today', 'Yesterday'],
        questions: [
            {
                title: 'Question 1',
                subtitle: 'Lipsume...'
            },
            {
                title: 'Question 1',
                subtitle: 'Lipsume...'
            },{
                title: 'Question 1',
                subtitle: 'Lipsume...'
            }
        ],
        items: [
            { type: 'subheader', title: 'Today' },
            {
                prependAvatar: 'https://cdn.vuetifyjs.com/images/lists/1.jpg',
                title: 'Brunch this weekend?',
                subtitle: `<span class="text-primary">Ali Connors</span> &mdash; I'll be in your neighborhood doing errands this weekend. Do you want to hang out?`,
            },
            { type: 'divider', inset: true },
            {
                prependAvatar: 'https://cdn.vuetifyjs.com/images/lists/2.jpg',
                title: 'Summer BBQ',
                subtitle: `<span class="text-primary">to Alex, Scott, Jennifer</span> &mdash; Wish I could come, but I'm out of town this weekend.`,
            },
            { type: 'divider', inset: true },
            {
                prependAvatar: 'https://cdn.vuetifyjs.com/images/lists/3.jpg',
                title: 'Oui oui',
                subtitle: '<span class="text-primary">Sandra Adams</span> &mdash; Do you have Paris recommendations? Have you ever been?',
            },
            { type: 'divider', inset: true },
            {
                prependAvatar: 'https://cdn.vuetifyjs.com/images/lists/4.jpg',
                title: 'Birthday gift',
                subtitle: '<span class="text-primary">Trevor Hansen</span> &mdash; Have any ideas about what we should get Heidi for her birthday?',
            },
            { type: 'divider', inset: true },
            {
                prependAvatar: 'https://cdn.vuetifyjs.com/images/lists/5.jpg',
                title: 'Recipe to try',
                subtitle: '<span class="text-primary">Britta Holt</span> &mdash; We should eat this: Grate, Squash, Corn, and tomatillo Tacos.',
            },
        ]
    })
}
</script>

