<template>
    <div class="fill-height">
        <v-app-bar color="deep-purple-lighten-1">
            <template v-slot:prepend>
                <v-icon icon="mdi-puzzle"></v-icon>
            </template>

            <v-app-bar-title>
                <v-breadcrumbs :items="breadcrumb" density="compact" class="pl-0">
                    <template v-slot:title="{ item }">
                        <span class="clickable" @click="navigateTo(item.node)">{{ item.title }}</span>
                    </template>
                </v-breadcrumbs>
            </v-app-bar-title>

            <v-spacer></v-spacer>

            <v-tooltip v-if="!currentAddon" text="Add New Add-On" location="bottom">
                <template v-slot:activator="{ props }">
                    <v-btn icon v-bind="props" @click="createMessageModal = true">
                        <v-icon>mdi-message-plus-outline</v-icon>
                    </v-btn>
                </template>
            </v-tooltip>
            <v-tooltip v-if="currentAddon" text="Uninstall AddOn" location="bottom">
                <template v-slot:activator="{ props }">
                <v-btn icon v-bind="props">
                    <v-icon>mdi-trash-can</v-icon>
                </v-btn>
                </template>
            </v-tooltip>
            <v-tooltip v-if="currentAddon" text="Deactivate AddOn" location="bottom">
                <template v-slot:activator="{ props }">
                <v-btn icon v-bind="props">
                    <v-icon>mdi-puzzle-minus</v-icon>
                </v-btn>
                </template>
            </v-tooltip>
            <v-tooltip v-if="currentAddon" text="Save Settings" location="bottom">
                <template v-slot:activator="{ props }">
                <v-btn icon v-bind="props">
                    <v-icon>mdi-content-save</v-icon>
                </v-btn>
                </template>
            </v-tooltip>
        </v-app-bar>

        <v-responsive class="align-left fill-height">
            <v-row no-gutters class="flex-nowrap h-100">
                <v-col cols="4" class="flex-grow-0 flex-shrink-0" style="border-right: 1px solid #CCCCCC; max-height: calc(100vh - 64px); overflow-y: scroll;">
                    <v-toolbar class="px-2" color="grey-lighten-5" style="border-bottom: 1px solid #CCCCCC">
                        <v-text-field
                            density="compact"
                            ref="search"
                            variant="outlined"
                            label="Search..."
                            append-inner-icon="mdi-magnify"
                            v-model="search"
                            class="mt-6"
                        ></v-text-field>
                    </v-toolbar>
                    <v-virtual-scroll v-if="addons.length" :items="addons" item-height="96">
                        <template v-slot:default="{ item }">
                            <v-list-item @click="openAddon(item)" lines="two" :title="item.name" :active="currentAddon === item" color="deep-purple-darken-1">
                                <template v-slot:prepend>
                                    <v-icon size="large" icon="mdi-puzzle"></v-icon>
                                </template>
                                <v-list-item-subtitle>{{ item.description }}</v-list-item-subtitle>
                            </v-list-item>
                        </template>
                    </v-virtual-scroll>
                    <p v-else class="text-center py-4">No addons available</p>
                </v-col>
                <v-col cols="8" v-if="currentAddonData" class="flex-grow-1 flex-shrink-0 pl-6 pr-4 py-4" style="max-height: calc(100vh - 64px); overflow-y: scroll;">
                    <p class="text-overline mb-4">Add-On Configurations</p>

                    <div v-for="(param, index) in currentAddonData.params" :key="index">
                        <v-text-field
                            v-if="param.type === 'secret'"
                            v-model="settings[param.name]"
                            type="password"
                            :label="param.label"
                            variant="outlined"
                        ></v-text-field>
                    </div>
                </v-col>
            </v-row>
        </v-responsive>

        <v-snackbar v-model="showSuccessMessage" :timeout="2000">
            {{ successMessage }}

            <template v-slot:actions>
                <v-btn variant="text" @click="showSuccessMessage = false">
                    Close
                </v-btn>
            </template>
        </v-snackbar>

        <v-dialog v-model="createMessageModal" transition="dialog-bottom-transition" width="600">
            <v-card>
                <v-toolbar color="grey-darken-4" title="Create New Message"></v-toolbar>
                <v-card-text>
                    <v-textarea autofocus label="Message" v-model="newMessage" variant="outlined"></v-textarea>
                </v-card-text>
                <v-card-actions class="justify-end">
                    <v-btn variant="text" @click="createMessage">Create</v-btn>
                    <v-btn variant="text" @click="createMessageModal = false">Close</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <v-dialog v-model="deleteMessageModal" transition="dialog-bottom-transition" width="550">
            <v-card>
                <v-toolbar color="red-darken-4" title="Delete Message"></v-toolbar>
                <v-card-text>
                    <v-alert type="warning" prominent variant="outlined" color="red-darken-4">
                        You are about to delete the <strong v-if="selectedMessage">"{{ selectedMessage.excerpt }}"</strong> message. Please confirm.
                    </v-alert>
                </v-card-text>
                <v-card-actions class="justify-end">
                    <v-btn variant="text" color="red-darken-4" @click="deleteSelectedMessage">Delete</v-btn>
                    <v-btn variant="text" @click="deleteMessageModal = false">Close</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </div>
</template>

<script setup>
    //
</script>

<script>
export default {
    data: () => {
        return {
            breadcrumb: [],
            addons: [],
            settings: {},
            createMessageModal: false,
            deleteMessageModal: false,
            currentAddon: null,
            currentAddonData: null,
            successMessage: null,
            showSuccessMessage: false,
            search: null
        }
    },
    methods: {
        navigateTo(node) {
            this.currentAddon = node;
        },
        getMessageStatusIcon(message) {
            let icon = 'mdi-bell-circle';

            if (message.status === 'done') {
                icon = 'mdi-check-circle';
            }

            return icon;
        },
        openAddon(addon) {
            const _this       = this;
            this.currentAddon = addon;

            this.$api.addons.readAddon(addon.path).then((response) => {
                _this.currentAddonData = response;
            });
        },
        assembleBreadcrumb() {
            const breadcrumb = [{
                title: 'Add-Ons',
                node: null
            }];

            if (this.currentAddon !== null) {
                breadcrumb.push({
                    title: this.currentAddon.name
                })
            }

            this.breadcrumb = breadcrumb;
        }
    },
    watch: {
        currentAddon(addon) {
            this.assembleBreadcrumb();

            if (addon === null) {
                this.showSuccessMessage = false;
            }
        },
    },
    mounted() {
        const _this = this;

        this.$api.addons.getAddons().then((response) => {
            _this.addons = response;

            // Open the first addon on the list
            if (response.length > 0) {
                _this.openAddon(response[0]);
            }
        });

        this.assembleBreadcrumb();
    }
}
</script>

<style scoped>
.clickable {
    cursor: pointer;
}

.answer {
    font-size: 0.85rem;
    border: 1px solid #CCCCCC;
    padding: 10px;
    border-radius: 0.5rem;
    white-space: pre-wrap;
    word-wrap: break-word;
}

.v-breadcrumbs {
  font-size: 0.9rem;
}

.v-expansion-panel-title {
    line-height: 1.25rem;
}
</style>