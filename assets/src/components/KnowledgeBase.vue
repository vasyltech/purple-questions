<template>
  <v-container class="fill-height">
    <v-app-bar>
      <v-app-bar-title>
        <v-breadcrumbs :items="breadcrumb" density="compact">
          <template v-slot:prepend>
            <v-icon size="small" icon="mdi-tape-drive"></v-icon>
          </template>
        </v-breadcrumbs>
      </v-app-bar-title>

      <template v-slot:append>
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

    <v-responsive class="align-left fill-height">
      <v-item-group selected-class="bg-primary">
        <v-container>
          <div class="text-overline pb-2">Folders</div>
          <v-row>
            <v-col v-for="n in 3" :key="n" cols="12" md="3">
              <v-item>
                <v-card class="d-flex pa-4 align-center" dark @click="selectFolder(n)">
                  <div class="d-flex justify-start align-content-center w-100">
                    <div>
                      <v-icon>mdi-folder</v-icon>
                    </div>
                    <div class="align-self-center ml-5">Folder Name {{ n }}</div>
                  </div>
                </v-card>
              </v-item>
            </v-col>
          </v-row>
        </v-container>
      </v-item-group>

      <v-container>
        <div class="text-overline pb-2">Files</div>

        <v-list lines="two">
          <v-list-item v-for="file in files" :key="file.title" :title="file.title" :subtitle="file.subtitle">
            <template v-slot:prepend>
              <v-avatar :color="file.color">
                <v-icon color="white">{{ file.icon }}</v-icon>
              </v-avatar>
            </template>

            <template v-slot:append>
              <v-btn color="grey-lighten-1" icon="mdi-information" variant="text"></v-btn>
            </template>
          </v-list-item>
        </v-list>
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
    isSelecting: false,
    selectedFile: null,
    breadcrumb: [
      {
        title: 'Documents'
      },
      {
        title: 'Link 1',
        disabled: false,
        href: 'breadcrumbs_link_1',
      },
      {
        title: 'Link 2',
        disabled: true,
        href: 'breadcrumbs_link_2',
      },
    ],
    files: [
      {
        color: 'blue',
        icon: 'mdi-clipboard-text',
        subtitle: 'Jan 20, 2014',
        title: 'Vacation itinerary',
      },
      {
        color: 'amber',
        icon: 'mdi-gesture-tap-button',
        subtitle: 'Jan 10, 2014',
        title: 'Kitchen remodel',
      },
    ],
    drawer: null,
    links: [
      ['mdi-inbox-arrow-down', 'Inbox'],
      ['mdi-send', 'Send'],
      ['mdi-delete', 'Trash'],
      ['mdi-alert-octagon', 'Spam'],
    ],
  }),
  methods: {
    selectFolder(folder) {
      console.log(folder);
    },
    handleFileImport() {
      this.isSelecting = true;

      // After obtaining the focus when closing the FilePicker, return the button state to normal
      window.addEventListener('focus', () => {
        this.isSelecting = false
      }, { once: true });

      // Trigger click on the FileInput
      this.$refs.uploader.click();
    },
    onFileChanged(e) {
      this.selectedFile = e.target.files[0];

      // Do whatever you need with the file, liek reading it with FileReader
    },
  }
}
</script>

