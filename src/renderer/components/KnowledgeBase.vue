<template>
  <v-container class="fill-height">
    <v-app-bar>
      <template v-slot:prepend>
        <v-icon size="small" icon="mdi-tape-drive"></v-icon>
      </template>

      <v-app-bar-title>
        <v-breadcrumbs :items="breadcrumb" density="compact" class="pl-0">
          <template v-slot:title="{ item }">
            <span class="clickable" @click="openFolder(item.node)">{{ item.title }}</span>
          </template>
        </v-breadcrumbs>
      </v-app-bar-title>

      <template v-slot:append>
        <v-tooltip v-if="!currentFile" text="Add New Folder" location="bottom">
          <template v-slot:activator="{ props }">
            <v-btn icon v-bind="props" @click="createFolderModal = true">
              <v-icon>mdi-folder-plus</v-icon>
            </v-btn>
          </template>
        </v-tooltip>

        <v-tooltip v-if="!currentFile" text="Add New File" location="bottom">
          <template v-slot:activator="{ props }">
            <v-btn icon v-bind="props" @click="createFileModal = true">
              <v-icon>mdi-clipboard-plus-outline</v-icon>
            </v-btn>
          </template>
        </v-tooltip>

        <v-tooltip v-if="!currentFile" text="Upload From Computer" location="bottom">
          <template v-slot:activator="{ props }">
            <v-btn icon v-bind="props" @click="uploadFileModal = true">
              <v-icon>mdi-upload</v-icon>
            </v-btn>
          </template>
        </v-tooltip>

        <v-tooltip v-if="currentFile" text="Save Changes" location="bottom">
          <template v-slot:activator="{ props }">
            <v-btn icon v-bind="props" @click="saveFileChanges">
              <v-icon>mdi-content-save</v-icon>
            </v-btn>
          </template>
        </v-tooltip>

        <v-tooltip v-if="currentFile" text="Delete File" location="bottom">
          <template v-slot:activator="{ props }">
            <v-btn icon v-bind="props" @click="deleteCurrentFile">
              <v-icon>mdi-trash-can</v-icon>
            </v-btn>
          </template>
        </v-tooltip>

        <v-tooltip v-if="!currentFile && currentFolder && currentFolder.children.length === 0" text="Delete Folder"
          location="bottom">
          <template v-slot:activator="{ props }">
            <v-btn icon v-bind="props" @click="deleteCurrentFolder">
              <v-icon>mdi-trash-can</v-icon>
            </v-btn>
          </template>
        </v-tooltip>
      </template>

      <input ref="uploader" class="d-none" type="file" @change="onFileChanged">
    </v-app-bar>

    <v-responsive v-if="!currentFile" class="align-left fill-height">
      <v-container>
        <div class="text-overline pb-2">Folders</div>

        <v-item-group>
          <v-row v-if="currentFolderHasChildren('folder')">
            <v-col v-for="folder in getCurrentFolderChildren('folder')" :key="folder.path" cols="12" md="3">
              <v-item>
                <v-card class="d-flex pa-4 align-center" dark>
                  <div class="d-flex justify-space-between align-content-center w-100">
                    <div class="clickable" @click="openFolder(folder)">
                      <v-icon>mdi-folder</v-icon>
                      <span class="ml-3">{{ folder.name }}</span>
                    </div>

                    <div>
                      <v-menu location="left">
                        <template v-slot:activator="{ props }">
                          <v-icon color="grey-lighten-1" v-bind="props">mdi-dots-vertical</v-icon>
                        </template>
                        <v-list>
                          <v-list-item @click="openFolder(folder)">
                            <v-list-item-title>Select</v-list-item-title>
                          </v-list-item>
                          <v-list-item @click="deleteFolder(folder)" :disabled="folder.children.length > 0">
                            <v-list-item-title>Delete</v-list-item-title>
                          </v-list-item>
                        </v-list>
                      </v-menu>
                    </div>
                  </div>
                </v-card>
              </v-item>
            </v-col>
          </v-row>

          <v-sheet v-else class="d-flex align-center justify-center flex-wrap text-center mx-auto px-4" elevation="1"
            height="200" rounded width="100%">
            <div>
              <p class="text-body-2 mb-4">
                There are no folders in your knowledge directory.
              </p>
              <v-btn @click="createFolderModal = true">Create First Folder</v-btn>
            </div>
          </v-sheet>
        </v-item-group>
      </v-container>

      <v-container v-if="currentFolder">
        <div class="text-overline pb-2">Files</div>

        <v-list lines="two" v-if="currentFolderHasChildren('file')">
          <v-list-item v-for="file in getCurrentFolderChildren('file')" :key="file.name" :title="file.name"
            @click="openFile(file)" :subtitle="getFileLastModified(file)">
            <template v-slot:prepend>
              <v-avatar color="grey">
                <v-icon color="white">mdi-clipboard-text</v-icon>
              </v-avatar>
            </template>

            <template v-slot:append>
              <v-menu location="left">
                <template v-slot:activator="{ props }">
                  <v-btn icon="mdi-dots-vertical" color="grey-lighten-1" variant="text" v-bind="props"></v-btn>
                </template>

                <v-list>
                  <v-list-item @click="openFile(file)">
                    <v-list-item-title>Edit</v-list-item-title>
                  </v-list-item>
                  <v-list-item @click="deleteFile(file)">
                    <v-list-item-title>Delete</v-list-item-title>
                  </v-list-item>
                </v-list>
              </v-menu>
            </template>
          </v-list-item>
        </v-list>

        <v-sheet v-else class="d-flex align-center justify-center flex-wrap text-center mx-auto px-4" elevation="1"
          height="200" rounded width="100%">
          <div>
            <p class="text-body-2 mb-4">
              There are no files in the "{{ currentFolder.name }}" folder.
            </p>
            <v-btn @click="createFileModal = true">Create First File</v-btn>
          </div>
        </v-sheet>
      </v-container>

      <v-dialog v-model="createFolderModal" transition="dialog-bottom-transition" width="400">
        <v-card>
          <v-toolbar title="Create New Folder"></v-toolbar>
          <v-card-text>
            <v-text-field v-model="newFolderName"
              :rules="[inputValidationRules.required, inputValidationRules.folderName]" variant="outlined"
              label="Folder Name*">
            </v-text-field>
          </v-card-text>
          <v-card-actions class="justify-end">
            <v-btn variant="text" @click="createFolder">Create</v-btn>
            <v-btn variant="text" @click="createFolderModal = false">Close</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog v-model="createFileModal" transition="dialog-bottom-transition" width="500">
        <v-card>
          <v-toolbar title="Create New File"></v-toolbar>
          <v-card-text>

            <div class="text-overline">Create Manually</div>
            <v-text-field v-model="newFileName" :rules="[inputValidationRules.required]" variant="outlined"
              label="File Name*">
            </v-text-field>
          </v-card-text>
          <v-card-actions class="justify-end">
            <v-btn variant="text" @click="createFile">Create</v-btn>
            <v-btn variant="text" @click="createFileModal = false">Close</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog v-model="uploadFileModal" transition="dialog-bottom-transition" width="500">
        <v-card>
          <v-toolbar title="Upload From Computer"></v-toolbar>
          <v-card-text>
            <v-file-input
              v-model="uploadFilePath"
              label="Select File"
              variant="outlined"
              accept=".txt,.md"
            ></v-file-input>
          </v-card-text>
          <v-card-actions class="justify-end">
            <v-btn variant="text" @click="uploadFile">Upload</v-btn>
            <v-btn variant="text" @click="uploadFileModal = false">Close</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog v-model="deleteFolderModal" transition="dialog-bottom-transition" width="400">
        <v-card>
          <v-toolbar title="Delete Folder"></v-toolbar>
          <v-card-text>
            <v-alert type="warning" prominent variant="outlined">
              You are about to delete the <strong v-if="selectedFolder">"{{ selectedFolder.name }}"</strong> folder. Please confirm.
            </v-alert>
          </v-card-text>
          <v-card-actions class="justify-end">
            <v-btn variant="text" @click="deleteSelectedFolder">Delete</v-btn>
            <v-btn variant="text" @click="deleteFolderModal = false">Close</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-responsive>

    <v-responsive v-else class="align-left fill-height">
      <v-container>
        <div class="text-overline pb-2">File Name</div>

        <v-text-field v-model="currentFileData.name" label="Document Title" variant="outlined"></v-text-field>
      </v-container>

      <v-container>
        <div class="text-overline pb-2">Content</div>

        <v-textarea v-model="currentFileData.content" auto-grow label="Content" variant="outlined"></v-textarea>
      </v-container>

      <v-container v-if="hasIndexedQuestions">
        <div class="text-overline pb-2">Indexed Questions</div>

        <v-expansion-panels>
          <v-expansion-panel v-for="(question, index) in currentFileData.questions" :key="index" :title="question.text">
            <v-expansion-panel-text>
              <v-textarea :label="question.question" v-model="currentFileData.questions[index].answer" variant="underlined" class="mt-6"></v-textarea>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-container>
      <v-container v-else>
        <v-sheet class="d-flex align-center justify-center flex-wrap text-center mx-auto px-4" elevation="1"
          height="150" rounded width="100%">
          <div v-if="!analyzingContent">
            <p class="text-body-2 mb-4">
              The next step is to analyze the content and index the data.
            </p>
            <v-btn @click="analyzeFileContent">Analyze Content</v-btn>
          </div>
          <div v-else>
            <p class="text-body-2 mb-4">
              Please wait a bit. Depending on the size of the document, it might take a couple of minutes to run
            </p>
            <v-progress-circular
              indeterminate
              color="grey"
            ></v-progress-circular>
          </div>
        </v-sheet>
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

    <v-dialog v-model="deleteFileModal" transition="dialog-bottom-transition" width="400">
      <v-card>
        <v-toolbar title="Delete File"></v-toolbar>
        <v-card-text>
          <v-alert type="warning" prominent variant="outlined">
            You are about to delete the <strong v-if="selectedFile">"{{ selectedFile.name }}"</strong> file. Please confirm.
          </v-alert>
        </v-card-text>
        <v-card-actions class="justify-end">
          <v-btn variant="text" @click="deleteSelectedFile">Delete</v-btn>
          <v-btn variant="text" @click="deleteFileModal = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
