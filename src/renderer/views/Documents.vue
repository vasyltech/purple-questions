<template>
  <v-container class="fill-height">
    <v-app-bar color="deep-purple-lighten-1">
      <template v-slot:prepend>
        <v-icon icon="mdi-file-document-multiple"></v-icon>
      </template>

      <v-app-bar-title>
        <v-breadcrumbs :items="breadcrumb" density="compact" class="pl-0">
          <template v-slot:title="{ item }">
            <span class="clickable" @click="openFolder(item.node)">{{ item.title }}</span>
          </template>
        </v-breadcrumbs>
      </v-app-bar-title>

      <v-spacer></v-spacer>

      <v-text-field
          v-if="showSearchInput && !currentDocument"
          density="compact"
          ref="search"
          autofocus
          variant="outlined"
          label="Search..."
          append-inner-icon="mdi-magnify"
          @blur="handleSearchBlur"
          v-model="search"
          class="mt-6"
      ></v-text-field>
      <v-tooltip v-else-if="!currentDocument" text="Search Question" location="bottom">
          <template v-slot:activator="{ props }">
              <v-btn icon v-bind="props" @click="showSearchInput = true">
                  <v-icon>mdi-magnify</v-icon>
              </v-btn>
          </template>
      </v-tooltip>

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

      <v-tooltip v-if="currentDocument" text="Save Changes" location="bottom">
        <template v-slot:activator="{ props }">
          <v-btn icon v-bind="props" @click="saveDocumentChanges">
            <v-icon>mdi-content-save</v-icon>
          </v-btn>
        </template>
      </v-tooltip>

      <v-tooltip v-if="currentDocument" :text="hasAssociatedQuestions ? 'Re-Analyze Content' : 'Analyze Content'" location="bottom">
        <template v-slot:activator="{ props }">
          <v-btn icon v-bind="props" @click="analyzeContent" :disabled="analyzingContent">
            <v-icon>mdi-refresh</v-icon>
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
    </v-app-bar>

    <v-responsive v-if="search" class="align-left fill-height">
      <v-container>
        <v-sheet class="d-flex align-center justify-center flex-wrap text-center mx-auto px-4" elevation="0"
            height="150" rounded width="100%" color="grey-lighten-3">
            <div>
              <p class="text-body-2">
                Not yet implemented. Sorry...
              </p>
            </div>
          </v-sheet>
      </v-container>
    </v-responsive>

    <v-responsive v-else-if="!currentDocument" class="align-left fill-height">
      <v-container>
        <div class="text-overline pb-2">Folders</div>

        <v-item-group v-if="currentFolder">
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

          <v-sheet v-else class="d-flex align-center justify-center flex-wrap text-center mx-auto" elevation="0"
            height="150" rounded width="100%" color="grey-lighten-3">
            <div>
              <p class="text-body-2 mb-4">
                There are no folders in the "{{ currentFolder.name }}" folder.
              </p>
              <v-btn @click="createFolderModal = true">Create First Folder</v-btn>
            </div>
          </v-sheet>
        </v-item-group>
      </v-container>

      <v-container v-if="currentFolder">
        <div class="text-overline pb-2">Documents</div>

        <v-list lines="two" class="pa-0" v-if="currentFolderHasChildren('document')">
          <v-list-item v-for="document in getCurrentFolderChildren('document')" :key="document.uuid" :title="document.name"
            @click="openDocument(document)" :subtitle="getDocumentLastModified(document)">
            <template v-slot:prepend>
              <v-avatar color="deep-purple">
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

        <v-sheet v-else class="d-flex align-center justify-center flex-wrap text-center mx-auto px-4" elevation="0"
          height="200" rounded width="100%" color="grey-lighten-3">
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
          <v-toolbar color="grey-darken-4" title="Create New Folder"></v-toolbar>
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

      <v-dialog v-model="createDocumentModal" transition="dialog-bottom-transition" width="550">
        <v-card>
          <v-toolbar color="grey-darken-4" title="Create New Document"></v-toolbar>
          <v-card-text>
            <v-tabs
              v-model="addNewDocumentType"
              color="grey"
              align-tabs="left"
            >
              <v-tab value="manual">Manually</v-tab>
              <v-tab value="upload">Upload File</v-tab>
              <v-tab value="url">From URL</v-tab>
            </v-tabs>

            <v-window v-model="addNewDocumentType">
              <v-window-item value="manual">
                <v-container fluid>
                  <v-text-field
                    v-model="newDocumentName"
                    :rules="[inputValidationRules.required]"
                    variant="outlined"
                    label="Enter Document Name"
                  ></v-text-field>
                </v-container>
              </v-window-item>
              <v-window-item value="upload">
                <v-container fluid>
                  <v-file-input
                    v-model="addNewFile"
                    label="Select Document"
                    variant="outlined"
                    accept=".txt,.md"
                    :rules="[inputValidationRules.required]"
                    persistent-hint
                    hint="Current allowed only .txt and .md file formats"
                  ></v-file-input>
                </v-container>
              </v-window-item>
              <v-window-item value="url">
                <v-container fluid>
                  <v-text-field
                    v-model="addNewUrl"
                    prepend-inner-icon="mdi-link-variant"
                    label="Enter URL"
                    :rules="[inputValidationRules.required]"
                    variant="outlined"
                    persistent-hint
                    hint="Enter valid and accessible URL"
                  ></v-text-field>

                  <v-combobox
                    v-model="addNewUrlSelector"
                    class="mt-4"
                    label="Content Selector"
                    variant="outlined"
                    :items="cachedUrlSelectors"
                    persistent-hint
                    hint="Narrow down what part of the page we should parse. By default converts the entire page to text."
                  ></v-combobox>
                </v-container>
              </v-window-item>
            </v-window>
          </v-card-text>
          <v-card-actions class="justify-end">
            <v-btn variant="text" @click="createDocument">Create</v-btn>
            <v-btn variant="text" @click="createDocumentModal = false">Close</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog v-model="deleteFolderModal" transition="dialog-bottom-transition" width="400">
        <v-card>
          <v-toolbar color="red-darken-4" title="Delete Folder"></v-toolbar>
          <v-card-text>
            <v-alert type="warning" prominent variant="outlined" color="red-darken-4">
              You are about to delete the <strong v-if="selectedFolder">"{{ selectedFolder.name }}"</strong> folder. Please confirm.
            </v-alert>
          </v-card-text>
          <v-card-actions class="justify-end">
            <v-btn variant="text" color="red-darken-4" @click="deleteSelectedFolder">Delete</v-btn>
            <v-btn variant="text" @click="deleteFolderModal = false">Close</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-responsive>

    <v-responsive v-else-if="currentDocumentData" class="align-left fill-height">
      <v-container>
        <div class="text-overline pb-2">Document Name</div>
        <v-text-field v-model="currentDocumentData.name" bg-color="white" variant="outlined"></v-text-field>

        <div class="text-overline pb-2">Document Origin</div>
        <v-text-field v-model="currentDocumentData.origin.link" bg-color="white" variant="outlined"></v-text-field>

        <div class="text-overline pb-2">Content</div>
        <editor v-model="currentDocumentData.text"></editor>
      </v-container>

      <v-container v-if="hasAssociatedQuestions">
        <v-toolbar density="compact">
          <v-toolbar-title class="text-overline">Curriculum</v-toolbar-title>
          <v-spacer></v-spacer>

          <v-tooltip text="Add New Curriculum" location="bottom">
            <template v-slot:activator="{ props }">
              <v-btn icon v-bind="props" @click="showAddQuestionModal = true">
                <v-icon>mdi-plus-box</v-icon>
              </v-btn>
            </template>
          </v-tooltip>
        </v-toolbar>

        <v-list lines="false">
          <v-list-item
            v-for="(question, index) in currentDocumentData.questions"
            :key="index"
            :title="question.text"
            @click="selectQuestionForEditing(question)"
          >
            <template v-slot:prepend>
              <v-icon v-if="question.ft_method">
                {{ question.ft_method === 'shallow' ? 'mdi-memory' : 'mdi-tune-variant'  }}
              </v-icon>
              <v-icon v-else>mdi-information-symbol</v-icon>
            </template>
            <template v-slot:append>
              <v-tooltip text="Edit Curriculum" location="bottom">
                <template v-slot:activator="{ props }">
                  <v-btn icon variant="plain" v-bind="props" @click.stop="selectQuestionForEditing(question)">
                    <v-icon>mdi-pencil</v-icon>
                  </v-btn>
                </template>
              </v-tooltip>
              <v-tooltip text="Delete Curriculum" location="bottom">
                <template v-slot:activator="{ props }">
                  <v-btn icon variant="plain" v-bind="props" @click.stop="selectQuestionForDeletion(question)">
                    <v-icon>mdi-trash-can</v-icon>
                  </v-btn>
                </template>
              </v-tooltip>
            </template>
          </v-list-item>
        </v-list>
      </v-container>
      <v-container v-else>
        <v-sheet class="d-flex align-center justify-center flex-wrap text-center mx-auto px-4" elevation="0"
          height="150" rounded width="100%" color="grey-lighten-3">
          <div v-if="!analyzingContent">
            <p class="text-body-2 mb-4">
              The next step is to analyze the content and fine-tune the data.
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

      <v-dialog v-model="showDeleteQuestionModal" transition="dialog-bottom-transition" width="550">
        <v-card>
          <v-toolbar color="red-darken-4" title="Delete Curriculum"></v-toolbar>
          <v-card-text>
            <v-alert type="warning" prominent variant="outlined" color="red-darken-4">
              You are about to delete the <strong>"{{ selectedQuestion ? selectedQuestion.text : 'unknown' }}"</strong> curriculum.
              Please confirm.
            </v-alert>
          </v-card-text>
          <v-card-actions class="justify-end">
            <v-btn variant="text" color="red-darken-4" @click="deleteSelectedQuestion">Delete</v-btn>
            <v-btn variant="text" @click="showDeleteQuestionModal = false">Close</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog v-model="showAddQuestionModal" transition="dialog-bottom-transition" width="800">
        <v-card>
          <v-toolbar color="grey-darken-4" title="Add New Curriculum"></v-toolbar>
          <v-card-text>
            <v-container>
              <v-text-field label="Subject" v-model="newQuestion" variant="outlined"></v-text-field>
            </v-container>
          </v-card-text>
          <v-card-actions class="justify-end">
            <v-btn variant="text" @click="addNewQuestion">Add</v-btn>
            <v-btn variant="text" @click="showAddQuestionModal = false">Close</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog v-model="showEditQuestionModal" transition="dialog-bottom-transition" fullscreen>
        <v-card>
          <v-toolbar color="grey-darken-4">
            <v-icon class="ml-2" v-if="stagedQuestionData.ft_method">
                {{ stagedQuestionData.ft_method === 'shallow' ? 'mdi-memory' : 'mdi-tune-variant'  }}
              </v-icon>
              <v-icon v-else class="ml-2">mdi-information-symbol</v-icon>
            <v-toolbar-title>Edit Curriculum</v-toolbar-title>
            <v-spacer></v-spacer>
            <v-toolbar-items>
                <v-btn icon @click="showEditQuestionModal = false">
                    <v-icon>mdi-close</v-icon>
                </v-btn>
            </v-toolbar-items>
          </v-toolbar>
          <v-card-text>
            <v-container>
              <v-text-field
                class="mt-6"
                :label="stagedQuestionData.ft_method ? 'Subject (read-only)' : 'Subject'"
                v-model="stagedQuestionData.text"
                :readonly="stagedQuestionData.ft_method ? true : false"
                variant="outlined"
                :hint="stagedQuestionData.ft_method ? 'The curriculum was fine-tuned, thus it cannot be modified' : ''"
              ></v-text-field>


              <editor v-model="stagedQuestionData.answer"></editor>

              <v-radio-group
                class="mt-6"
                v-if="stagedQuestionData.answer"
                v-model="stagedQuestionData.ft_method"
                inline
                label="Fine-Tuning Method"
                persistent-hint
                :hint="stagedQuestionData.ft_method === 'shallow' ? 'Only memorize and include curriculum in prompts' : 'Memorize curriculum and queue for actual model fine-tuning'"
              >
                <v-radio label="Factual Learning" value="shallow"></v-radio>
                <v-radio label="New Skill" value="deep"></v-radio>
              </v-radio-group>
            </v-container>
          </v-card-text>
          <v-card-actions class="justify-end">
            <v-btn
              variant="text"
              color="red-darken-4"
              @click="showDeleteQuestionModal = true"
            >Delete</v-btn>

            <v-btn
              variant="text"
              :disabled="generatingAnswer"
              @click="generateAnswerForSelectedQuestion">
                {{ generatingAnswer ? 'Generating...' : 'Generate Answer' }}
            </v-btn>

            <v-btn v-if="stagedQuestionData.answer && stagedQuestionData.ft_method" variant="text" :disabled="fineTuningQuestion" @click="fineTuneSelectedQuestion">
              {{ fineTuningQuestion ? 'Fine-Tuning...' : 'Fine-Tune' }}
            </v-btn>

            <v-btn variant="text" @click="updateSelectedQuestion">Update</v-btn>

            <v-btn variant="text" @click="showEditQuestionModal = false">Close</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog v-model="analyzeDocumentContentModal" transition="dialog-bottom-transition" width="550">
        <v-card>
          <v-toolbar color="grey-darken-4" title="Re-Analyze Question"></v-toolbar>
          <v-card-text>
            <v-alert type="warning" prominent variant="outlined">
              You are on the verge of reevaluating the content of the current document.
              Unless you opt to combine the new set, all existing questions will be removed.
            </v-alert>

            <v-checkbox hide-details v-model="mergeNewQuestions" label="Merge New Questions"></v-checkbox>
          </v-card-text>
          <v-card-actions class="justify-end">
            <v-btn variant="text" :disabled="analyzingContent" @click="analyzeDocumentContent">{{ analyzingContent ? 'Analyzing...' : 'Analyze' }}</v-btn>
            <v-btn variant="text" @click="analyzeDocumentContentModal = false">Close</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-snackbar v-model="showSuccessMessage" :timeout="2000">
        {{ successMessage }}

        <template v-slot:actions>
            <v-btn variant="text" @click="showSuccessMessage = false">
                Close
            </v-btn>
        </template>
      </v-snackbar>
    </v-responsive>

    <v-dialog v-model="deleteDocumentModal" transition="dialog-bottom-transition" width="450">
      <v-card>
        <v-toolbar color="red-darken-4" title="Delete Document"></v-toolbar>
        <v-card-text>
          <v-alert type="warning" prominent variant="outlined" color="red-darken-4">
            You are about to delete the <strong v-if="selectedDocument">"{{ selectedDocument.name }}"</strong> document.
            {{ hasAssociatedQuestions ? 'All the associated questions will be deleted as well.' : '' }} Please confirm.
          </v-alert>
        </v-card-text>
        <v-card-actions class="justify-end">
          <v-btn variant="text" color="red-darken-4" @click="deleteSelectedDocument">Delete</v-btn>
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
    addNewFile: null,
    currentDocumentData: {},
    createFolderModal: false,
    createDocumentModal: false,
    deleteFolderModal: false,
    deleteDocumentModal: false,
    addNewDocumentType: null,
    cachedUrlSelectors: [],
    addNewUrl: null,
    addNewUrlSelector: null,
    newFolderName: null,
    newDocumentName: null,
    showSearchInput: false,
    search: null,
    showSuccessMessage: false,
    successMessage: null,
    analyzingContent: false,
    showAddQuestionModal: false,
    newQuestion: null,
    analyzeDocumentContentModal: false,

    // Properties to manage question's data
    selectedQuestion: null,
    stagedQuestionData: {},
    showEditQuestionModal: false,
    showDeleteQuestionModal: false,
    generatingAnswer: false,
    fineTuningQuestion: false,

    mergeNewQuestions: true,
    // The selected folder/document is the one that is selected from inline action
    selectedFolder: null,
    selectedDocument: null,
    inputValidationRules: {
      required: value => !!value || 'Required.',
      folderName: value => {
        return /^[a-zA-Z\s\d\-\&\_]+$/.test(value) || 'Only letters, numbers and &, (, ), _, - symbols allowed.'
      }
    },
    breadcrumb: [{ title: '...'}]
  }),
  computed: {
    hasAssociatedQuestions() {
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
      this.currentDocumentData = null;
    },
    openDocument(document) {
      const _this            = this;
      this.currentDocument   = document;

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
          _this.selectedDocument  = null;
        });
    },

    // Question methods
    addNewQuestion() {
      const _this = this;

      // Let first validate that the provided question is legit and is not a
      // duplicate
      const text = this.newQuestion.trim();

      if (text.length
          && (this.currentDocumentData.questions.filter(q => q.text === text).length === 0)
      ) {
        this.$api.documents
          .addQuestionToDocument(this.currentDocument.uuid, { text })
          .then((result) => {
            // Add new question to the list of document questions
            if (result !== false) {
              _this.currentDocumentData.questions.push(result);

              // Reset
              _this.showAddQuestionModal = false;
              _this.newQuestion          = null;
            }
          });
      }
    },
    generateAnswerForSelectedQuestion() {
      const _this           = this;
      this.generatingAnswer = true;

      this.$api.ai
        .prepareAnswerFromDocument(
          this.selectedQuestion.uuid,
          this.stagedQuestionData.text,
          this.currentDocument.uuid
        ).then((response) => {
          _this.selectedQuestion.answer   = response;
          _this.stagedQuestionData.answer = response;
        }).finally(() => {
          _this.generatingAnswer = false;
        });
    },
    selectQuestionForEditing(question) {
      this.selectedQuestion = question;

      // The "staged" question data is used as temporary holder for updated question
      // data
      this.stagedQuestionData = Object.assign({}, question);

      this.showEditQuestionModal = true;
    },
    selectQuestionForDeletion(question) {
      this.selectedQuestion        = question;
      this.showDeleteQuestionModal = true;
    },
    deleteSelectedQuestion() {
      const _this = this;

      this.$api.documents
        .deleteQuestionFromDocument(this.currentDocument.uuid, this.selectedQuestion.uuid)
        .then(() => {
          // Question can be deleted from the show modal as well
          _this.showDeleteQuestionModal = false;
          _this.showEditQuestionModal   = false;

          // Remove the question from the list of document questions
          _this.currentDocumentData.questions = _this.currentDocumentData.questions.filter(
            q => q !== _this.selectedQuestion
          );

          _this.selectedQuestion = null;
        }).catch((e) => console.log(e));
    },
    updateSelectedQuestion() {
      const _this = this;

      this.$api.questions
        .updateQuestion(this.selectedQuestion.uuid, {
          text: this.stagedQuestionData.text,
          answer: this.stagedQuestionData.answer
        }).then((response) => {
          // Replace the old question with new data
          for (let i = 0; i < _this.currentDocumentData.questions.length; i++) {
            const q = _this.currentDocumentData.questions[i];

            if (q.uuid === _this.selectedQuestion.uuid) {
              _this.currentDocumentData.questions[i] = response;
            }
          }

          // Close the modal
          _this.showEditQuestionModal = false;
          _this.selectedQuestion      = null;
          _this.stagedQuestionData    = {};

          // Show success message
          _this.showSuccessMessage = true;
          _this.successMessage     = 'Question updated!';
        });
    },
    fineTuneSelectedQuestion() {
      const _this             = this;
      this.fineTuningQuestion = true;

      this.$api.ai.fineTuneQuestion(this.selectedQuestion.uuid, {
        answer: this.stagedQuestionData.answer,
        ft_method: this.stagedQuestionData.ft_method
      }).then(() => {
        _this.selectedQuestion.answer    = _this.stagedQuestionData.answer;
        _this.selectedQuestion.ft_method = _this.stagedQuestionData.ft_method;

        // Close the modal
        _this.showEditQuestionModal = false;
        _this.selectedQuestion      = null;
        _this.stagedQuestionData    = {};

        // Show success message
        _this.showSuccessMessage = true;
        _this.successMessage     = 'Question was fine-tuned!';
      }).finally(() => {
        _this.fineTuningQuestion = false;
      });
    },

    createFolder() {
      const _this = this;
      const name  = this.newFolderName;

      this.$api.documents
        .createFolder(this.currentFolder.uuid, name)
        .then((folder) => {
          _this.currentFolder.children.push(folder);

          // Set the parent node for the newly created folder
          folder.parent = _this.currentFolder;

          // Closing the modal & resetting the form
          _this.createFolderModal = false;
          _this.newFolderName     = null;
        });
    },
    finalizeDocumentCreation(document) {
      this.currentFolder.children.push(document);

      // Set the parent node for the newly created document
      document.parent = this.currentFolder;

      // Cache the urlContentSelector if type is url
      if (this.addNewDocumentType === 'url'
        && this.addNewUrlSelector
        && !this.cachedUrlSelectors.includes(this.addNewUrlSelector)
      ) {
        this.cachedUrlSelectors.push(this.addNewUrlSelector);
      }

      // Closing the modal & resetting the form
      this.createDocumentModal = false;
      this.newDocumentName     = null;
      this.addNewFile          = null;
      this.addNewUrl           = null;
      this.addNewUrlSelector   = null;
      this.addNewDocumentType  = null;

      // Show the newly created document
      this.openDocument(document);
    },
    createDocument() {
      const _this = this;

      if (this.addNewDocumentType === 'upload') {
        this.$api.documents
          .createFromFile(this.currentFolder.uuid, this.addNewFile[0].path)
          .then(document => _this.finalizeDocumentCreation(document));
      } else if (this.addNewDocumentType === 'url') {
        this.$api.documents
          .createFromUrl(this.currentFolder.uuid, this.addNewUrl, this.addNewUrlSelector)
          .then(document => _this.finalizeDocumentCreation(document));
      } else {
        this.$api.documents
          .createDocument(this.currentFolder.uuid, this.newDocumentName)
          .then(document => _this.finalizeDocumentCreation(document));
      }
    },
    saveDocumentChanges(silent = false, cb = null) {
      const _this = this;

      this.$api.documents
        .updateDocument(this.currentDocument.uuid, {
          name: this.currentDocumentData.name,
          text: this.currentDocumentData.text,
          origin: Object.assign({}, this.currentDocumentData.origin)
        })
        .then((document) => {
          _this.currentDocument = Object.assign(_this.currentDocument, document);

          if (silent !== true) {
            _this.successMessage     = 'Changes saved!';
            _this.showSuccessMessage = true;
          }

          if (cb) {
            cb.call(_this);
          }
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
    analyzeContent() {
      if (this.hasAssociatedQuestions) {
        this.analyzeDocumentContentModal = true;
      } else {
        this.analyzeDocumentContent();
      }
    },
    analyzeDocumentContent() {
      // Save existing document first in case any changes to the content happened
      this.saveDocumentChanges(true, function() {
        const _this           = this;
        this.analyzingContent = true;

        this.$api.ai
          .analyzeDocumentContent(this.currentDocument.uuid, this.mergeNewQuestions)
          .then((document) => {
            _this.currentDocumentData = document;
          }).finally(() => {
            _this.analyzingContent            = false;
            _this.analyzeDocumentContentModal = false;
          });
        });
    },
    handleSearchBlur() {
      if (this.search === '' || this.search === null) {
          this.showSearchInput = false;
      }
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
.v-breadcrumbs {
  font-size: 0.9rem;
}
</style>