<template>
    <v-container class="fill-height">
        <v-container>
            <v-text-field label="Document Title" variant="outlined"></v-text-field>

            <v-textarea auto-grow label="Content" variant="outlined"></v-textarea>

            <v-sheet class="d-flex justify-end">
                <v-btn variant="tonal">Button</v-btn>
            </v-sheet>
        </v-container>

        <v-container>
            <v-expansion-panels>
                <v-expansion-panel v-for="i in 3" :key="i"
                    title="How are drafted transactions associated with license keys?"
                    text="Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat."></v-expansion-panel>
            </v-expansion-panels>
        </v-container>
    </v-container>
</template>