<template>
  <v-container class="fill-height">
    <v-app-bar>
      <template v-slot:prepend>
        <v-icon icon="mdi-tape-drive"></v-icon>
      </template>

      <v-app-bar-title>
        <v-breadcrumbs :items="breadcrumb" density="compact" class="pl-0">
          <template v-slot:title="{ item }">
            <span class="clickable" @click="openFolder(item.node)">{{ item.title }}</span>
          </template>
        </v-breadcrumbs>
      </v-app-bar-title>

      <template v-slot:append>
        <v-tooltip v-if="!currentDocument" text="Add New Folder" location="bottom">
          <template v-slot:activator="{ props }">
            <v-btn icon v-bind="props" @click="createFolderModal = true">
              <v-icon>mdi-folder-plus</v-icon>
            </v-btn>
          </template>
        </v-tooltip>

        <v-tooltip v-if="!currentDocument" text="Add New Document" location="bottom">
          <template v-slot:activator="{ props }">
            <v-btn icon v-bind="props" @click="createDocumentModal = true">
              <v-icon>mdi-clipboard-plus-outline</v-icon>
            </v-btn>
          </template>
        </v-tooltip>

        <v-tooltip v-if="!currentDocument" text="Upload From Computer" location="bottom">
          <template v-slot:activator="{ props }">
            <v-btn icon v-bind="props" @click="uploadDocumentModal = true">
              <v-icon>mdi-upload</v-icon>
            </v-btn>
          </template>
        </v-tooltip>

        <v-tooltip v-if="currentDocument" text="Save Changes" location="bottom">
          <template v-slot:activator="{ props }">
            <v-btn icon v-bind="props" @click="saveDocumentChanges">
              <v-icon>mdi-content-save</v-icon>
            </v-btn>
          </template>
        </v-tooltip>

        <v-tooltip v-if="currentDocument" text="Delete Document" location="bottom">
          <template v-slot:activator="{ props }">
            <v-btn icon v-bind="props" @click="deleteCurrentDocument">
              <v-icon>mdi-trash-can</v-icon>
            </v-btn>
          </template>
        </v-tooltip>

        <v-tooltip v-if="!currentDocument && currentFolder && currentFolder.children.length === 0" text="Delete Folder"
          location="bottom">
          <template v-slot:activator="{ props }">
            <v-btn icon v-bind="props" @click="deleteCurrentFolder">
              <v-icon>mdi-trash-can</v-icon>
            </v-btn>
          </template>
        </v-tooltip>
      </template>
    </v-app-bar>

    <v-responsive v-if="!currentDocument" class="align-left fill-height">
      <v-container>
        <div class="text-overline pb-2">Folders</div>

        <v-item-group>
          <v-row v-if="currentFolderHasChildren('folder')">
            <v-col v-for="folder in getCurrentFolderChildren('folder')" :key="folder.uuid" cols="12" md="3">
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
                There are no folders in your knowledge folder.
              </p>
              <v-btn @click="createFolderModal = true">Create First Folder</v-btn>
            </div>
          </v-sheet>
        </v-item-group>
      </v-container>

      <v-container v-if="currentFolder">
        <div class="text-overline pb-2">Documents</div>

        <v-list lines="two" v-if="currentFolderHasChildren('document')">
          <v-list-item v-for="document in getCurrentFolderChildren('document')" :key="document.uuid" :title="document.name"
            @click="openDocument(document)" :subtitle="getDocumentLastModified(document)">
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
                  <v-list-item @click="openDocument(document)">
                    <v-list-item-title>Edit</v-list-item-title>
                  </v-list-item>
                  <v-list-item @click="deleteDocument(document)">
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
              There are no documents in the "{{ currentFolder.name }}" folder.
            </p>
            <v-btn @click="createDocumentModal = true">Create First Document</v-btn>
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

      <v-dialog v-model="createDocumentModal" transition="dialog-bottom-transition" width="500">
        <v-card>
          <v-toolbar title="Create New Document"></v-toolbar>
          <v-card-text>

            <div class="text-overline">Create Manually</div>
            <v-text-field v-model="newDocumentName" :rules="[inputValidationRules.required]" variant="outlined"
              label="Document Name*">
            </v-text-field>
          </v-card-text>
          <v-card-actions class="justify-end">
            <v-btn variant="text" @click="createDocument">Create</v-btn>
            <v-btn variant="text" @click="createDocumentModal = false">Close</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog v-model="uploadDocumentModal" transition="dialog-bottom-transition" width="500">
        <v-card>
          <v-toolbar title="Upload From Computer"></v-toolbar>
          <v-card-text>
            <v-file-input
              v-model="uploadDocumentPath"
              label="Select Document"
              variant="outlined"
              accept=".txt,.md"
              hint="Current allowed only .txt and .md file formats"
            ></v-file-input>
          </v-card-text>
          <v-card-actions class="justify-end">
            <v-btn variant="text" @click="uploadDocument">Upload</v-btn>
            <v-btn variant="text" @click="uploadDocumentModal = false">Close</v-btn>
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
        <div class="text-overline pb-2">Document Name</div>

        <v-text-field v-model="currentDocumentData.name" label="Document Title" variant="outlined"></v-text-field>
      </v-container>

      <v-container>
        <div class="text-overline pb-2">Content</div>

        <v-textarea v-model="currentDocumentData.text" auto-grow label="Content" variant="outlined"></v-textarea>
      </v-container>

      <v-container v-if="hasIndexedQuestions">
        <div class="text-overline pb-2">Indexed Questions</div>

        <v-expansion-panels>
          <v-expansion-panel v-for="(question, index) in currentDocumentData.questions" :key="index">
            <v-expansion-panel-title>
              <v-icon v-if="question.uuid">mdi-check</v-icon>
              <v-icon v-else>mdi-information-symbol</v-icon>
              <span class="ml-2">{{ question.text }}</span>
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <v-textarea v-if="question.uuid" label="Answer" v-model="currentDocumentData.questions[index].answer" auto-grow variant="outlined" class="mt-6"></v-textarea>
              <v-alert
                v-else
                color="grey-lighten-3"
                title="Do you find this question useful?"
                class="mt-2 mb-4"
                text="Let's index it. The system will generate a concise answer to this question that you can adjust if necessary."
              ></v-alert>

              <div class="d-flex justify-end">
                <v-btn variant="text" @click="deleteQuestion(question)">Delete</v-btn>
                <v-btn variant="outlined" class="ml-2" v-if="question.uuid" @click="saveDocumentChanges()">Update</v-btn>
                <v-btn variant="outlined" class="ml-2" v-else :disabled="isIndexingQuestion(question)" @click="indexQuestion(question)">{{ isIndexingQuestion(question) ? 'Indexing...' : 'Index' }}</v-btn>
              </div>
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
            <v-btn @click="analyzeDocumentContent">Analyze Content</v-btn>
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

    <v-dialog v-model="deleteDocumentModal" transition="dialog-bottom-transition" width="400">
      <v-card>
        <v-toolbar title="Delete Document"></v-toolbar>
        <v-card-text>
          <v-alert type="warning" prominent variant="outlined">
            You are about to delete the <strong v-if="selectedDocument">"{{ selectedDocument.name }}"</strong> document. Please confirm.
          </v-alert>
        </v-card-text>
        <v-card-actions class="justify-end">
          <v-btn variant="text" @click="deleteSelectedDocument">Delete</v-btn>
          <v-btn variant="text" @click="deleteDocumentModal = false">Close</v-btn>
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
    currentDocument: null,
    uploadDocumentPath: null,
    currentDocumentData: {},
    createFolderModal: false,
    createDocumentModal: false,
    deleteFolderModal: false,
    deleteDocumentModal: false,
    uploadDocumentModal: false,
    newFolderName: null,
    newDocumentName: null,
    showSuccessMessage: false,
    successMessage: null,
    analyzingContent: false,
    // The selected folder/document is the one that is selected from inline action
    selectedFolder: null,
    selectedDocument: null,
    indexingQuestions: [],

    inputValidationRules: {
      required: value => !!value || 'Required.',
      folderName: value => {
        return /^[a-zA-Z\s\d\-]+$/.test(value) || 'Only a-zA-Z0-9 and - allowed.'
      }
    },
    breadcrumb: [{ title: '...'}],
    drawer: null
  }),
  computed: {
    hasIndexedQuestions() {
      return this.currentDocumentData
        && this.currentDocumentData.questions
        && this.currentDocumentData.questions.length > 0;
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
      this.currentFolder       = folder;
      this.currentDocument     = null;
      this.currentDocumentData = {};
    },
    openDocument(document) {
      const _this          = this;
      this.currentDocument = document;

      this.$api.documents
        .readDocument(document.uuid)
        .then((response) => {
          // Show the newly created document
          _this.currentDocumentData = response;
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

      this.$api.documents
        .deleteFolder(this.selectedFolder.uuid)
        .then(() => {
          // Remove the folder from the list
          const parent = _this.selectedFolder.parent;

          parent.children = parent.children.filter(
            f => f.uuid !== _this.selectedFolder.uuid
          );

          if (_this.currentFolder === _this.selectedFolder) {
            _this.currentFolder = _this.selectedFolder.parent;
          }

          // Closing the modal & resetting the selecting
          _this.deleteFolderModal = false;
          _this.selectedFolder    = null;
        });
    },
    deleteDocument(document) {
      this.selectedDocument     = document;
      this.deleteDocumentModal  = true;
    },
    deleteCurrentDocument() {
      this.selectedDocument    = this.currentDocument;
      this.deleteDocumentModal = true;
    },
    deleteSelectedDocument() {
      const _this = this;

      this.$api.documents
        .deleteDocument(this.selectedDocument.uuid)
        .then(() => {
          // Remove the folder from the list
          const parent = _this.selectedDocument.parent;

          parent.children = parent.children.filter(
            f => f.uuid !== _this.selectedDocument.uuid
          );

          // Are we deleting from the edit document view?
          if (_this.currentDocument === _this.selectedDocument) {
            _this.currentFolder   = _this.selectedDocument.parent;
            _this.currentDocument = null;
          }

          // Closing the modal & resetting the selecting
          _this.deleteDocumentModal = false;
          _this.selectedDocument    = null;
        });
    },
    deleteQuestion(question) {
      this.currentDocumentData.questions = this.currentDocumentData.questions.filter(
        q => q.text !== question.text
      );

      this.saveDocumentChanges();
    },
    createFolder() {
      const _this = this;
      const name  = this.newFolderName;

      console.log(this.currentFolder);

      this.$api.documents
        .createFolder(this.currentFolder.uuid, name)
        .then((folder) => {
          console.log(folder);
          _this.currentFolder.children.push(folder);

          // Set the parent node for the newly created folder
          folder.parent = _this.currentFolder;

          // Closing the modal & resetting the form
          _this.createFolderModal = false;
          _this.newFolderName     = null;
        });
    },
    createDocument() {
      const _this = this;
      const name  = this.newDocumentName;

      this.$api.documents
        .createDocument(this.currentFolder.uuid, name)
        .then((document) => {
          _this.currentFolder.children.push(document);

          // Set the parent node for the newly created document
          document.parent = _this.currentFolder;

          // Closing the modal & resetting the form
          _this.createDocumentModal = false;
          _this.newFolderName       = null;

          // Show the newly created document
          _this.openDocument(document);
        });
    },
    uploadDocument() {
      const _this = this;

      this.$api.documents
        .uploadDocument(this.currentFolder.uuid, this.uploadDocumentPath[0].path)
        .then((document) => {
          if (document !== null) {
            _this.currentFolder.children.push(document);

            // Set the parent node for the newly created document
            document.parent = _this.currentFolder;

            // Closing the modal & resetting the form
            _this.uploadDocumentModal = false;
            _this.uploadDocumentPath  = null;

            // Show the newly created document
            _this.openDocument(document);
          }
        });
    },
    saveDocumentChanges() {
      const _this = this;

      this.$api.documents
        .updateDocument(this.currentDocument.uuid, {
          name: this.currentDocumentData.name,
          text: this.currentDocumentData.text,
          questions: JSON.parse(JSON.stringify(this.currentDocumentData.questions))
        })
        .then((document) => {
          _this.currentDocument = Object.assign(_this.currentDocument, document);

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
      let bottom = this.currentDocument ?? this.currentFolder;

      if (bottom) { // Did we select the root?
        do {
          response.push({
            title: bottom.name,
            node: bottom
          });

          bottom = bottom.parent;
        } while (bottom);
      }

      this.breadcrumb = response.reverse();
    },
    getDocumentLastModified(document) {
      const prefix = document.updatedAt ? 'Last Updated: ' : 'Created: ';

      const time = document.updatedAt || document.createdAt;

      return prefix + (new Date(time)).toLocaleDateString(
        'en-us',
        { weekday:"long", year:"numeric", month:"short", day:"numeric"}
      );
    },
    analyzeDocumentContent() {
      const _this = this;

      this.analyzingContent = true;

      this.$api.ai
        .analyzeDocumentContent(this.currentDocument.uuid)
        .then((document) => {
          _this.currentDocumentData = document;
          _this.analyzingContent    = false;
        });
    },
    indexQuestion(question) {
      this.indexingQuestions.push(question);

      const _this = this;

      this.$api.ai
        .indexDocumentQuestion(question.text, this.currentDocument.uuid)
        .then((response) => {
          // Remove it from indexing array
          _this.indexingQuestions = _this.indexingQuestions.filter(
            q => q !== question
          );

          // Indexed question position
          const position = _this.currentDocumentData.questions.indexOf(question);

          // Replacing the question with result
          _this.currentDocumentData.questions[position] = response;

          this.saveDocumentChanges();
        });
    },
    isIndexingQuestion(question) {
      return this.indexingQuestions.includes(question);
    }
  },
  watch: {
    currentFolder() {
      this.assembleBreadcrumb();
    },
    currentDocument() {
      this.assembleBreadcrumb();
    }
  },
  mounted() {
    const _this = this;

    this.$api.documents.getDocumentTree().then((response) => {
      _this.documentTree  = _this.prepareDocumentTree(response);
      _this.currentFolder = response;

      _this.assembleBreadcrumb();
    });
  }
}
</script>

<style scoped>
.clickable {
  cursor: pointer;
}
</style>