export default {
  data: () => ({
    documentTree: {},
    currentFolder: null,
    currentFile: null,
    uploadFilePath: null,
    currentFileData: {},
    createFolderModal: false,
    createFileModal: false,
    deleteFolderModal: false,
    deleteFileModal: false,
    uploadFileModal: false,
    newFolderName: null,
    newFileName: null,
    showSuccessMessage: false,
    successMessage: null,
    analyzingContent: false,
    // The selected folder/file is the one that is selected from inline action
    selectedFolder: null,
    selectedFile: null,

    inputValidationRules: {
      required: value => !!value || 'Required.',
      folderName: value => {
        return /^[a-zA-Z\s\d\-]+$/.test(value) || 'Only a-zA-Z0-9 and - allowed.'
      }
    },
    breadcrumb: [
      {
        title: '...'
      }
    ],
    drawer: null
  }),
  computed: {
    hasIndexedQuestions() {
      return this.currentFileData
        && this.currentFileData.questions
        && this.currentFileData.questions.length > 0;
    }
  },
  methods: {
    currentFolderHasChildren(type) {
      let response = false;

      if (this.currentFolder) {
        response = this.getCurrentFolderChildren(type).length > 0
      }

      return response
    },
    getCurrentFolderChildren(type) {
      const response = [];

      for (let i = 0; i < this.currentFolder.children.length; i++) {
        if (this.currentFolder.children[i].type === type) {
          response.push(this.currentFolder.children[i]);
        }
      }

      return response;
    },
    openFolder(folder) {
      this.currentFolder = folder;
      this.currentFile = null;
      this.currentFileData = {};
    },
    openFile(file) {
      const _this = this;
      this.currentFile = file;

      this.$api.directory
        .readFile(file.path)
        .then((response) => {
          // Show the newly created file
          _this.currentFileData = response;
        });
    },
    deleteFolder(folder) {
      this.selectedFolder    = folder;
      this.deleteFolderModal = true;
    },
    deleteCurrentFolder() {
      this.selectedFolder    = this.currentFolder;
      this.deleteFolderModal = true;
    },
    deleteSelectedFolder() {
      const _this = this;

      this.$api.directory
        .deleteFolder(this.selectedFolder.path)
        .then(() => {
          // Remove the folder from the list
          const parent = _this.selectedFolder.parent;

          parent.children = parent.children.filter(
            f => f.path !== _this.selectedFolder.path
          );

          if (_this.currentFolder === _this.selectedFolder) {
            _this.currentFolder = _this.selectedFolder.parent;
          }

          // Closing the modal & resetting the selecting
          _this.deleteFolderModal = false;
          _this.selectedFolder    = null;
        });
    },
    deleteFile(file) {
      this.selectedFile    = file;
      this.deleteFileModal = true;
    },
    deleteCurrentFile() {
      this.selectedFile    = this.currentFile;
      this.deleteFileModal = true;
    },
    deleteSelectedFile() {
      const _this = this;

      this.$api.directory
        .deleteFile(this.selectedFile.path)
        .then(() => {
          // Remove the folder from the list
          const parent = _this.selectedFile.parent;

          parent.children = parent.children.filter(
            f => f.path !== _this.selectedFile.path
          );

          // Are we deleting from the edit file view?
          if (_this.currentFile === _this.selectedFile) {
            _this.currentFolder = _this.selectedFile.parent;
            _this.currentFile   = null;
          }

          // Closing the modal & resetting the selecting
          _this.deleteFileModal = false;
          _this.selectedFile    = null;
        });
    },
    createFolder() {
      const _this = this;
      const name = this.newFolderName;

      this.$api.directory
        .createFolder(this.currentFolder.path, name)
        .then((folder) => {
          _this.currentFolder.children.push(folder);

          // Set the parent node for the newly created file
          folder.parent = _this.currentFolder;

          // Closing the modal & resetting the form
          _this.createFolderModal = false;
          _this.newFolderName = null;
        });
    },
    createFile() {
      const _this = this;
      const name = this.newFileName;

      this.$api.directory
        .createFile(this.currentFolder.path, name)
        .then((file) => {
          _this.currentFolder.children.push(file);

          // Set the parent node for the newly created file
          file.parent = _this.currentFolder;

          // Closing the modal & resetting the form
          _this.createFileModal = false;
          _this.newFolderName = null;

          // Show the newly created file
          _this.currentFile     = file;
          _this.currentFileData = file;
        });
    },
    uploadFile() {
      const _this = this;

      this.$api.directory
        .uploadFile(this.currentFolder.path, this.uploadFilePath[0].path)
        .then((file) => {
          if (file !== null) {
            _this.currentFolder.children.push(file);

            // Set the parent node for the newly created file
            file.parent = _this.currentFolder;

            // Closing the modal & resetting the form
            _this.uploadFileModal = false;
            _this.uploadFilePath  = null;

            // Show the newly created file
            _this.currentFile     = file;
            _this.currentFileData = file;
          }
        });
    },
    saveFileChanges() {
      const _this = this;

      this.$api.directory
        .updateFile(this.currentFile.path, {
          name: this.currentFileData.name,
          content: this.currentFileData.content
        })
        .then(() => {
          _this.successMessage     = 'Changes saved!';
          _this.showSuccessMessage = true;
        });
    },
    prepareDocumentTree(tree, parent = null) {
      if (tree.type === 'folder') {
        for (let i = 0; i < tree.children.length; i++) {
          this.prepareDocumentTree(tree.children[i], tree);
        }
      }

      tree.parent = parent;

      return tree;
    },
    assembleBreadcrumb() {
      const response = [];
      let bottom = this.currentFile ?? this.currentFolder;

      do {
        response.push({
          title: bottom.name,
          node: bottom
        });

        bottom = bottom.parent;
      } while (bottom);

      this.breadcrumb = response.reverse();
    },
    getFileLastModified(file) {
      const prefix = file.updatedAt ? 'Last Updated: ' : 'Created: ';

      const time = file.updatedAt || file.createdAt;

      return prefix + (new Date(time)).toLocaleDateString(
        'en-us',
        { weekday:"long", year:"numeric", month:"short", day:"numeric"}
      );
    },
    analyzeFileContent() {
      const _this = this;

      this.analyzingContent = true;

      this.$api.ai
        .analyzeFileContent(this.currentFile.path)
        .then((file) => {
          _this.currentFileData  = file;
          _this.analyzingContent = false;
        });
    }
  },
  watch: {
    currentFolder() {
      this.assembleBreadcrumb();
    },
    currentFile() {
      this.assembleBreadcrumb();
    }
  },
  mounted() {
    const _this = this;

    this.$api.directory.getDocumentTree().then((response) => {
      _this.documentTree = _this.prepareDocumentTree(response);
      _this.currentFolder = response;
    });
  }
}
</script>

<style scoped>
.clickable {
  cursor: pointer;
}
</style>
